/**
 * PLC — top-level user API composing all layers.
 */

import { TypedEventEmitter } from '@/util/typed-event-emitter';
import { ITransport } from '@/transport/interfaces';
import { TCPTransport } from '@/transport/tcp-transport';
import { SessionManager } from '@/session/session-manager';
import { TagRegistry } from '@/registry/tag-registry';
import { discoverUserTags } from '@/registry/discovery';
import { sendRRData } from '@/encapsulation/encapsulation';
import { parseHeader } from '@/encapsulation/header';
import * as MessageRouter from '@/cip/message-router';
import { TYPE_SIZES, CIPDataType } from '@/cip/data-types';
import { CIPError } from '@/errors';
import { PLCEvents, PLCConnectOptions, TagValue, resolveConnectOptions } from './types';
import { buildReadRequest, parseReadResponse } from './read';
import { buildWriteRequest, buildBitWriteRequest } from './write';
import { extractBitIndex } from './tag-path';

/** Offset to CIP data within SendRRData response */
const CIP_DATA_OFFSET = 16;

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
      const results: TagValue[] = [];
      for (const tag of tagOrTags) {
        results.push(await this.readSingle(tag));
      }
      return results;
    }
    return this.readSingle(tagOrTags);
  }

  async write(tag: string, value: TagValue): Promise<void>;
  async write(tags: [string, TagValue][]): Promise<void>;
  async write(tagOrTags: string | [string, TagValue][], value?: TagValue): Promise<void> {
    if (Array.isArray(tagOrTags)) {
      for (const [tag, val] of tagOrTags) {
        await this.writeSingle(tag, val);
      }
      return;
    }
    await this.writeSingle(tagOrTags, value!);
  }

  private async readSingle(tagName: string): Promise<TagValue> {
    const cipRequest = buildReadRequest(tagName);
    const cipResponse = await this.sendCIP(cipRequest);
    const mr = MessageRouter.parse(cipResponse);
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
    const eipPacket = sendRRData(this.session.sessionId, cipRequest);
    const response = await this.session.pipeline.send(eipPacket);
    const parsed = parseHeader(response);
    return parsed.data.subarray(CIP_DATA_OFFSET);
  }
}
