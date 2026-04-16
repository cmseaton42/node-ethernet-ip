"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EPathBuilder = void 0;
const logical_1 = require("./segments/logical");
const port_1 = require("./segments/port");
const symbolic_1 = require("./segments/symbolic");
const element_1 = require("./segments/element");
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
class EPathBuilder {
    constructor() {
        this.segments = [];
    }
    /** Add a Logical segment (ClassID, InstanceID, AttributeID, etc.) */
    logical(type, address) {
        this.segments.push((0, logical_1.buildLogicalSegment)(type, address));
        return this;
    }
    /** Add a Port segment for routing */
    port(port, link) {
        this.segments.push((0, port_1.buildPortSegment)(port, link));
        return this;
    }
    /** Add an ANSI Extended Symbolic segment (tag name) */
    symbolic(name) {
        this.segments.push((0, symbolic_1.buildSymbolicSegment)(name));
        return this;
    }
    /** Add an Element segment (array index) */
    element(index) {
        this.segments.push((0, element_1.buildElementSegment)(index));
        return this;
    }
    /** Concatenate all segments into a single EPATH buffer */
    build() {
        return Buffer.concat(this.segments);
    }
}
exports.EPathBuilder = EPathBuilder;
//# sourceMappingURL=epath-builder.js.map