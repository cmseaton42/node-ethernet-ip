import { LogicalType, buildLogicalSegment } from './segments/logical';
import { buildPortSegment } from './segments/port';
import { buildSymbolicSegment } from './segments/symbolic';
import { buildElementSegment } from './segments/element';

/**
 * Fluent builder for CIP EPATH construction.
 *
 * Usage:
 *   // CIP object addressing:
 *   new EPathBuilder()
 *     .logical(LogicalType.ClassID, 0x06)
 *     .logical(LogicalType.InstanceID, 0x01)
 *     .build();
 *
 *   // Tag path: "MyTag[3].Member"
 *   new EPathBuilder()
 *     .symbolic('MyTag')
 *     .element(3)
 *     .symbolic('Member')
 *     .build();
 *
 *   // Routing: backplane port 1, slot 2
 *   new EPathBuilder()
 *     .port(1, 2)
 *     .build();
 */
export class EPathBuilder {
  private segments: Buffer[] = [];

  /** Add a Logical segment (ClassID, InstanceID, AttributeID, etc.) */
  logical(type: LogicalType, address: number): this {
    this.segments.push(buildLogicalSegment(type, address));
    return this;
  }

  /** Add a Port segment for routing */
  port(port: number, link: number | string): this {
    this.segments.push(buildPortSegment(port, link));
    return this;
  }

  /** Add an ANSI Extended Symbolic segment (tag name) */
  symbolic(name: string): this {
    this.segments.push(buildSymbolicSegment(name));
    return this;
  }

  /** Add an Element segment (array index) */
  element(index: number): this {
    this.segments.push(buildElementSegment(index));
    return this;
  }

  /** Concatenate all segments into a single EPATH buffer */
  build(): Buffer {
    return Buffer.concat(this.segments);
  }
}
