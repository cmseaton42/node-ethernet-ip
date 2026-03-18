/**
 * CPF response utilities — extract CIP data from CPF items.
 */

import { CPFItem, CPFItemType } from '@/encapsulation/common-packet-format';

/** Sequence count prefix in connected transport packets */
const SEQUENCE_COUNT_SIZE = 2;

/**
 * Extract CIP response data from CPF items.
 * Finds the data-carrying item (ConnectedTransportPacket or UCMM)
 * and strips the sequence count prefix for connected packets.
 */
export function extractCIPData(items: CPFItem[]): Buffer {
  const dataItem = items.find(
    (i) =>
      i.typeId === CPFItemType.ConnectedTransportPacket || i.typeId === CPFItemType.UCMM,
  );
  if (!dataItem) throw new Error('No CIP data item in response');

  return dataItem.typeId === CPFItemType.ConnectedTransportPacket
    ? dataItem.data.subarray(SEQUENCE_COUNT_SIZE)
    : dataItem.data;
}
