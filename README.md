<p align="center"><img width="280" src="https://i.imgur.com/HNxhZox.png" alt="ethernet-ip logo"></p>

<div align="center">
  <p><a href="https://www.npmjs.com/package/ethernet-ip"><img src="https://img.shields.io/npm/v/ethernet-ip.svg?style=flat-square" alt="npm" /></a>
  <a href="https://github.com/cmseaton42/node-ethernet-ip/blob/master/LICENSE"><img src="https://img.shields.io/github/license/cmseaton42/node-ethernet-ip.svg?style=flat-square" alt="license" /></a>
  <a href="https://github.com/cmseaton42/node-ethernet-ip"><img src="https://img.shields.io/github/stars/cmseaton42/node-ethernet-ip.svg?&amp;style=social&amp;logo=github&amp;label=Stars" alt="GitHub stars" /></a></p>
</div>

---

> ## ⚠️ v2.0 — Breaking Changes
>
> **This is a full TypeScript rewrite of `ethernet-ip`.** The API has changed significantly from v1.
> If you are upgrading from v1, see the [Migration Guide](#migration-from-v1) below.
>
> For the v1 documentation, see the [`master` branch](https://github.com/cmseaton42/node-ethernet-ip/tree/master).

---

# Node Ethernet/IP

A feature-complete EtherNet/IP client for Rockwell ControlLogix/CompactLogix PLCs.

- Full TypeScript with strict types
- Dependency injection for testability (MockTransport)
- Connected messaging with Forward Open (Large/Small fallback)
- Complete data type support (all atomics, STRING, SHORT_STRING, STRUCT, arrays)
- Lazy tag type discovery with optional full tag list retrieval
- Auto-reconnect with exponential backoff
- Per-tag scan rates for subscriptions
- Typed error hierarchy with human-readable CIP status codes
- 265+ unit tests

## Prerequisites

[Node.js](https://nodejs.org/en/) >= 16.0.0

## Install

```
npm install ethernet-ip
```

## The API

### Connecting to a PLC

```typescript
import { PLC } from 'ethernet-ip';

const plc = new PLC();

// Connect to a CompactLogix at 192.168.1.1, slot 0
await plc.connect('192.168.1.1');

// Connect to a ControlLogix in slot 2
await plc.connect('192.168.1.1', { slot: 2 });

// Connect with full tag discovery (fetches all tags on connect)
await plc.connect('192.168.1.1', { discover: true });

// Connect with auto-reconnect
await plc.connect('192.168.1.1', { autoReconnect: true });
```

#### Connect Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `slot` | `number` | `0` | Controller slot number (0 for CompactLogix) |
| `discover` | `boolean` | `false` | Fetch full tag list on connect |
| `connected` | `boolean` | `true` | Use connected messaging (Forward Open). Set `false` for unconnected (UCMM) only |
| `timeout` | `number` | `10000` | Connection timeout in milliseconds |
| `autoReconnect` | `boolean \| ReconnectOptions` | `false` | Enable auto-reconnect on disconnect |

#### ReconnectOptions

```typescript
{
  enabled: true,
  initialDelay: 1000,   // First retry after 1 second
  maxDelay: 30000,      // Cap at 30 seconds
  multiplier: 2,        // Double the delay each attempt
  maxRetries: Infinity,  // Retry forever
}
```

### Reading Tags

Read a single tag — the type is discovered automatically on first read and cached:

```typescript
const value = await plc.read('MyDINT');
// value: 42 (number)

const temp = await plc.read('Temperature');
// temp: 72.5 (number)

const running = await plc.read('MotorRunning');
// running: true (boolean)

const name = await plc.read('MachineName');
// name: "Press 1" (string)
```

Read multiple tags — automatically batched into optimal multi-service packets:

```typescript
const [speed, temp, status] = await plc.read(['Speed', 'Temperature', 'Status']);
```

Read a bit of a word:

```typescript
// Read bit 5 of a DINT tag
const bit5 = await plc.read('MyDINT.5');
// bit5: true (boolean)
```

Read program-scoped tags:

```typescript
const value = await plc.read('Program:MainProgram.LocalTag');
```

Read array elements:

```typescript
const element = await plc.read('MyArray[3]');
const multiDim = await plc.read('Matrix[1,2]');
```

Read UDT members:

```typescript
const member = await plc.read('MyUDT.Member1');
```

#### Return Types

| PLC Type | JavaScript Type |
|----------|----------------|
| BOOL | `boolean` |
| SINT, INT, DINT, USINT, UINT, UDINT, REAL, LREAL | `number` |
| LINT, LWORD | `bigint` |
| STRING, SHORT_STRING | `string` |
| STRUCT (unknown template) | `Buffer` |

### Writing Tags

Write a single tag — the type must be known (read the tag first, or use `registry.define()`):

```typescript
await plc.write('SetPoint', 72.5);
await plc.write('EnableMotor', true);
await plc.write('MachineName', 'Press 2');
```

Write multiple tags:

```typescript
await plc.write([
  ['SetPoint', 72.5],
  ['EnableMotor', true],
  ['BatchCount', 0],
]);
```

Write a bit of a word:

```typescript
// Set bit 5 of a DINT tag to true
await plc.write('ControlWord.5', true);
```

### Tag Registry

Types are discovered lazily — the first `read()` of a tag discovers its type and caches it. For optimal first-batch performance, you can pre-register types:

```typescript
import { CIPDataType } from 'ethernet-ip';

plc.registry.define('MyDINT', CIPDataType.DINT, 4);
plc.registry.define('MyString', CIPDataType.STRING, 88);

// Now batch reads can be optimally packed without discovery round trips
const values = await plc.read(['MyDINT', 'MyString']);
```

Or discover all tags on connect:

```typescript
await plc.connect('192.168.1.1', { discover: true });
// plc.registry now has every tag's type information
```

### Scanning / Subscriptions

Monitor tags for changes with configurable per-tag scan rates:

```typescript
import { Scanner } from 'ethernet-ip';

// Create a scanner, injecting the PLC's read function
const scanner = new Scanner(async (tags) => plc.read(tags));

// Subscribe tags with different scan rates
scanner.subscribe('Temperature', { rate: 100 });   // Read every 100ms
scanner.subscribe('BatchCount', { rate: 5000 });    // Read every 5 seconds

// Listen for changes
scanner.on('tagInitialized', (tag, value) => {
  console.log(`${tag} initialized: ${value}`);
});

scanner.on('tagChanged', (tag, value, previousValue) => {
  console.log(`${tag} changed: ${previousValue} → ${value}`);
});

scanner.on('scanError', (err) => {
  console.error('Scan error:', err.message);
});

// Start scanning
scanner.scan();

// Stop scanning
scanner.pauseScan();
```

### Auto-Reconnect

```typescript
await plc.connect('192.168.1.1', {
  autoReconnect: {
    enabled: true,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    maxRetries: Infinity,
  },
});

plc.on('disconnected', () => {
  console.log('Connection lost');
});

plc.on('reconnecting', (attempt) => {
  console.log(`Reconnect attempt ${attempt}...`);
});

plc.on('connected', () => {
  console.log('Connected');
  // Tag registry is preserved — no re-discovery needed
});

plc.on('error', (err) => {
  console.error('Error:', err.message);
});
```

### Generic CIP Messaging

Escape hatch for raw CIP requests — specify service, class, instance, and optionally attribute:

```typescript
import { buildGenericCIPMessage } from 'ethernet-ip';

// Get Attribute Single: service=0x0E, class=0x8B, instance=0x01, attribute=0x05
const request = buildGenericCIPMessage(0x0e, 0x8b, 0x01, 0x05);

// Get Attribute All: service=0x01, class=0x01, instance=0x01
const identityRequest = buildGenericCIPMessage(0x01, 0x01, 0x01);

// Set Attribute Single with data
const data = Buffer.alloc(4);
data.writeUInt32LE(42, 0);
const writeRequest = buildGenericCIPMessage(0x10, 0x01, 0x01, 0x05, data);
```

### Controller Info

```typescript
import {
  buildGetControllerPropsRequest,
  parseControllerProps,
  buildReadWallClockRequest,
  parseWallClockResponse,
  buildWriteWallClockRequest,
} from 'ethernet-ip';
```

### Testing with MockTransport

Every layer can be tested without PLC hardware:

```typescript
import { PLC, MockTransport } from 'ethernet-ip';

const transport = new MockTransport();
const plc = new PLC({ transport });

// transport.sentData contains all packets sent
// transport.injectResponse(buf) simulates PLC responses
// transport.triggerClose() simulates disconnect
```

### EPATH Builder

Fluent builder for CIP EPATH construction:

```typescript
import { EPathBuilder, LogicalType } from 'ethernet-ip';

// CIP object addressing
const path = new EPathBuilder()
  .logical(LogicalType.ClassID, 0x06)
  .logical(LogicalType.InstanceID, 0x01)
  .build();

// Tag path: "MyTag[3].Member"
const tagPath = new EPathBuilder()
  .symbolic('MyTag')
  .element(3)
  .symbolic('Member')
  .build();

// Routing: backplane port 1, slot 2
const routePath = new EPathBuilder()
  .port(1, 2)
  .build();
```

## Architecture

```
Layer 6  User API          PLC · Scanner · Discovery
Layer 5  Session Manager   State machine · Auto-reconnect · Forward Open fallback
Layer 4  Request Pipeline  Serial queue · Timeout · TCP reassembly · Fragmentation
Layer 3  CIP Protocol      EPATH · DataTypeCodec · MessageRouter · BatchBuilder
Layer 2  EIP Encapsulation Headers · CPF · Commands
Layer 1  Transport (DI)    ITransport → TCP / UDP / Mock
```

See [architecture.md](./ethernet-ip-v2-docs/architecture.md) for the full design document.

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
npm run lint          # ESLint
npm run format        # Prettier (write)
npm run format:check  # Prettier (check only)
npm run check         # All checks: lint + format + tsc + tests
```

## Migration from v1

### Breaking Changes

| v1 | v2 |
|----|-----|
| JavaScript | TypeScript (strict mode) |
| `new Controller()` | `new PLC()` |
| `PLC.connect(ip, slot)` | `plc.connect(ip, { slot })` |
| `new Tag('name'); PLC.readTag(tag)` | `plc.read('name')` |
| `tag.value = 42; PLC.writeTag(tag)` | `plc.write('name', 42)` |
| `PLC.subscribe(tag); PLC.scan()` | `scanner.subscribe('name'); scanner.scan()` |
| Extends `net.Socket` | Composition with `ITransport` |
| Event strings (`"Read Tag"`) | Typed events (`'tagChanged'`) |
| `sendUnitData` uses SequencedAddrItem (0x8002) | Uses ConnectionBased (0xA1) per CIP spec |
| No connected messaging | Forward Open with Large/Small fallback |
| Atomic types only | All types including STRING, STRUCT, LINT, LREAL |

### Before (v1)

```javascript
const { Controller, Tag, TagGroup } = require('ethernet-ip');

const PLC = new Controller();
await PLC.connect('192.168.1.1', 0);

const tag = new Tag('MyTag');
await PLC.readTag(tag);
console.log(tag.value);

tag.value = 42;
await PLC.writeTag(tag);
```

### After (v2)

```typescript
import { PLC } from 'ethernet-ip';

const plc = new PLC();
await plc.connect('192.168.1.1');

const value = await plc.read('MyTag');
console.log(value);

await plc.write('MyTag', 42);
```

## Contributors

* **Canaan Seaton** — *Owner* — [GitHub](https://github.com/cmseaton42) — [Website](http://www.canaanseaton.com/)
* **Patrick McDonagh** — *Collaborator* — [GitHub](https://github.com/patrickjmcd)
* **Jeremy Henson** — *Collaborator* — [GitHub](https://github.com/jhenson29)

## Related Projects

* [ST-node-ethernet-ip](https://github.com/SerafinTech/ST-node-ethernet-ip) — Fork with connected messaging, structures, and I/O support
* [pylogix](https://github.com/dmroeder/pylogix) — Python EtherNet/IP client
* [Node-RED CIP](https://github.com/netsmarttech/node-red-contrib-cip-ethernet-ip) — Node-RED integration

Wanna *become* a contributor? [Here's how!](https://github.com/cmseaton42/node-ethernet-ip/blob/master/CONTRIBUTING.md)

## License

This project is licensed under the MIT License — see the [LICENSE](https://github.com/cmseaton42/node-ethernet-ip/blob/master/LICENSE) file for details.
