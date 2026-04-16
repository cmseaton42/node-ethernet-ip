# Contributing

Great to have you here! Here are a few ways you can help make this project better.

## Team

- **Canaan Seaton** — _Owner_ — [GitHub](https://github.com/cmseaton42) — [Website](http://www.canaanseaton.com/)
- **Patrick McDonagh** — _Collaborator_ — [GitHub](https://github.com/patrickjmcd)
- **Jeremy Henson** — _Collaborator_ — [GitHub](https://github.com/jhenson29)

New contributors welcome!

## Getting Started

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Run the full check: `npm run check`

### Development Commands

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
npm run lint          # ESLint
npm run format        # Prettier (auto-fix)
npm run format:check  # Prettier (check only)
npm run build         # TypeScript compile
npm run check         # All checks: lint + format + tsc + tests
```

### Project Structure

```
src/
├── transport/       # Layer 1: ITransport, TCPTransport, MockTransport
├── encapsulation/   # Layer 2: EIP header, CPF, commands
├── cip/             # Layer 3: EPATH, data types, message router, batch builder
├── pipeline/        # Layer 4: Serial request queue, timeout
├── session/         # Layer 5: Connection lifecycle, Forward Open, reconnect
├── registry/        # Tag type cache and discovery
├── scanner/         # Tag subscriptions and scan loop
├── plc/             # Layer 6: PLC class (user-facing API)
├── discovery/       # Device discovery, controller props, wall clock
├── errors/          # Typed error hierarchy
└── util/            # TypedEventEmitter and helpers

tests/               # Mirrors src/ structure
```

### Code Style

- **TypeScript strict mode** — no `any` unless absolutely necessary
- **No magic numbers** — use named constants
- **Comment buffer assemblies** — document byte layouts
- **Small focused files** — prefer splitting over large files
- **Absolute imports** — use `@/` prefix (maps to `src/`)
- **Prettier** — runs automatically, config in `.prettierrc`
- **ESLint** — flat config in `eslint.config.mjs`

### Testing

- Tests live in `tests/` mirroring the `src/` structure
- Use `MockTransport` for all protocol-level tests — no real PLC needed
- Aim for high coverage on pure functions (codecs, builders, parsers)
- Use `jest.useFakeTimers()` for timeout and reconnect tests

### Commit Messages

- Imperative mood, under 50 characters
- Examples: `Add CIP EPATH segments and builder`, `Fix Forward Open fallback`

## How to Contribute

### Reporting Issues

1. Check if the issue is already tracked
2. Use the [Issue Template](./ISSUE_TEMPLATE.md)
3. Include: Node version, package version, controller type/firmware, steps to reproduce

### Feature Requests

1. Open an issue with `[FEATURE REQUEST]` in the title
2. Describe the use case and expected behavior

### Contributing Code

1. Open or find a related issue
2. Fork the repo and create a branch
3. Write your code with tests
4. Run `npm run check` — all checks must pass
5. Submit a PR using the [Pull Request Template](./PULL_REQUEST_TEMPLATE.md)

### Learning Resources

- [CIP Specification Manuals](./manuals/) — EtherNet/IP and CIP protocol references
- [Architecture Design Doc](./ethernet-ip-v2-docs/architecture.md) — v2 layered architecture
- [API Design Doc](./ethernet-ip-v2-docs/api-design.md) — Public API surface

## License

MIT — see [LICENSE](./LICENSE)
