/**
 * PLC — top-level user API composing all layers.
 */

import { TypedEventEmitter } from '@/util/typed-event-emitter';
import { ITransport } from '@/transport/interfaces';
import { TCPTransport } from '@/transport/tcp-transport';
import { SessionManager } from '@/session/session-manager';
import { TagRegistry } from '@/registry/tag-registry';
import { discoverUserTags } from '@/registry/discovery';
import { sendRRData, sendUnitData } from '@/encapsulation/encapsulation';
import { parseHeader } from '@/encapsulation/header';
import { parseCPF } from '@/encapsulation/common-packet-format';
import { extractCIPData } from './cpf-utils';
import * as MessageRouter from '@/cip/message-router';
import { buildBatches, BatchRequest, parseMultiServiceResponse } from '@/cip/batch-builder';
import { TYPE_SIZES, CIPDataType } from '@/cip/data-types';
import { CIPError } from '@/errors';
import { PLCEvents, PLCConnectOptions, TagValue, resolveConnectOptions } from './types';
import { buildReadRequest, parseReadResponse } from './read';
import { buildWriteRequest, buildBitWriteRequest } from './write';
import { extractBitIndex } from './tag-path';

/** InterfaceHandle(4) + Timeout(2) prefix before CPF data */
const CPF_PREFIX_SIZE = 6;

/** Max usable packet size for unconnected messaging (UCMM) */
const UCMM_MAX_SIZE = 508;

export class PLC extends TypedEventEmitter<PLCEvents> {
  private session: SessionManager;
  private _registry = new TagRegistry();

  constructor(options?: { transport?: ITransport }) {
    super();
    const transport = options?.transport ?? new TCPTransport();
    this.session = new SessionManager(transport);

    this.session.on('connected', () => this.emit('connected'));
    this.session.on('disconnected', () => this.emit('disconnected'));
    this.session.on('reconnecting', (n) => this.emit('reconnecting', n));
    this.session.on('error', (e) => this.emit('error', e));
  }

