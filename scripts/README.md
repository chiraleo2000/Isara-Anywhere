# Izara Telemedicine - Scripts & Testing

## 🚀 Quick Start (3 Commands Only!)

```powershell
# 1. Deploy locally
.\scripts\izara-cli.ps1 deploy local

# 2. Run tests
.\tests\e2e\run-tests.ps1 smoke

# 3. Check status
.\scripts\izara-cli.ps1 status
```

---

## 📁 Streamlined Structure (Fewer Files!)

```text
Isara-Anywhere/
├── scripts/
│   ├── izara-cli.ps1           # ⭐ MAIN CLI - Deploy, DB, Health, Cleanup
│   ├── cloud-db-tool.cjs       # ⭐ Database ops (local + cloud)
│   ├── lib/
│   │   └── db-config.cjs       # Shared database config
│   ├── cloud-run/              # Cloud Run Dockerfiles
│   ├── database/               # Schema & migrations
│   ├── output/                 # Generated data & seed files
│   └── deprecated/             # Old scripts (kept for reference)
│
├── tests/
│   ├── e2e/
│   │   ├── run-tests.ps1       # ⭐ MAIN TEST RUNNER
│   │   ├── specs/
│   │   │   └── core-e2e.spec.ts    # ⭐ Core consolidated tests
│   │   ├── lib/test-config.ts  # Shared test config
│   │   └── deprecated/         # Old test runners
│   └── deprecated/             # Old PowerShell tests
```

---

## 🛠️ ONE Command for Everything: izara-cli.ps1

### Deployment

```powershell
.\scripts\izara-cli.ps1 deploy local          # Local Docker
.\scripts\izara-cli.ps1 deploy cloud          # Cloud Run
.\scripts\izara-cli.ps1 deploy local -Fresh   # Fresh install
```

### Database

```powershell
.\scripts\izara-cli.ps1 db -DbAction verify   # Check connection
.\scripts\izara-cli.ps1 db -DbAction seed     # Seed demo data
.\scripts\izara-cli.ps1 db -DbAction fix      # Fix schema issues
.\scripts\izara-cli.ps1 db -DbAction backup   # Create backup
.\scripts\izara-cli.ps1 db -DbAction reset    # Reset (caution!)
```

### Health & Status

```powershell
.\scripts\izara-cli.ps1 health local          # Check local services
.\scripts\izara-cli.ps1 health cloud          # Check cloud services
.\scripts\izara-cli.ps1 status                # Full system status
```

### Cleanup

```powershell
.\scripts\izara-cli.ps1 clean                 # Stop containers
.\scripts\izara-cli.ps1 clean -Full           # Remove everything
```

---

## 🧪 ONE Command for Testing: run-tests.ps1

```powershell
.\tests\e2e\run-tests.ps1 smoke               # Quick test (~2 min)
.\tests\e2e\run-tests.ps1 api                 # API tests (~5 min)
.\tests\e2e\run-tests.ps1 ui                  # UI tests (~10 min)
.\tests\e2e\run-tests.ps1 full                # Full tests (~15 min)
.\tests\e2e\run-tests.ps1 full cloud          # Test cloud
.\tests\e2e\run-tests.ps1 all                 # Everything
```

---

## 🗄️ Database Tool: cloud-db-tool.cjs

```powershell
# Set password first (for cloud)
$env:DB_PASSWORD = "your_password"

# Operations
node scripts/cloud-db-tool.cjs --target local --seed     # Seed local
node scripts/cloud-db-tool.cjs --target cloud --fix      # Fix cloud
node scripts/cloud-db-tool.cjs --target cloud --all      # All operations
node scripts/cloud-db-tool.cjs --verify                  # Verify data
node scripts/cloud-db-tool.cjs --help                    # Show help
```

---

## 📋 Test Suites

| Suite | Duration | Description |
| ------- | ---------- | ------------- |
| `smoke` | ~2 min | Quick health checks |
| `api` | ~5 min | API endpoint verification |
| `ui` | ~10 min | UI with visible browser |
| `full` | ~15 min | Comprehensive workflows |
| `all` | ~20 min | Everything |

---

## 🔧 Environment Variables

```powershell
# Database (required for cloud)
$env:DB_PASSWORD = "your_password"

# Test environment
$env:TEST_ENV = "local"  # or "cloud"
```

---

## 📍 Service URLs

| Service | Local | Cloud |
| --------- | ------- | ------- |
| Patient Portal | <http://localhost:3005> | <https://izara-patient-portal-*.run.app> |
| Doctor Portal | <http://localhost:3010> | <https://izara-doctor-portal-*.run.app> |
| PostgreSQL | localhost:5433 | 34.143.228.135:5432 |

---

## 🔄 Common Workflows

### Development

```powershell
.\scripts\izara-cli.ps1 deploy local    # Start
.\tests\e2e\run-tests.ps1 smoke         # Quick test
# ... make changes ...
.\tests\e2e\run-tests.ps1 full          # Full test before commit
```

### Deployment Workflow

```powershell
.\tests\e2e\run-tests.ps1 full          # Test locally first
.\scripts\izara-cli.ps1 deploy cloud    # Deploy to cloud
.\tests\e2e\run-tests.ps1 full cloud    # Verify cloud
```

### Cleanup Workflow

```powershell
.\scripts\izara-cli.ps1 clean -Full     # Full cleanup
```

---

## 📝 Version: 2.0.0 (February 4, 2026)

**Key Files (Only 4 to Remember!):**

1. `scripts/izara-cli.ps1` - Deployment & management
2. `scripts/cloud-db-tool.cjs` - Database operations
3. `tests/e2e/run-tests.ps1` - Test runner
4. `tests/e2e/specs/core-e2e.spec.ts` - Core tests

```powershell
# Deploy locally
.\scripts\deploy.ps1 -Target local

# Deploy to cloud
.\scripts\deploy.ps1 -Target cloud
```

## Version History

- **v1.0.0** (2026-01-29): Reorganized scripts, added shared config, security improvements
