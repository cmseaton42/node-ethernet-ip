/**
 * Scanner — manages tag subscriptions and periodic scan loops.
 *
 * Tags with the same scan rate are grouped and read together.
 * Emits change events when values differ from last read.
 */

import { TypedEventEmitter } from '@/util/typed-event-emitter';
import { TagValue } from '@/plc/types';
import { Subscription, ScanEvents, DEFAULT_SCAN_RATE } from './types';

/** Function signature for reading tags — injected from PLC class */
export type ReadFunction = (tags: string[]) => Promise<TagValue[]>;

export class Scanner extends TypedEventEmitter<ScanEvents> {
  private subscriptions = new Map<string, Subscription>();
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  private _scanning = false;

  constructor(private readonly readFn: ReadFunction) {
    super();
  }

  get scanning(): boolean {
    return this._scanning;
  }

  /** Subscribe a tag for periodic scanning. */
  subscribe(tagName: string, options?: { rate?: number }): void {
    const rate = options?.rate ?? DEFAULT_SCAN_RATE;
    this.subscriptions.set(tagName.toLowerCase(), {
      tagName,
      rate,
      lastValue: undefined,
    });
  }

  /** Remove a tag from scanning. */
  unsubscribe(tagName: string): void {
    this.subscriptions.delete(tagName.toLowerCase());
  }

  /** Start the scan loop. Groups tags by rate. */
  scan(): void {
    if (this._scanning) return;
    this._scanning = true;

    // Group subscriptions by scan rate
    const groups = new Map<number, Subscription[]>();
    for (const sub of this.subscriptions.values()) {
      const group = groups.get(sub.rate) ?? [];
      group.push(sub);
      groups.set(sub.rate, group);
    }

    // Start a timer for each rate group
    for (const [rate, subs] of groups) {
      const tick = async () => {
        if (!this._scanning) return;
        try {
          await this.scanGroup(subs);
        } catch (err) {
          this.emit('scanError', err as Error);
        }
        if (this._scanning) {
          this.timers.set(rate, setTimeout(tick, rate));
        }
      };
      // Start immediately
      this.timers.set(rate, setTimeout(tick, 0));
    }
  }

  /** Stop all scan loops. */
  pauseScan(): void {
    this._scanning = false;
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  /** Read a group of tags and emit change events. */
  private async scanGroup(subs: Subscription[]): Promise<void> {
    const tagNames = subs.map((s) => s.tagName);
    const values = await this.readFn(tagNames);

    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      const newValue = values[i];
      const prev = sub.lastValue;

      if (prev === undefined) {
        // First read — initialize
        sub.lastValue = newValue;
        this.emit('tagInitialized', sub.tagName, newValue);
      } else if (!valuesEqual(prev, newValue)) {
        // Value changed
        sub.lastValue = newValue;
        this.emit('tagChanged', sub.tagName, newValue, prev);
      }
    }
  }
}

/** Simple equality check for tag values. */
function valuesEqual(a: TagValue, b: TagValue): boolean {
  if (a === b) return true;
  if (Buffer.isBuffer(a) && Buffer.isBuffer(b)) return a.equals(b);
  return false;
}
