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

import { TypedEventEmitter } from '@/util/typed-event-emitter';
import { TagValue } from '@/plc/types';
import { Subscription, ScanEvents, DEFAULT_SCAN_RATE } from './types';

/** Function signature for reading tags — injected from PLC class. */
export type ReadFunction = (tags: string[]) => Promise<TagValue[]>;

export interface ScannerOptions {
  rate?: number;
}

export class Scanner extends TypedEventEmitter<ScanEvents> {
  private subscriptions = new Map<string, Subscription>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private _scanning = false;
  private readonly rate: number;

  constructor(
    private readonly readFn: ReadFunction,
    options?: ScannerOptions,
  ) {
    super();
    this.rate = options?.rate ?? DEFAULT_SCAN_RATE;
  }

  get scanning(): boolean {
    return this._scanning;
  }

  /** Subscribe a tag. Picked up on the next scan tick if already running. */
  subscribe(tagName: string): void {
    const key = tagName.toLowerCase();
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, { tagName, lastValue: undefined });
    }
  }

  /** Remove a tag. Picked up on the next scan tick if already running. */
  unsubscribe(tagName: string): void {
    this.subscriptions.delete(tagName.toLowerCase());
  }

  /** Start the scan loop. No-op if already scanning. */
  scan(): void {
    if (this._scanning) return;
    this._scanning = true;
    this.emit('scanStarted');
    this.scheduleTick();
  }

  /** Stop scanning. Subscriptions are preserved for resume via scan(). */
  pause(): void {
    if (!this._scanning) return;
    this._scanning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emit('scanStopped');
  }

  private scheduleTick(): void {
    this.timer = setTimeout(() => this.tick(), 0);
  }

  private async tick(): Promise<void> {
    if (!this._scanning) return;

    const subs = [...this.subscriptions.values()];
    if (subs.length > 0) {
      try {
        await this.readAndDetectChanges(subs);
      } catch (err) {
        this.emit('scanError', err as Error);
      }
    }

    if (this._scanning) {
      this.timer = setTimeout(() => this.tick(), this.rate);
    }
  }

  private async readAndDetectChanges(subs: Subscription[]): Promise<void> {
    const tagNames = subs.map((s) => s.tagName);
    const values = await this.readFn(tagNames);

    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      // Skip if unsubscribed mid-read
      if (!this.subscriptions.has(sub.tagName.toLowerCase())) continue;
      const newValue = values[i];

      if (sub.lastValue === undefined) {
        sub.lastValue = newValue;
        this.emit('tagInitialized', sub.tagName, newValue);
      } else if (!valuesEqual(sub.lastValue, newValue)) {
        const prev = sub.lastValue;
        sub.lastValue = newValue;
        this.emit('tagChanged', sub.tagName, newValue, prev);
      }
    }
  }
}

/** Equality check — reference, Buffer content, or deep object comparison. */
function valuesEqual(a: TagValue, b: TagValue): boolean {
  if (a === b) return true;
  if (Buffer.isBuffer(a) && Buffer.isBuffer(b)) return a.equals(b);
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
