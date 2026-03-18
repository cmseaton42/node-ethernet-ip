/**
 * Scanner — manages tag subscriptions and periodic scan loops.
 *
 * Tags with the same scan rate are grouped and read together in one batch.
 * When a tag's value changes, the scanner emits a change event.
 *
 * Usage:
 *   const scanner = new Scanner(readFn);
 *   scanner.subscribe('Temperature', { rate: 100 });
 *   scanner.on('tagChanged', (tag, value, prev) => { ... });
 *   scanner.scan();
 */

import { TypedEventEmitter } from '@/util/typed-event-emitter';
import { TagValue } from '@/plc/types';
import { Subscription, ScanEvents, DEFAULT_SCAN_RATE } from './types';

/** Function signature for reading tags — injected from PLC class. */
export type ReadFunction = (tags: string[]) => Promise<TagValue[]>;

export class Scanner extends TypedEventEmitter<ScanEvents> {
  private subscriptions = new Map<string, Subscription>();
  private activeTimers = new Map<number, ReturnType<typeof setTimeout>>();
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

  /** Start the scan loop. Tags are grouped by rate so each rate gets its own timer. */
  scan(): void {
    if (this._scanning) return;
    this._scanning = true;

    const groups = this.groupSubscriptionsByRate();

    for (const [rate, subs] of groups) {
      this.startScanLoop(rate, subs);
    }
  }

  /** Stop all scan loops and clear timers. */
  pauseScan(): void {
    this._scanning = false;
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  /**
   * Group all current subscriptions by their scan rate.
   * Example: 3 tags at 100ms and 2 tags at 5000ms → Map { 100 → [...], 5000 → [...] }
   */
  private groupSubscriptionsByRate(): Map<number, Subscription[]> {
    const groups = new Map<number, Subscription[]>();
    for (const sub of this.subscriptions.values()) {
      const group = groups.get(sub.rate) ?? [];
      group.push(sub);
      groups.set(sub.rate, group);
    }
    return groups;
  }

  /**
   * Start a recurring scan loop for a group of tags at the given rate.
   *
   * Uses recursive setTimeout (not setInterval) so the next read only
   * schedules after the current one completes — prevents overlapping
   * reads if the PLC is slow to respond.
   */
  private startScanLoop(rate: number, subs: Subscription[]): void {
    const runOneTick = async () => {
      if (!this._scanning) return;

      try {
        await this.readAndDetectChanges(subs);
      } catch (err) {
        this.emit('scanError', err as Error);
      }

      if (this._scanning) {
        this.activeTimers.set(rate, setTimeout(runOneTick, rate));
      }
    };

    // Fire the first tick immediately (0ms delay)
    this.activeTimers.set(rate, setTimeout(runOneTick, 0));
  }

  /**
   * Read all tags in a group and emit events for any changes.
   *
   * - First read of a tag → emits 'tagInitialized'
   * - Subsequent reads where value differs → emits 'tagChanged'
   * - Same value as last read → no event
   */
  private async readAndDetectChanges(subs: Subscription[]): Promise<void> {
    // Filter to only currently subscribed tags (handles mid-scan unsubscribe)
    const activeSubs = subs.filter((s) => this.subscriptions.has(s.tagName.toLowerCase()));
    if (activeSubs.length === 0) return;

    const tagNames = activeSubs.map((s) => s.tagName);
    const values = await this.readFn(tagNames);

    for (let i = 0; i < activeSubs.length; i++) {
      const sub = activeSubs[i];
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

/** Simple equality check — reference equality with Buffer content comparison. */
function valuesEqual(a: TagValue, b: TagValue): boolean {
  if (a === b) return true;
  if (Buffer.isBuffer(a) && Buffer.isBuffer(b)) return a.equals(b);
  return false;
}