  get registry(): TagRegistry {
    return this._registry;
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

  async read(tag: string): Promise<TagValue>;
  async read(tags: string[]): Promise<TagValue[]>;
  async read(tagOrTags: string | string[]): Promise<TagValue | TagValue[]> {
    if (Array.isArray(tagOrTags)) {
      if (tagOrTags.length === 1) return [await this.readSingle(tagOrTags[0])];
      return this.readBatch(tagOrTags);
    }
    return this.readSingle(tagOrTags);
  }

  async write(tag: string, value: TagValue): Promise<void>;
  async write(tags: Record<string, TagValue>): Promise<void>;
  async write(tagOrTags: string | Record<string, TagValue>, value?: TagValue): Promise<void> {
    if (typeof tagOrTags === 'string') {
      await this.writeSingle(tagOrTags, value!);
      return;
    }
    const entries = Object.entries(tagOrTags);
    if (entries.length === 1) {
      await this.writeSingle(entries[0][0], entries[0][1]);
      return;
    }
    await this.writeBatch(tagOrTags);
  }

  private async readSingle(tagName: string): Promise<TagValue> {
    const cipRequest = buildReadRequest(tagName);
    const cipResponse = await this.sendCIP(cipRequest);
    const mr = MessageRouter.parse(cipResponse);

    if (mr.generalStatusCode !== 0) {
      throw new CIPError(mr.generalStatusCode, mr.extendedStatus);
    }

    const { type, isStruct, value } = parseReadResponse(mr.data, tagName);

    // Lazy discovery: cache type (struct handle for structs, CIP type code for atomics)
    if (!this._registry.has(tagName)) {
      this._registry.register(tagName, {
        type,
        size: TYPE_SIZES.get(type as CIPDataType) ?? 0,
        isStruct,
        arrayDims: 0,
      });
    }

    return value;
  }

  private async readBatch(tags: string[]): Promise<TagValue[]> {
    // Discover unknown types first (sequential)
    for (const tag of tags) {
      if (!this._registry.has(tag)) await this.readSingle(tag);
    }

    // Build individual read requests with estimated response sizes
    const requests: BatchRequest[] = tags.map((tag) => {
      const entry = this._registry.lookup(tag)!;
      return {
        serviceData: buildReadRequest(tag),
        estimatedResponseSize: (entry.size || 88) + 4, // data + type param + MR header
      };
    });

    const maxSize = this.session.connectionSize || UCMM_MAX_SIZE;
    const batches = buildBatches(requests, maxSize);

    // Send each batch and collect results
    const results: TagValue[] = [];
    let tagIdx = 0;

    for (const batch of batches) {
      const cipResponse = await this.sendCIP(batch.data);
      const mr = MessageRouter.parse(cipResponse);

      if (mr.generalStatusCode !== 0) {
        throw new CIPError(mr.generalStatusCode, mr.extendedStatus);
      }

      if (batch.requests.length === 1) {
        // Single request in batch — already a plain CIP request, no multi-service wrapper
        const { value } = parseReadResponse(mr.data, tags[tagIdx]);
        results.push(value);
        tagIdx++;
      } else {
        const replies = parseMultiServiceResponse(mr.data);

        for (const reply of replies) {
          if (reply.generalStatusCode !== 0) {
            throw new CIPError(reply.generalStatusCode, reply.extendedStatus);
          }
          const { value } = parseReadResponse(reply.data, tags[tagIdx]);
          results.push(value);
          tagIdx++;
        }
      }
    }

    return results;
  }

  private async writeSingle(tagName: string, value: TagValue): Promise<void> {
    // Discover type if unknown
    if (!this._registry.has(tagName)) {
      await this.readSingle(tagName);
    }

    const entry = this._registry.lookup(tagName)!;
    const bitIndex = extractBitIndex(tagName);

    const cipRequest =
      bitIndex !== null
        ? buildBitWriteRequest(tagName, value as boolean, entry.type)
        : buildWriteRequest(tagName, value, entry.type, 1, entry.isStruct ? entry.type : undefined);

    const cipResponse = await this.sendCIP(cipRequest);
    const mr = MessageRouter.parse(cipResponse);

    if (mr.generalStatusCode !== 0) {
      throw new CIPError(mr.generalStatusCode, mr.extendedStatus);
    }
  }

  private async writeBatch(tags: Record<string, TagValue>): Promise<void> {
    const entries = Object.entries(tags);

    // Discover unknown types first
    for (const [tag] of entries) {
      if (!this._registry.has(tag)) await this.readSingle(tag);
    }

    // Build individual write requests
    const requests: BatchRequest[] = entries.map(([tag, val]) => {
      const entry = this._registry.lookup(tag)!;
      const bitIndex = extractBitIndex(tag);
      const serviceData =
        bitIndex !== null
          ? buildBitWriteRequest(tag, val as boolean, entry.type)
          : buildWriteRequest(tag, val, entry.type, 1, entry.isStruct ? entry.type : undefined);
      return { serviceData, estimatedResponseSize: 4 }; // write replies are just status
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

  private async populateRegistry(timeoutMs: number): Promise<void> {
    if (!this.session.pipeline) return;
    const tags = await discoverUserTags(this.session.pipeline, this.session.sessionId, timeoutMs);
    for (const tag of tags) {
      const fullName = tag.program ? `Program:${tag.program}.${tag.name}` : tag.name;
      this._registry.register(fullName, {
        type: tag.type.code,
        size: TYPE_SIZES.get(tag.type.code as CIPDataType) ?? 0,
        isStruct: tag.type.isStruct,
        arrayDims: tag.type.arrayDims,
      });
    }
  }

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

    const response = await this.session.pipeline.send(eipPacket);
    const parsed = parseHeader(response);

    // Parse CPF items to find the CIP data (robust to item ordering/extras)
    const cpf = parseCPF(parsed.data.subarray(CPF_PREFIX_SIZE));
    return extractCIPData(cpf);
  }
}
