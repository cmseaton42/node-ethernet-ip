/**
 * Scanner types — subscription and event definitions.
 */

import { TagValue } from '@/plc/types';
import { Logger } from '@/util/logger';

export interface Subscription {
  tagName: string;
  lastValue: TagValue | undefined;
}

export interface ScannerOptions {
  rate?: number;
  logger?: Logger;
  /** Log scan metrics every N ticks (default 100, 0 to disable) */
  metricsInterval?: number;
}

export type ScanEvents = {
  tagChanged: (tag: string, value: TagValue, prev: TagValue) => void;
  tagInitialized: (tag: string, value: TagValue) => void;
  scanError: (err: Error) => void;
  scanStarted: () => void;
  scanStopped: () => void;
};

/** Default scan rate in milliseconds */
export const DEFAULT_SCAN_RATE = 200;

/** Metrics logging target interval in milliseconds (5 minutes) */
export const METRICS_TARGET_MS = 5 * 60 * 1000;
