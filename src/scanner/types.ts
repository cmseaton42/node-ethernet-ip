/**
 * Scanner types — subscription and scan group definitions.
 */

import { TagValue } from '@/plc/types';

export interface Subscription {
  tagName: string;
  rate: number;
  lastValue: TagValue | undefined;
}

export type ScanEvents = {
  tagChanged: (tag: string, value: TagValue, prev: TagValue) => void;
  tagInitialized: (tag: string, value: TagValue) => void;
  scanError: (err: Error) => void;
};

/** Default scan rate in milliseconds */
export const DEFAULT_SCAN_RATE = 200;
