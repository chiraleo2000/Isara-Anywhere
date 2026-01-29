# Deprecated Scripts

These scripts have been consolidated into `cloud-db-tool.cjs` for easier maintenance.

## Migration Guide

| Old Script | New Command |
|------------|-------------|
| `check-cloud-password.cjs` | `node scripts/cloud-db-tool.cjs --verify` |
| `create-cloud-profiles.cjs` | `node scripts/cloud-db-tool.cjs --fix-profiles` |
| `fix-cloud-all.cjs` | `node scripts/cloud-db-tool.cjs --all` |
| `fix-cloud-schema.cjs` | `node scripts/cloud-db-tool.cjs --fix-schema` |
| `fix-hospital-name.cjs` | `node scripts/cloud-db-tool.cjs --fix-profiles` |
| `update-cloud-passwords.cjs` | `node scripts/cloud-db-tool.cjs --fix-passwords` |

## Environment Variables Required

Set these before running the consolidated tool:

```powershell
$env:DB_PASSWORD = "your_password"
```

## Why Consolidated?

1. **Easier Maintenance**: Single file to update
2. **Consistent Configuration**: Shared db-config.cjs module
3. **Better Error Handling**: Unified error messages
4. **Reduced Duplication**: DRY principle

## Removal

These deprecated files can be safely deleted. They are kept only for reference.
