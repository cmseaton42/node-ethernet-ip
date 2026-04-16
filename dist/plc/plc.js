"use strict";
/**
 * PLC — top-level user API composing all layers.
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
exports.PLC = void 0;
const typed_event_emitter_1 = require("../util/typed-event-emitter");
const logger_1 = require("../util/logger");
const tcp_transport_1 = require("../transport/tcp-transport");
const session_manager_1 = require("../session/session-manager");
const tag_registry_1 = require("../registry/tag-registry");
const discovery_1 = require("../registry/discovery");
const encapsulation_1 = require("../encapsulation/encapsulation");
const header_1 = require("../encapsulation/header");
const common_packet_format_1 = require("../encapsulation/common-packet-format");
const cpf_utils_1 = require("./cpf-utils");
const MessageRouter = __importStar(require("../cip/message-router"));
const batch_builder_1 = require("../cip/batch-builder");
const data_types_1 = require("../cip/data-types");
const services_1 = require("../cip/services");
const errors_1 = require("../errors");
const types_1 = require("./types");
const read_1 = require("./read");
const write_1 = require("./write");
const tag_path_1 = require("./tag-path");
const template_fetcher_1 = require("../registry/template-fetcher");
const struct_helpers_1 = require("./struct-helpers");
const struct_codec_1 = require("./struct-codec");
const serialized_promise_queue_1 = require("../util/serialized-promise-queue");
/** InterfaceHandle(4) + Timeout(2) prefix before CPF data */
const CPF_PREFIX_SIZE = 6;
/** Atomic type param is 2 bytes, struct type param is 4 bytes (0xA0 0x02 + handle) */
const ATOMIC_TYPE_PARAM_SIZE = 2;
const STRUCT_TYPE_PARAM_SIZE = 4;
/** Max usable packet size for unconnected messaging (UCMM) */
const UCMM_MAX_SIZE = 508;
class PLC extends typed_event_emitter_1.TypedEventEmitter {
    constructor(options) {
        super();
        this._registry = new tag_registry_1.TagRegistry();
        this._discoveredOnce = false;
        this._queue = new serialized_promise_queue_1.SerializedPromiseQueue();
        this.log = options?.logger ?? logger_1.noopLogger;
        const transport = options?.transport ?? new tcp_transport_1.TCPTransport();
        this.session = new session_manager_1.SessionManager(transport, this.log);
        this.session.on('connected', () => this.emit('connected'));
        this.session.on('disconnected', () => this.emit('disconnected'));
        this.session.on('reconnecting', (n) => this.emit('reconnecting', n));
        this.session.on('error', (e) => this.emit('error', e));
    }
    get registry() {
        return this._registry;
    }
    get isConnected() {
        return this.session.state === 'connected';
    }
    async connect(ip, options) {
        const opts = (0, types_1.resolveConnectOptions)(options);
        await this.session.connect(ip, {
            slot: opts.slot,
            timeoutMs: opts.timeoutMs,
            connected: opts.connected,
            reconnect: opts.reconnect,
        });
        if (opts.discover) {
            await this.populateRegistry(opts.timeoutMs);
        }
    }
    async disconnect() {
        await this.session.disconnect();
    }
    /** Discover all user tags and fetch UDT templates. Returns the discovered tag list. */
    async discover() {
        return this._queue.enqueue(() => this.populateRegistry(10000));
    }
    getTemplate(tagName) {
        const entry = this._registry.lookup(tagName);
        if (!entry?.isStruct)
            return undefined;
        return (this._registry.lookupTemplateByHandle(entry.type) ?? this._registry.lookupTemplate(entry.type));
    }
    getShape(tagName) {
        const tmpl = this.getTemplate(tagName);
        if (!tmpl)
            return undefined;
        return (0, struct_helpers_1.buildShape)(tmpl, this._registry);
    }
    /** Get array dimension sizes, e.g. [10, 5] for a 10×5 2D array. Empty if not an array. */
    getDimensions(tagName) {
        return this._registry.lookup(tagName)?.dimSizes ?? [];
    }
    async read(tagOrTags) {
        return this._queue.enqueue(() => {
            if (Array.isArray(tagOrTags)) {
                if (tagOrTags.length === 1)
                    return this.readSingle(tagOrTags[0]).then((v) => [v]);
                return this.readBatch(tagOrTags);
            }
            return this.readSingle(tagOrTags);
        });
    }
    async write(tagOrTags, value) {
        return this._queue.enqueue(() => {
            if (typeof tagOrTags === 'string')
                return this.writeSingle(tagOrTags, value);
            const entries = Object.entries(tagOrTags);
            if (entries.length === 1)
                return this.writeSingle(entries[0][0], entries[0][1]);
            return this.writeBatch(tagOrTags);
        });
    }
    // ── Read ──────────────────────────────────────────────────
    async readSingle(tagName) {
        this.log.debug('Read single', { tag: tagName });
        const cipRequest = (0, read_1.buildReadRequest)(tagName);
        const cipResponse = await this.sendCIP(cipRequest);
        const mr = MessageRouter.parse(cipResponse);
        if (mr.generalStatusCode !== 0) {
            throw new errors_1.CIPError(mr.generalStatusCode, mr.extendedStatus);
        }
        const { type, isStruct, value } = (0, read_1.parseReadResponse)(mr.data, tagName);
        // Lazy registration: cache type under the base tag name
        const baseName = (0, tag_path_1.extractBitIndex)(tagName) !== null ? tagName.substring(0, tagName.lastIndexOf('.')) : tagName;
        if (!this._registry.has(baseName)) {
            this._registry.register(baseName, {
                type,
                size: data_types_1.TYPE_SIZES.get(type) ?? 0,
                isStruct,
                arrayDims: 0,
            });
        }
        // Lazy template fetch: on first struct encounter, discover all templates once
        if (isStruct && type !== data_types_1.STRING_STRUCT_HANDLE && !this._discoveredOnce) {
            if (!this._registry.lookupTemplateByHandle(type)) {
                await this.populateRegistry(10000);
            }
        }
        return this.decodeValue(type, isStruct, value);
    }
    async readBatch(tags) {
        // Discover unknown types first (sequential)
        for (const tag of tags) {
            if (!this._registry.has(tag))
                await this.readSingle(tag);
        }
        const requests = tags.map((tag) => {
            const entry = this._registry.lookup(tag);
            return {
                serviceData: (0, read_1.buildReadRequest)(tag),
                estimatedResponseSize: this.responseSize(entry),
            };
        });
        const isConnected = this.session.connectionId !== 0;
        const maxSize = this.session.connectionSize || UCMM_MAX_SIZE;
        const batches = (0, batch_builder_1.buildBatches)(requests, maxSize, isConnected);
        this.log.debug('Batch read', { tags: tags.length, batches: batches.length, maxSize });
        const results = [];
        let tagIdx = 0;
        for (const batch of batches) {
            const cipResponse = await this.sendCIP(batch.data);
            const mr = MessageRouter.parse(cipResponse);
            if (mr.generalStatusCode !== 0) {
                throw new errors_1.CIPError(mr.generalStatusCode, mr.extendedStatus);
            }
            const isMultiService = (mr.service & 0x7f) === services_1.CIPService.MULTIPLE_SERVICE_PACKET;
            if (isMultiService) {
                const replies = (0, batch_builder_1.parseMultiServiceResponse)(mr.data);
                for (const reply of replies) {
                    if (reply.generalStatusCode !== 0) {
                        throw new errors_1.CIPError(reply.generalStatusCode, reply.extendedStatus);
                    }
                    const { type, isStruct, value } = (0, read_1.parseReadResponse)(reply.data, tags[tagIdx]);
                    results.push(this.decodeValue(type, isStruct, value));
                    tagIdx++;
                }
            }
            else {
                const { type, isStruct, value } = (0, read_1.parseReadResponse)(mr.data, tags[tagIdx]);
                results.push(this.decodeValue(type, isStruct, value));
                tagIdx++;
            }
        }
        return results;
    }
    // ── Write ─────────────────────────────────────────────────
    async writeSingle(tagName, value) {
        if (!this._registry.has(tagName))
            await this.readSingle(tagName);
        const entry = this._registry.lookup(tagName);
        const bitIndex = (0, tag_path_1.extractBitIndex)(tagName);
        const encoded = (0, struct_helpers_1.encodeIfStruct)(value, entry, this._registry);
        const cipRequest = bitIndex !== null
            ? (0, write_1.buildBitWriteRequest)(tagName, value, this._registry.lookupParent(tagName).type)
            : (0, write_1.buildWriteRequest)(tagName, encoded, entry.type, 1, entry.isStruct ? entry.type : undefined);
        const cipResponse = await this.sendCIP(cipRequest);
        const mr = MessageRouter.parse(cipResponse);
        if (mr.generalStatusCode !== 0) {
            throw new errors_1.CIPError(mr.generalStatusCode, mr.extendedStatus);
        }
    }
    async writeBatch(tags) {
        const entries = Object.entries(tags);
        for (const [tag] of entries) {
            if (!this._registry.has(tag))
                await this.readSingle(tag);
        }
        const requests = entries.map(([tag, val]) => {
            const entry = this._registry.lookup(tag);
            const bitIndex = (0, tag_path_1.extractBitIndex)(tag);
            const encoded = (0, struct_helpers_1.encodeIfStruct)(val, entry, this._registry);
            const serviceData = bitIndex !== null
                ? (0, write_1.buildBitWriteRequest)(tag, val, entry.type)
                : (0, write_1.buildWriteRequest)(tag, encoded, entry.type, 1, entry.isStruct ? entry.type : undefined);
            return { serviceData, estimatedResponseSize: 4 };
        });
        const isConnected = this.session.connectionId !== 0;
        const maxSize = this.session.connectionSize || UCMM_MAX_SIZE;
        const batches = (0, batch_builder_1.buildBatches)(requests, maxSize, isConnected);
        for (const batch of batches) {
            const cipResponse = await this.sendCIP(batch.data);
            const mr = MessageRouter.parse(cipResponse);
            if (mr.generalStatusCode !== 0) {
                throw new errors_1.CIPError(mr.generalStatusCode, mr.extendedStatus);
            }
            if (batch.requests.length > 1) {
                const replies = (0, batch_builder_1.parseMultiServiceResponse)(mr.data);
                for (const reply of replies) {
                    if (reply.generalStatusCode !== 0) {
                        throw new errors_1.CIPError(reply.generalStatusCode, reply.extendedStatus);
                    }
                }
            }
        }
    }
    // ── Decode (single path for all reads) ────────────────────
    /**
     * Decode a read response value. Uses the wire handle (from parseReadResponse)
     * to make all decode decisions. One function, one path, deterministic.
     */
    decodeValue(wireType, isStruct, value) {
        if (!isStruct || !Buffer.isBuffer(value))
            return value;
        // Built-in STRING: decode directly, no template needed
        if (wireType === data_types_1.STRING_STRUCT_HANDLE) {
            return (0, data_types_1.getCodec)(data_types_1.CIPDataType.STRING).decode(value, 0);
        }
        // UDT: decode if template is cached
        const tmpl = this._registry.lookupTemplateByHandle(wireType);
        if (tmpl) {
            return (0, struct_codec_1.decodeStruct)(tmpl, value, (0, struct_helpers_1.templateLookup)(this._registry));
        }
        // No template — return raw Buffer
        return value;
    }
    // ── Discovery & Templates ─────────────────────────────────
    async populateRegistry(timeoutMs) {
        if (!this.session.pipeline)
            return [];
        const tags = await (0, discovery_1.discoverUserTags)(this.session.pipeline, this.session.sessionId, timeoutMs);
        const structInstanceIds = new Set();
        for (const tag of tags) {
            const fullName = tag.program ? `Program:${tag.program}.${tag.name}` : tag.name;
            this._registry.register(fullName, {
                type: tag.type.code,
                size: data_types_1.TYPE_SIZES.get(tag.type.code) ?? 0,
                isStruct: tag.type.isStruct,
                arrayDims: tag.type.arrayDims,
                dimSizes: tag.type.dimSizes.length > 0 ? tag.type.dimSizes : undefined,
            });
            if (tag.type.isStruct)
                structInstanceIds.add(tag.type.code);
        }
        for (const id of structInstanceIds) {
            if (!this._registry.lookupTemplate(id)) {
                await (0, template_fetcher_1.fetchTemplate)((req) => this.sendCIP(req), this._registry, id);
            }
        }
        for (const tag of tags) {
            if (tag.type.isStruct) {
                tag.template = this._registry.lookupTemplate(tag.type.code);
            }
        }
        this._discoveredOnce = true;
        this.log.info('Discover completed', { tagCount: tags.length });
        return tags;
    }
    // ── Transport ─────────────────────────────────────────────
    async sendCIP(cipRequest) {
        if (!this.session.pipeline)
            throw new Error('Not connected');
        const isConnected = this.session.connectionId !== 0;
        const eipPacket = isConnected
            ? (0, encapsulation_1.sendUnitData)(this.session.sessionId, cipRequest, this.session.connectionId, this.session.nextSequence())
            : (0, encapsulation_1.sendRRData)(this.session.sessionId, cipRequest);
        this.log.debug('sendCIP', { reqSize: eipPacket.length, connected: isConnected });
        const response = await this.session.pipeline.send(eipPacket);
        this.log.debug('recvCIP', {
            respSize: response.length,
            respHdr: response.subarray(0, 8).toString('hex'),
        });
        const parsed = (0, header_1.parseHeader)(response);
        const cpf = (0, common_packet_format_1.parseCPF)(parsed.data.subarray(CPF_PREFIX_SIZE));
        return (0, cpf_utils_1.extractCIPData)(cpf);
    }
    /** Calculate the exact response payload size for a tag read. */
    responseSize(entry) {
        if (entry.isStruct) {
            const tmpl = this._registry.lookupTemplateByHandle(entry.type) ??
                this._registry.lookupTemplate(entry.type);
            if (!tmpl) {
                throw new Error(`Missing template for struct type 0x${entry.type.toString(16)}`);
            }
            return STRUCT_TYPE_PARAM_SIZE + tmpl.attributes.structureSize;
        }
        const dataSize = data_types_1.TYPE_SIZES.get(entry.type);
        if (dataSize === undefined) {
            throw new Error(`Unknown atomic type 0x${entry.type.toString(16)}`);
        }
        return ATOMIC_TYPE_PARAM_SIZE + dataSize;
    }
}
exports.PLC = PLC;
//# sourceMappingURL=plc.js.map