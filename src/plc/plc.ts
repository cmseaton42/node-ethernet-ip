/**
 * PLC — top-level user API composing all layers.
 */

import { TypedEventEmitter } from '@/util/typed-event-emitter';
import { Logger, noopLogger } from '@/util/logger';
import { ITransport } from '@/transport/interfaces';
import { TCPTransport } from '@/transport/tcp-transport';
import { SessionManager } from '@/session/session-manager';
import { TagRegistry, Template } from '@/registry/tag-registry';
import { discoverUserTags, DiscoveredTag } from '@/registry/discovery';
import { sendRRData, sendUnitData } from '@/encapsulation/encapsulation';
import { parseHeader } from '@/encapsulation/header';
import { parseCPF } from '@/encapsulation/common-packet-format';
import { extractCIPData } from './cpf-utils';
import * as MessageRouter from '@/cip/message-router';
import { buildBatches, BatchRequest, parseMultiServiceResponse } from '@/cip/batch-builder';
import { TYPE_SIZES, CIPDataType, getCodec, STRING_STRUCT_HANDLE } from '@/cip/data-types';
import { CIPService } from '@/cip/services';
import { CIPError } from '@/errors';
import { PLCEvents, PLCConnectOptions, TagValue, resolveConnectOptions } from './types';
import { buildReadRequest, parseReadResponse } from './read';
import { buildWriteRequest, buildBitWriteRequest } from './write';
import { extractBitIndex } from './tag-path';
import { fetchTemplate } from '@/registry/template-fetcher';
import { StructShape, buildShape, encodeIfStruct, templateLookup } from './struct-helpers';
import { decodeStruct } from './struct-codec';

import { SerializedPromiseQueue } from '@/util/serialized-promise-queue';

export type { MemberShape, StructShape } from './struct-helpers';

/** InterfaceHandle(4) + Timeout(2) prefix before CPF data */
const CPF_PREFIX_SIZE = 6;

/** Atomic type param is 2 bytes, struct type param is 4 bytes (0xA0 0x02 + handle) */
const ATOMIC_TYPE_PARAM_SIZE = 2;
const STRUCT_TYPE_PARAM_SIZE = 4;

/** Max usable packet size for unconnected messaging (UCMM) */
const UCMM_MAX_SIZE = 508;

export class PLC extends TypedEventEmitter<PLCEvents> {
  private session: SessionManager;
  private _registry = new TagRegistry();
  private log: Logger;
  private _discoveredOnce = false;
  private _queue = new SerializedPromiseQueue();

  constructor(options?: { transport?: ITransport; logger?: Logger }) {
    super();
    this.log = options?.logger ?? noopLogger;
    const transport = options?.transport ?? new TCPTransport();
    this.session = new SessionManager(transport, this.log);

    this.session.on('connected', () => this.emit('connected'));
    this.session.on('disconnected', () => this.emit('disconnected'));
    this.session.on('reconnecting', (n) => this.emit('reconnecting', n));
    this.session.on('error', (e) => this.emit('error', e));
  }

  get registry(): TagRegistry {
    return this._registry;
  }

  get isConnected(): boolean {
    return this.session.state === 'connected';
  }

  async connect(ip: string, options?: PLCConnectOptions): Promise<void> {
    const opts = resolveConnectOptions(options);
    await this.session.connect(ip, {
      slot: opts.slot,
      timeoutMs: opts.timeoutMs,
      connected: opts.connected,
      reconnect: opts.reconnect,
    });

    if (opts.discover) {
      await this.populateRegistry(opts.timeoutMs);
    }
  }

  async disconnect(): Promise<void> {
    await this.session.disconnect();
  }

  /** Discover all user tags and fetch UDT templates. Returns the discovered tag list. */
  async discover(): Promise<DiscoveredTag[]> {
    return this._queue.enqueue(() => this.populateRegistry(10000));
  }

  getTemplate(tagName: string): Template | undefined {
    const entry = this._registry.lookup(tagName);
    if (!entry?.isStruct) return undefined;
    return (
      this._registry.lookupTemplateByHandle(entry.type) ?? this._registry.lookupTemplate(entry.type)
    );
  }

  getShape(tagName: string): StructShape | undefined {
    const tmpl = this.getTemplate(tagName);
    if (!tmpl) return undefined;
    return buildShape(tmpl, this._registry);
  }

  async read(tag: string): Promise<TagValue>;
  async read(tags: string[]): Promise<TagValue[]>;
  async read(tagOrTags: string | string[]): Promise<TagValue | TagValue[]> {
    return this._queue.enqueue(() => {
      if (Array.isArray(tagOrTags)) {
        if (tagOrTags.length === 1) return this.readSingle(tagOrTags[0]).then((v) => [v]);
        return this.readBatch(tagOrTags);
      }
      return this.readSingle(tagOrTags);
    });
  }

