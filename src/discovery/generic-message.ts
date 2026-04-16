/**
 * Generic CIP message — escape hatch for power users.
 * Builds a CIP request from service/class/instance/attribute.
 */

import * as MessageRouter from '@/cip/message-router';
import { EPathBuilder, LogicalType } from '@/cip/epath';

export function buildGenericCIPMessage(
  service: number,
  classId: number,
  instance: number,
  attribute?: number,
  data?: Buffer,
): Buffer {
  const builder = new EPathBuilder()
    .logical(LogicalType.ClassID, classId)
    .logical(LogicalType.InstanceID, instance);

  if (attribute !== undefined) {
    builder.logical(LogicalType.AttributeID, attribute);
  }

  return MessageRouter.build(service, builder.build(), data ?? Buffer.alloc(0));
}
