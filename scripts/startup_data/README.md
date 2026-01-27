# Startup Data Files

This folder contains JSON startup data files for initializing the Izara Telemedicine database.

## Files

| File | Description |
|------|-------------|
| [users.json](users.json) | Test users (patients, doctors, admins) with credentials |
| [phr_records.json](phr_records.json) | Personal Health Records for patients |
| [doctors.json](doctors.json) | Doctor profiles and consultant information |
| [medical_content.json](medical_content.json) | Medical articles and clinical resources |

## Test Credentials

### Patients
| Email | Password | Name |
|-------|----------|------|
| demo.test@gmail.com | P@ssw0rd | Demo Test Patient |
| Somchai.Mankong@gmail.com | P@ssw0rd | นายสมชาย มั่นคง |
| Anan.Khayanrian@gmail.com | P@ssw0rd | นายอนันต์ ขยันเรียน |

### Doctors
| Email | Password | Name |
|-------|----------|------|
| doctor.test@izara.com | IzaraDoctor@2024 | นายแพทย์ ทดสอบ ระบบ |

### Admins
| Email | Password | Name |
|-------|----------|------|
| admin.test@izara.com | IzaraAdmin@2024 | ผู้ดูแลระบบ ทดสอบ |

## Usage

### Using Seeder Script
```bash
# Seed PostgreSQL Docker database
node scripts/seeder.cjs

# Verify data only
node scripts/seeder.cjs --verify
```

### Using SQL Directly
```bash
# PostgreSQL Docker container
docker exec -i izara-postgres psql -U postgres -d izara_phase1 < scripts/database/izara-database.sql

# PowerShell
Get-Content scripts\database\izara-database.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1
```

> **Note:** NO Cloud SQL is used. PostgreSQL runs as a Docker service alongside the portals.

## Encoding

All files use UTF-8 encoding to properly support Thai language (ภาษาไทย).