  async write(tag: string, value: TagValue): Promise<void>;
  async write(tags: Record<string, TagValue>): Promise<void>;
  async write(tagOrTags: string | Record<string, TagValue>, value?: TagValue): Promise<void> {
    return this._queue.enqueue(() => {
      if (typeof tagOrTags === 'string') return this.writeSingle(tagOrTags, value!);
      const entries = Object.entries(tagOrTags);
      if (entries.length === 1) return this.writeSingle(entries[0][0], entries[0][1]);
      return this.writeBatch(tagOrTags);
    });
  }

  // ── Read ──────────────────────────────────────────────────

  private async readSingle(tagName: string): Promise<TagValue> {
    this.log.debug('Read single', { tag: tagName });
    const cipRequest = buildReadRequest(tagName);
    const cipResponse = await this.sendCIP(cipRequest);
    const mr = MessageRouter.parse(cipResponse);

    if (mr.generalStatusCode !== 0) {
      throw new CIPError(mr.generalStatusCode, mr.extendedStatus);
    }

    const { type, isStruct, value } = parseReadResponse(mr.data, tagName);

    // Lazy registration: cache type under the base tag name
    const baseName =
      extractBitIndex(tagName) !== null ? tagName.substring(0, tagName.lastIndexOf('.')) : tagName;
    if (!this._registry.has(baseName)) {
      this._registry.register(baseName, {
        type,
        size: TYPE_SIZES.get(type as CIPDataType) ?? 0,
        isStruct,
        arrayDims: 0,
      });
    }

    // Lazy template fetch: on first struct encounter, discover all templates once
    if (isStruct && type !== STRING_STRUCT_HANDLE && !this._discoveredOnce) {
      if (!this._registry.lookupTemplateByHandle(type)) {
        await this.populateRegistry(10000);
      }
    }

    return this.decodeValue(type, isStruct, value);
  }

  private async readBatch(tags: string[]): Promise<TagValue[]> {
    // Discover unknown types first (sequential)
    for (const tag of tags) {
      if (!this._registry.has(tag)) await this.readSingle(tag);
    }

    const requests: BatchRequest[] = tags.map((tag) => {
      const entry = this._registry.lookup(tag)!;
      return {
        serviceData: buildReadRequest(tag),
        estimatedResponseSize: this.responseSize(entry),
      };
    });

    const maxSize = this.session.connectionSize || UCMM_MAX_SIZE;
    const batches = buildBatches(requests, maxSize);
    this.log.debug('Batch read', { tags: tags.length, batches: batches.length, maxSize });

    const results: TagValue[] = [];
    let tagIdx = 0;

    for (const batch of batches) {
      const cipResponse = await this.sendCIP(batch.data);
      const mr = MessageRouter.parse(cipResponse);

      if (mr.generalStatusCode !== 0) {
        throw new CIPError(mr.generalStatusCode, mr.extendedStatus);
      }

      const isMultiService = (mr.service & 0x7f) === CIPService.MULTIPLE_SERVICE_PACKET;

      if (isMultiService) {
        const replies = parseMultiServiceResponse(mr.data);
        for (const reply of replies) {
          if (reply.generalStatusCode !== 0) {
            throw new CIPError(reply.generalStatusCode, reply.extendedStatus);
          }
          const { type, isStruct, value } = parseReadResponse(reply.data, tags[tagIdx]);
          results.push(this.decodeValue(type, isStruct, value));
          tagIdx++;
        }
      } else {
        const { type, isStruct, value } = parseReadResponse(mr.data, tags[tagIdx]);
        results.push(this.decodeValue(type, isStruct, value));
        tagIdx++;
      }
    }

    return results;
  }

  // ── Write ─────────────────────────────────────────────────

  private async writeSingle(tagName: string, value: TagValue): Promise<void> {
    if (!this._registry.has(tagName)) await this.readSingle(tagName);

    const entry = this._registry.lookup(tagName)!;
    const bitIndex = extractBitIndex(tagName);
    const encoded = encodeIfStruct(value, entry, this._registry);

    const cipRequest =
      bitIndex !== null
        ? buildBitWriteRequest(
            tagName,
            value as boolean,
            this._registry.lookupParent(tagName)!.type,
          )
        : buildWriteRequest(
            tagName,
            encoded,
            entry.type,
            1,
            entry.isStruct ? entry.type : undefined,
          );

    const cipResponse = await this.sendCIP(cipRequest);
    const mr = MessageRouter.parse(cipResponse);
    if (mr.generalStatusCode !== 0) {
      throw new CIPError(mr.generalStatusCode, mr.extendedStatus);
    }
  }

