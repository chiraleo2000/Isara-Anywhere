# Isara Patient Portal — Documentation

**Port:** 3005 · **Standalone PG:** 5434 · **Page specs:** 16

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
