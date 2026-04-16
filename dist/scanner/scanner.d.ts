/**
 * Scanner — single scan group with subscribe/unsubscribe while running.
 *
 * All subscribed tags are read in one batch per cycle. The scan rate
 * is set at construction. Tags can be added/removed while scanning —
 * changes are picked up on the next tick.
 *
 * Usage:
 *   const scanner = new Scanner(readFn, { rate: 200 });
 *   scanner.subscribe('Temperature');
 *   scanner.on('tagChanged', (tag, value, prev) => { ... });
 *   scanner.scan();
 */
import { TypedEventEmitter } from '../util/typed-event-emitter';
import { TagValue } from '../plc/types';
import { ScannerOptions, ScanEvents } from './types';
/** Function signature for reading tags — injected from PLC class. */
export type ReadFunction = (tags: string[]) => Promise<TagValue[]>;
export declare class Scanner extends TypedEventEmitter<ScanEvents> {
    private readonly readFn;
    private subscriptions;
    private timer;
    private _scanning;
    private readonly rate;
    private readonly metrics;
    constructor(readFn: ReadFunction, options?: ScannerOptions);
    get scanning(): boolean;
    /** Subscribe a tag. Picked up on the next scan tick if already running. */
    subscribe(tagName: string): void;
    /** Remove a tag. Picked up on the next scan tick if already running. */
    unsubscribe(tagName: string): void;
    /** Start the scan loop. No-op if already scanning. */
    scan(): void;
    /** Stop scanning. Subscriptions are preserved for resume via scan(). */
    pause(): void;
    private scheduleTick;
    private tick;
    private readAndDetectChanges;
}
//# sourceMappingURL=scanner.d.ts.map