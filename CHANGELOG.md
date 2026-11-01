# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2026-11-01

### Added

- `plc.registry.serialize()` / `hydrate()` — save and reload the tag registry between sessions, with the `TagRegistrySerialized` type

### Changed

- Tag discovery and template fetches during discovery use the `timeout` connect option (or the 10s default); template fetches previously always used 10s
- If the connection drops during discovery, the call now fails rather than continuing with unconnected messaging

### Fixed

- Tag discovery now uses connected messaging when a connection is open — long discoveries no longer let the Class 3 connection expire, which caused the next connected message to fail
- npm script globs on Windows

## [2.0.0] — 2026-04-16

Full TypeScript rewrite of `ethernet-ip`. See the [Migration Guide](README.md#migration-from-v1) for upgrading from v1.

### Added

- Full TypeScript rewrite with strict types
- Connected messaging via Forward Open (Large/Small fallback)
- Auto-reconnect with exponential backoff
- Batch read/write via Multi-Service Packets
- UDT/struct support — automatic decode/encode with template retrieval
- `discover()` for full tag list with program-scoped tags, dimension sizes, and struct templates
- `getTemplate()` / `getShape()` for struct introspection
- `plc.getDimensions(tag)` — returns array dimension sizes from registry
- STRING read/write support (built-in Rockwell STRING, handle `0x0FCE`)
- TCP connect timeout to prevent hangs on unreachable hosts
- Tag subscriptions with change detection via `Scanner`
- Scanner metrics logging — periodic debug log with avg/min/max tick interval
- `scanStarted` / `scanStopped` events on Scanner
- Typed error hierarchy with human-readable CIP status codes
- `MockTransport` for hardware-free testing
- `EPathBuilder` for fluent CIP path construction
- Generic CIP messaging escape hatch
- Controller props, wall clock, ListIdentity discovery
- `TypedEventEmitter` for type-safe events
- `plc.isConnected` getter
- `Logger` interface with noop default — inject via `new PLC({ logger })`
- `StateMachine`, `SerializedPromiseQueue`, `TickTimer` utilities
- Operation queue on PLC — all `read`/`write`/`discover` serialized to prevent interleaving
- 383+ unit tests

### Changed

- `new Controller()` → `new PLC()`
- `PLC.connect(ip, slot)` → `plc.connect(ip, { slot })`
- `new Tag('name'); PLC.readTag(tag)` → `plc.read('name')`
- `tag.value = 42; PLC.writeTag(tag)` → `plc.write('name', 42)`
- Composition with `ITransport` instead of extending `net.Socket`
- `sendUnitData` uses ConnectionBased (0xA1) per CIP spec, not SequencedAddrItem (0x8002)
- `ConnectionState` is now a string union type, not an enum
- Scanner simplified to single scan group — one rate for all tags, set at construction
- Scanner `subscribe()` / `unsubscribe()` work while scanning (picked up on next tick)
- Deterministic decode path — single `decodeValue()` using wire handle for all struct/string decode decisions
- Exact response size calculation using template `structureSize` for optimal batch packing
