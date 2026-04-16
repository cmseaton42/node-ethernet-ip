import { LogicalType } from './segments/logical';
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
export declare class EPathBuilder {
    private segments;
    /** Add a Logical segment (ClassID, InstanceID, AttributeID, etc.) */
    logical(type: LogicalType, address: number): this;
    /** Add a Port segment for routing */
    port(port: number, link: number | string): this;
    /** Add an ANSI Extended Symbolic segment (tag name) */
    symbolic(name: string): this;
    /** Add an Element segment (array index) */
    element(index: number): this;
    /** Concatenate all segments into a single EPATH buffer */
    build(): Buffer;
}
//# sourceMappingURL=epath-builder.d.ts.map