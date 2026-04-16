"use strict";
/**
 * Forward Open / Forward Close.
 * Per CIP Vol 1, Section 3-5
 *
 * Forward Open tries Large (4002 bytes) first, falls back to Small (504).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LARGE_CONNECTION_SIZE = exports.SMALL_CONNECTION_SIZE = void 0;
exports.doForwardOpen = doForwardOpen;
exports.doForwardClose = doForwardClose;
const header_1 = require("../encapsulation/header");
const encapsulation_1 = require("../encapsulation/encapsulation");
const ConnectionManager = __importStar(require("../cip/connection-manager"));
const MessageRouter = __importStar(require("../cip/message-router"));
const services_1 = require("../cip/services");
const epath_1 = require("../cip/epath");
const port_1 = require("../cip/epath/segments/port");
const errors_1 = require("../errors");
/** Small Forward Open max connection size */
exports.SMALL_CONNECTION_SIZE = 504;
/** Large Forward Open max connection size */
exports.LARGE_CONNECTION_SIZE = 4002;
/** Backplane port number */
const BACKPLANE_PORT = 1;
/**
 * Attempt Forward Open — Large first, fallback to Small.
 * Returns the negotiated connection size and serial.
 */
async function doForwardOpen(pipeline, sessionId, slot, timeoutMs) {
    const routePath = (0, port_1.buildPortSegment)(BACKPLANE_PORT, slot);
    // Try Large Forward Open first
    try {
        return await sendForwardOpen(pipeline, sessionId, routePath, timeoutMs, services_1.CIPService.LARGE_FORWARD_OPEN, exports.LARGE_CONNECTION_SIZE);
    }
    catch {
        // Fallback to Small Forward Open
        return await sendForwardOpen(pipeline, sessionId, routePath, timeoutMs, services_1.CIPService.FORWARD_OPEN, exports.SMALL_CONNECTION_SIZE);
    }
}
/**
 * Send a single Forward Open request.
 */
async function sendForwardOpen(pipeline, sessionId, routePath, timeoutMs, service, size) {
    const connectionSerial = Math.floor(Math.random() * 0x7fff);
    const connParams = ConnectionManager.encodeConnectionParams(ConnectionManager.Owner.Exclusive, ConnectionManager.ConnectionType.PointToPoint, ConnectionManager.Priority.Low, ConnectionManager.FixedVar.Variable, size);
    // Build Forward Open data (small or large format)
    const isLarge = service === services_1.CIPService.LARGE_FORWARD_OPEN;
    const fwdOpenData = isLarge
        ? ConnectionManager.buildLargeForwardOpenData({ connectionParams: size, connectionSerial })
        : ConnectionManager.buildForwardOpenData({ connectionParams: connParams, connectionSerial });
    // Connection Manager path: Class 0x06, Instance 0x01
    const cmPath = new epath_1.EPathBuilder()
        .logical(epath_1.LogicalType.ClassID, 0x06)
        .logical(epath_1.LogicalType.InstanceID, 0x01)
        .build();
    // Message Router request header
    const mrHeader = MessageRouter.build(service, cmPath, Buffer.alloc(0));
    // Connection path: route to CPU + Message Router object
    const mrPath = new epath_1.EPathBuilder()
        .logical(epath_1.LogicalType.ClassID, 0x02)
        .logical(epath_1.LogicalType.InstanceID, 0x01)
        .build();
    const fullPath = Buffer.concat([routePath, mrPath]);
    // Path size in words + path
    const pathSizeBuf = Buffer.alloc(1);
    pathSizeBuf.writeUInt8(Math.ceil(fullPath.length / 2), 0);
    // Assemble and wrap in SendRRData
    const cipPacket = Buffer.concat([mrHeader, fwdOpenData, pathSizeBuf, fullPath]);
    const eipPacket = (0, encapsulation_1.sendRRData)(sessionId, cipPacket);
    // Send and parse response
    const response = await pipeline.send(eipPacket, timeoutMs);
    const eipParsed = (0, header_1.parseHeader)(response);
    // Extract CIP data from CPF:
    // Interface Handle(4) + Timeout(2) + ItemCount(2) + NullItem(4) + UCMMHeader(4) = offset 16
    const CIP_DATA_OFFSET = 16;
    const cipData = eipParsed.data.subarray(CIP_DATA_OFFSET);
    const mrResponse = MessageRouter.parse(cipData);
    if (mrResponse.generalStatusCode !== 0) {
        throw new errors_1.ForwardOpenError(`Forward Open rejected (status 0x${mrResponse.generalStatusCode.toString(16)})`, mrResponse.generalStatusCode);
    }
    // Forward Open response: O→T Connection ID at offset 0 (UINT32LE)
    const connectionId = mrResponse.data.readUInt32LE(0);
    return { connectionId, connectionSize: size, connectionSerial };
}
/**
 * Send Forward Close (best-effort, won't throw on failure).
 */
async function doForwardClose(pipeline, sessionId, connectionSerial, timeoutMs) {
    const closeData = ConnectionManager.buildForwardCloseData({ connectionSerial });
    const cmPath = new epath_1.EPathBuilder()
        .logical(epath_1.LogicalType.ClassID, 0x06)
        .logical(epath_1.LogicalType.InstanceID, 0x01)
        .build();
    const mrRequest = MessageRouter.build(services_1.CIPService.FORWARD_CLOSE, cmPath, closeData);
    const eipPacket = (0, encapsulation_1.sendRRData)(sessionId, mrRequest);
    // Best-effort — don't throw if PLC doesn't respond
    await pipeline.send(eipPacket, timeoutMs).catch(() => { });
}
//# sourceMappingURL=forward-open.js.map