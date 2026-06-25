# Izara Meeting Server — Documentation

**Port:** 3020 · **Standalone PG:** 5436 · **Page specs:** 4

## Contents

| Doc | Description |
|-----|-------------|
| [pages/](pages/) | UI page specs from `Processes/Pages/` |
| [WORKFLOWS.md](WORKFLOWS.md) | Workflow excerpts & E2E project mapping |
| [FEATURES.md](FEATURES.md) | Feature list |
| [API.md](API.md) | HTTP/WebSocket API overview |
| [DATABASE.md](DATABASE.md) | Table ownership (generated) |
| [TEST_COVERAGE.md](TEST_COVERAGE.md) | Test IDs per workflow |

## Refresh

From platform repo root:

```bash
npm run docs:sync-to-apps
```

See [docs/APP_DOCS_SYNC.md](../../docs/APP_DOCS_SYNC.md).
