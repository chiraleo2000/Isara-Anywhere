# IZARA TELEMEDICINE - Project Initialization Scripts

## Overview

This folder contains scripts for initializing a new Izara Telemedicine project from scratch. These scripts handle:

- Creating GCS bucket structure
- Setting up admin user account
- Seeding initial data
- Testing the initialization process

## ⚠️ SAFETY FIRST

**These scripts include a SAFETY CHECK** that prevents accidental data overwrites:

- **If buckets contain data → Scripts will NOT run**
- **If buckets are empty → Scripts will proceed**

This protects existing production data from being accidentally deleted.

---

## Quick Start

### 1. Copy and Configure Environment

```powershell
# Copy the example environment file
cp .env.example ../../.env

# Edit the .env file with your settings
# IMPORTANT: Update GCP_PROJECT_ID, bucket names, and admin credentials
```

### 2. Run Tests First

```powershell
# Test all components before initializing
node testInitialization.cjs --verbose
```

### 3. Check Bucket Status

```powershell
# See if buckets are empty (safe to initialize)
node checkBucketStatus.cjs

# For JSON output (useful in CI/CD)
node checkBucketStatus.cjs --json
```

### 4. Initialize Project

```powershell
# Initialize with admin account (ONLY if buckets are empty!)
node initializeProject.cjs

# Dry run to see what would be created
node initializeProject.cjs --dry-run
```

### 5. Seed Sample Data (Optional)

```powershell
# Add sample doctors and patients for testing
node seedSampleData.cjs

# Minimal data (1 doctor, 1 patient)
node seedSampleData.cjs --minimal

# Full data set (5 doctors, 10 patients)
node seedSampleData.cjs --full
```

---

## Scripts Reference

### checkBucketStatus.cjs

Checks all GCS buckets to determine if they're empty or contain data.

```powershell
# Check buckets
node checkBucketStatus.cjs

# Verbose output
node checkBucketStatus.cjs --verbose

# JSON output (for automation)
node checkBucketStatus.cjs --json
```

**Exit Codes:**
- `0` - All buckets empty (safe to initialize)
- `1` - One or more buckets have data (NOT safe)
- `2` - Error checking buckets

---

### initializeProject.cjs

Main initialization script. Creates admin account and sets up bucket structure.

```powershell
# Normal initialization (with safety check)
node initializeProject.cjs

# Dry run (no changes made)
node initializeProject.cjs --dry-run

# Skip safety check (DANGEROUS!)
node initializeProject.cjs --skip-check
```

**What it creates:**
- Admin user account in AUTH bucket
- Admin profile in DOCTOR bucket
- Index files for all buckets
- Directory structure placeholders

---

### seedSampleData.cjs

Seeds sample doctors and patients for testing/demo purposes.

```powershell
# Default (2 doctors, 2 patients)
node seedSampleData.cjs

# Minimal (1 doctor, 1 patient)
node seedSampleData.cjs --minimal

# Full data set
node seedSampleData.cjs --full

# Dry run
node seedSampleData.cjs --dry-run
```

---

### clearAllBuckets.cjs

**⚠️ DANGER: Deletes ALL data from ALL buckets!**

```powershell
# Clear with confirmation prompt
node clearAllBuckets.cjs

# Dry run (see what would be deleted)
node clearAllBuckets.cjs --dry-run

# Skip confirmation (for automation - BE CAREFUL!)
node clearAllBuckets.cjs --confirm
```

---

### testInitialization.cjs

Runs all initialization tests without modifying any data.

```powershell
# Run tests
node testInitialization.cjs

# Verbose output
node testInitialization.cjs --verbose
```

**Tests include:**
- Environment file checks
- Dependency verification
- GCS connection test
- Bucket existence verification
- Password hashing verification

---

## Environment Variables

Copy `.env.example` to `../../.env` and configure:

```bash
# GCP Settings
GCP_PROJECT_ID=your-project-id
GCP_REGION=asia-southeast1

# GCS Buckets
GCS_BUCKET_AUTH=your-project-users-credentials
GCS_BUCKET_PATIENT=your-project-patients-data
GCS_BUCKET_DOCTOR=your-project-doctors-data
GCS_BUCKET_APPOINTMENTS=your-project-appointments
GCS_BUCKET_METADATA=your-project-meta-data

# Admin Account
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourSecurePassword@2024
ADMIN_NAME=System Administrator
```

---

## GCS Bucket Structure

After initialization, buckets will have this structure:

```
izara-users-credentials/
├── index.json
├── users/
│   └── ADMIN-001.json
├── sessions/
└── login-history/

izara-doctors-data/
├── index.json
├── doctors/
│   └── ADMIN-001.json
└── schedules/

izara-patients-data/
├── index.json
└── patients/

izara-appointments/
├── index.json
├── appointments/
└── queue/

izara-meta-data/
├── index.json
├── content/
└── config/
```

---

## Default Test Accounts

After initialization + sample data seeding:

| Role    | Email                    | Password          |
|---------|--------------------------|-------------------|
| Admin   | admin@izara.com          | IzaraAdmin@2024   |
| Doctor  | doctor.test@izara.com    | IzaraDoctor@2024  |
| Patient | demo.test@gmail.com      | P@ssw0rd          |

---

## CI/CD Integration

For automated deployments:

```yaml
# Example GitHub Actions workflow
- name: Check Bucket Status
  run: |
    EXIT_CODE=$(node scripts/project-init/checkBucketStatus.cjs --json > /dev/null; echo $?)
    if [ $EXIT_CODE -eq 0 ]; then
      echo "Buckets empty - will initialize"
      node scripts/project-init/initializeProject.cjs
    else
      echo "Buckets have data - skipping initialization"
    fi
```

---

## Troubleshooting

### "Authentication failed" error

1. Check `GOOGLE_APPLICATION_CREDENTIALS` is set
2. Verify service account has Storage Admin role
3. Try using Application Default Credentials:
   ```powershell
   gcloud auth application-default login
   ```

### "Bucket does not exist" error

Create the buckets first:
```powershell
gcloud storage buckets create gs://your-bucket-name --location=asia-southeast1
```

### "Permission denied" error

Ensure service account has these roles:
- Storage Admin
- Storage Object Admin

---

## Version History

- **1.0.0** (December 2025) - Initial release
  - Bucket status checking
  - Project initialization
  - Sample data seeding
  - Bucket clearing utility
  - Initialization tests
