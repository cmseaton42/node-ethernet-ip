/**
 * PLC — top-level user API composing all layers.
 */
import { TypedEventEmitter } from '../util/typed-event-emitter';
import { Logger } from '../util/logger';
import { ITransport } from '../transport/interfaces';
import { TagRegistry, Template } from '../registry/tag-registry';
import { DiscoveredTag } from '../registry/discovery';
import { PLCEvents, PLCConnectOptions, TagValue } from './types';
import { StructShape } from './struct-helpers';
export type { MemberShape, StructShape } from './struct-helpers';
export declare class PLC extends TypedEventEmitter<PLCEvents> {
    private session;
    private _registry;
    private log;
    private _discoveredOnce;
    private _queue;
    constructor(options?: {
        transport?: ITransport;
        logger?: Logger;
    });
    get registry(): TagRegistry;
    get isConnected(): boolean;
    connect(ip: string, options?: PLCConnectOptions): Promise<void>;
    disconnect(): Promise<void>;
    /** Discover all user tags and fetch UDT templates. Returns the discovered tag list. */
    discover(): Promise<DiscoveredTag[]>;
    getTemplate(tagName: string): Template | undefined;
    getShape(tagName: string): StructShape | undefined;
    /** Get array dimension sizes, e.g. [10, 5] for a 10×5 2D array. Empty if not an array. */
    getDimensions(tagName: string): number[];
    read(tag: string): Promise<TagValue>;
    read(tags: string[]): Promise<TagValue[]>;
    write(tag: string, value: TagValue): Promise<void>;
    write(tags: Record<string, TagValue>): Promise<void>;
    private readSingle;
    private readBatch;
    private writeSingle;
    private writeBatch;
    /**
     * Decode a read response value. Uses the wire handle (from parseReadResponse)
     * to make all decode decisions. One function, one path, deterministic.
     */
    private decodeValue;
    private populateRegistry;
    private sendCIP;
    /** Calculate the exact response payload size for a tag read. */
    private responseSize;
}
//# sourceMappingURL=plc.d.ts.map