  private async writeBatch(tags: Record<string, TagValue>): Promise<void> {
    const entries = Object.entries(tags);
    for (const [tag] of entries) {
      if (!this._registry.has(tag)) await this.readSingle(tag);
    }

    const requests: BatchRequest[] = entries.map(([tag, val]) => {
      const entry = this._registry.lookup(tag)!;
      const bitIndex = extractBitIndex(tag);
      const encoded = encodeIfStruct(val, entry, this._registry);
      const serviceData =
        bitIndex !== null
          ? buildBitWriteRequest(tag, val as boolean, entry.type)
          : buildWriteRequest(tag, encoded, entry.type, 1, entry.isStruct ? entry.type : undefined);
      return { serviceData, estimatedResponseSize: 4 };
    });

    const maxSize = this.session.connectionSize || UCMM_MAX_SIZE;
    const batches = buildBatches(requests, maxSize);

    for (const batch of batches) {
      const cipResponse = await this.sendCIP(batch.data);
      const mr = MessageRouter.parse(cipResponse);
      if (mr.generalStatusCode !== 0) {
        throw new CIPError(mr.generalStatusCode, mr.extendedStatus);
      }
      if (batch.requests.length > 1) {
        const replies = parseMultiServiceResponse(mr.data);
        for (const reply of replies) {
          if (reply.generalStatusCode !== 0) {
            throw new CIPError(reply.generalStatusCode, reply.extendedStatus);
          }
        }
      }
    }
  }

  // ── Decode (single path for all reads) ────────────────────

  /**
   * Decode a read response value. Uses the wire handle (from parseReadResponse)
   * to make all decode decisions. One function, one path, deterministic.
   */
  private decodeValue(wireType: number, isStruct: boolean, value: TagValue): TagValue {
    if (!isStruct || !Buffer.isBuffer(value)) return value;

    // Built-in STRING: decode directly, no template needed
    if (wireType === STRING_STRUCT_HANDLE) {
      return getCodec(CIPDataType.STRING).decode(value, 0) as string;
    }

    // UDT: decode if template is cached
    const tmpl = this._registry.lookupTemplateByHandle(wireType);
    if (tmpl) {
      return decodeStruct(tmpl, value, templateLookup(this._registry));
    }

    // No template — return raw Buffer
    return value;
  }

  // ── Discovery & Templates ─────────────────────────────────

  private async populateRegistry(timeoutMs: number): Promise<DiscoveredTag[]> {
    if (!this.session.pipeline) return [];
    const tags = await discoverUserTags(this.session.pipeline, this.session.sessionId, timeoutMs);
    const structInstanceIds = new Set<number>();
    for (const tag of tags) {
      const fullName = tag.program ? `Program:${tag.program}.${tag.name}` : tag.name;
      this._registry.register(fullName, {
        type: tag.type.code,
        size: TYPE_SIZES.get(tag.type.code as CIPDataType) ?? 0,
        isStruct: tag.type.isStruct,
        arrayDims: tag.type.arrayDims,
      });
      if (tag.type.isStruct) structInstanceIds.add(tag.type.code);
    }

    for (const id of structInstanceIds) {
      if (!this._registry.lookupTemplate(id)) {
        await fetchTemplate((req) => this.sendCIP(req), this._registry, id);
      }
    }

    for (const tag of tags) {
      if (tag.type.isStruct) {
        tag.template = this._registry.lookupTemplate(tag.type.code);
      }
    }

    this._discoveredOnce = true;
    this.log.info('Discover completed', { tagCount: tags.length });
    return tags;
  }

  // ── Transport ─────────────────────────────────────────────

  private async sendCIP(cipRequest: Buffer): Promise<Buffer> {
    if (!this.session.pipeline) throw new Error('Not connected');

    const isConnected = this.session.connectionId !== 0;
    const eipPacket = isConnected
      ? sendUnitData(
          this.session.sessionId,
          cipRequest,
          this.session.connectionId,
          this.session.nextSequence(),
        )
      : sendRRData(this.session.sessionId, cipRequest);

    this.log.debug('sendCIP', { reqSize: eipPacket.length, connected: isConnected });
    const response = await this.session.pipeline.send(eipPacket);
    this.log.debug('recvCIP', {
      respSize: response.length,
      respHdr: response.subarray(0, 8).toString('hex'),
    });
    const parsed = parseHeader(response);

    const cpf = parseCPF(parsed.data.subarray(CPF_PREFIX_SIZE));
    return extractCIPData(cpf);
  }

  /** Calculate the exact response payload size for a tag read. */
  private responseSize(entry: { type: number; isStruct: boolean }): number {
    if (entry.isStruct) {
      const tmpl =
        this._registry.lookupTemplateByHandle(entry.type) ??
        this._registry.lookupTemplate(entry.type);
      if (!tmpl) {
        throw new Error(`Missing template for struct type 0x${entry.type.toString(16)}`);
      }
      return STRUCT_TYPE_PARAM_SIZE + tmpl.attributes.structureSize;
    }
    const dataSize = TYPE_SIZES.get(entry.type as CIPDataType);
    if (dataSize === undefined) {
      throw new Error(`Unknown atomic type 0x${entry.type.toString(16)}`);
    }
    return ATOMIC_TYPE_PARAM_SIZE + dataSize;
  }
}
