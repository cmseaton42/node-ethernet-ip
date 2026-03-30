// Core API
export { PLC } from './plc';
export type { TagValue, TagRecord, PLCEvents, PLCConnectOptions } from './plc/types';
export type { StructShape, MemberShape } from './plc/plc';

// Transport
export { ITransport, TCPTransport, MockTransport } from './transport';

// Scanner
export { Scanner } from './scanner';

// Logger
export type { Logger } from './util/logger';

// Registry
export { TagRegistry } from './registry';
export type { TagRegistryEntry, Template, TemplateAttribute, TemplateMember } from './registry';
export type { DiscoveredTag } from './registry';

// Discovery
export {
  buildListIdentityRequest,
  parseListIdentityResponse,
  buildGetControllerPropsRequest,
  parseControllerProps,
  buildReadWallClockRequest,
  parseWallClockResponse,
  buildWriteWallClockRequest,
  buildGenericCIPMessage,
} from './discovery';

// CIP (advanced / escape hatch)
export { CIPDataType, STRING_STRUCT_HANDLE } from './cip/data-types';
export { CIPService } from './cip/services';
export { EPathBuilder, LogicalType } from './cip/epath';

// Errors
export {
  CIPError,
  ConnectionError,
  TimeoutError,
  EIPError,
  SessionError,
  ForwardOpenError,
  TagNotFoundError,
  TypeMismatchError,
} from './errors';
