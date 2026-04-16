"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeMismatchError = exports.TagNotFoundError = exports.ForwardOpenError = exports.SessionError = exports.EIPError = exports.TimeoutError = exports.ConnectionError = exports.CIPError = exports.LogicalType = exports.EPathBuilder = exports.CIPService = exports.STRING_STRUCT_HANDLE = exports.CIPDataType = exports.buildGenericCIPMessage = exports.buildWriteWallClockRequest = exports.parseWallClockResponse = exports.buildReadWallClockRequest = exports.parseControllerProps = exports.buildGetControllerPropsRequest = exports.parseListIdentityResponse = exports.buildListIdentityRequest = exports.TagRegistry = exports.Scanner = exports.MockTransport = exports.TCPTransport = exports.PLC = void 0;
// Core API
var plc_1 = require("./plc");
Object.defineProperty(exports, "PLC", { enumerable: true, get: function () { return plc_1.PLC; } });
// Transport
var transport_1 = require("./transport");
Object.defineProperty(exports, "TCPTransport", { enumerable: true, get: function () { return transport_1.TCPTransport; } });
Object.defineProperty(exports, "MockTransport", { enumerable: true, get: function () { return transport_1.MockTransport; } });
// Scanner
var scanner_1 = require("./scanner");
Object.defineProperty(exports, "Scanner", { enumerable: true, get: function () { return scanner_1.Scanner; } });
// Registry
var registry_1 = require("./registry");
Object.defineProperty(exports, "TagRegistry", { enumerable: true, get: function () { return registry_1.TagRegistry; } });
// Discovery
var discovery_1 = require("./discovery");
Object.defineProperty(exports, "buildListIdentityRequest", { enumerable: true, get: function () { return discovery_1.buildListIdentityRequest; } });
Object.defineProperty(exports, "parseListIdentityResponse", { enumerable: true, get: function () { return discovery_1.parseListIdentityResponse; } });
Object.defineProperty(exports, "buildGetControllerPropsRequest", { enumerable: true, get: function () { return discovery_1.buildGetControllerPropsRequest; } });
Object.defineProperty(exports, "parseControllerProps", { enumerable: true, get: function () { return discovery_1.parseControllerProps; } });
Object.defineProperty(exports, "buildReadWallClockRequest", { enumerable: true, get: function () { return discovery_1.buildReadWallClockRequest; } });
Object.defineProperty(exports, "parseWallClockResponse", { enumerable: true, get: function () { return discovery_1.parseWallClockResponse; } });
Object.defineProperty(exports, "buildWriteWallClockRequest", { enumerable: true, get: function () { return discovery_1.buildWriteWallClockRequest; } });
Object.defineProperty(exports, "buildGenericCIPMessage", { enumerable: true, get: function () { return discovery_1.buildGenericCIPMessage; } });
// CIP (advanced / escape hatch)
var data_types_1 = require("./cip/data-types");
Object.defineProperty(exports, "CIPDataType", { enumerable: true, get: function () { return data_types_1.CIPDataType; } });
Object.defineProperty(exports, "STRING_STRUCT_HANDLE", { enumerable: true, get: function () { return data_types_1.STRING_STRUCT_HANDLE; } });
var services_1 = require("./cip/services");
Object.defineProperty(exports, "CIPService", { enumerable: true, get: function () { return services_1.CIPService; } });
var epath_1 = require("./cip/epath");
Object.defineProperty(exports, "EPathBuilder", { enumerable: true, get: function () { return epath_1.EPathBuilder; } });
Object.defineProperty(exports, "LogicalType", { enumerable: true, get: function () { return epath_1.LogicalType; } });
// Errors
var errors_1 = require("./errors");
Object.defineProperty(exports, "CIPError", { enumerable: true, get: function () { return errors_1.CIPError; } });
Object.defineProperty(exports, "ConnectionError", { enumerable: true, get: function () { return errors_1.ConnectionError; } });
Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function () { return errors_1.TimeoutError; } });
Object.defineProperty(exports, "EIPError", { enumerable: true, get: function () { return errors_1.EIPError; } });
Object.defineProperty(exports, "SessionError", { enumerable: true, get: function () { return errors_1.SessionError; } });
Object.defineProperty(exports, "ForwardOpenError", { enumerable: true, get: function () { return errors_1.ForwardOpenError; } });
Object.defineProperty(exports, "TagNotFoundError", { enumerable: true, get: function () { return errors_1.TagNotFoundError; } });
Object.defineProperty(exports, "TypeMismatchError", { enumerable: true, get: function () { return errors_1.TypeMismatchError; } });
//# sourceMappingURL=index.js.map