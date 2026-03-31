# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0-alpha.1] — 2026-03-30

### Fixed

- `registry.lookup('status.0')` now returns BOOL instead of the parent DINT type
- `readSingle` registers the base tag name, not the bit address
- `disconnected` event now fires on ECONNRESET (not just `error`)
- `connect()` cleans up previous session state — no more stale Forward Open conflicts
- `autoReconnect` timer cancelled on successful `connect()` — no more spurious reconnect attempts
- `disconnect()` while reconnecting no longer goes through invalid `disconnecting` state
- `getShape()` / `getTemplate()` return `undefined` for non-struct tags (no crash)
- Batch read response parsing uses service code, not batch size — fixes unconnected single-service batch returning raw Buffer for STRING array elements
- Scanner struct equality — `tagChanged` no longer fires on every tick for struct tags with identical values
- Forward Open connection timeout increased from 256ms to ~30.7s (RPI 60ms × multiplier 512) — eliminates spurious drops under normal operation
- Scanner first tick fires at configured rate instead of 0ms — prevents race where events emit before listeners are attached

### Added

- `StateMachine` utility with transition validation and wildcard support
- `SerializedPromiseQueue` utility for serializing async operations
- `plc.isConnected` getter (reads from session state machine)
- `Logger` interface with noop default — inject via `new PLC({ logger })`
- Logging at key lifecycle points: connect, disconnect, session register, Forward Open, errors, reconnect, state transitions, discover
- `scanStarted` / `scanStopped` events on Scanner
- `discover()` now attaches `template` to struct tags in results
- `discover()` now returns `dimSizes` for array tags (e.g. `[10, 5]` for a 10×5 2D array) via Symbol Object attribute 8
- `plc.getDimensions(tag)` — returns array dimension sizes from registry, `[]` for scalars
- Exported types: `ConnectionState`, `ScannerOptions`, `ScanEvents`, `Logger`
- Operation queue on PLC — all `read`/`write`/`discover` serialized to prevent interleaving

### Changed

- `ConnectionState` is now a string union type, not an enum
- `SessionManager` uses `StateMachine` for state management with enforced transitions
- Scanner simplified to single scan group — one rate for all tags, set at construction
- Scanner `subscribe()` / `unsubscribe()` work while scanning (picked up on next tick)
- `pauseScan()` renamed to `pause()`
- `pause()` is idempotent (no event if not already scanning)
- Struct helpers extracted from `plc.ts` into `plc/struct-helpers.ts`
- Deterministic decode path — single `decodeValue()` using wire handle for all struct/string decode decisions
- Exact response size calculation using template `structureSize` for optimal batch packing
- `SerializedPromiseQueue` rewritten with async/await for clarity

## [2.0.0-alpha.0] — 2026-03-18

### Added

- Full TypeScript rewrite with strict types
- Connected messaging via Forward Open (Large/Small fallback)
- Auto-reconnect with exponential backoff
- Batch read/write via Multi-Service Packets
- UDT/struct support — automatic decode/encode with template retrieval
- `discover()` for full tag list with program-scoped tags
- `getTemplate()` / `getShape()` for struct introspection
- STRING read/write support (built-in Rockwell STRING, handle `0x0FCE`)
- TCP connect timeout to prevent hangs on unreachable hosts
- Tag subscriptions with change detection via `Scanner`
- Typed error hierarchy with human-readable CIP status codes
- `MockTransport` for hardware-free testing
- `EPathBuilder` for fluent CIP path construction
- Generic CIP messaging escape hatch
- Controller props, wall clock, ListIdentity discovery
- `TypedEventEmitter` for type-safe events
- 325+ unit tests at 99%+ coverage

### Changed

- `new Controller()` → `new PLC()`
- `PLC.connect(ip, slot)` → `plc.connect(ip, { slot })`
- `new Tag('name'); PLC.readTag(tag)` → `plc.read('name')`
- `tag.value = 42; PLC.writeTag(tag)` → `plc.write('name', 42)`
- Composition with `ITransport` instead of extending `net.Socket`
- `sendUnitData` uses ConnectionBased (0xA1) per CIP spec, not SequencedAddrItem (0x8002)
