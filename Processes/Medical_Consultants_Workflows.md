# Medical Consultants Workflows

**Version:** 1.6.0
**Last Updated:** March 31, 2026
**Status:** ✅ PostgreSQL Implementation + Full DB Schema

---

## Overview

The Medical Consultants page allows doctors to find and manage specialist contacts for patient referrals. Admin users have full CRUD access while regular doctors can view and rate consultants.

## User Roles & Permissions

### Admin Users

- **CREATE**: Add new consultants with full profile details

- **READ**: View all consultants and their reviews

- **UPDATE**: Edit consultant information, toggle availability

- **DELETE**: Remove consultants from the system

- **VIEW NOTES**: See internal admin notes

### Doctor Users

- **READ**: View published consultant profiles

- **RATE**: Submit ratings and reviews for consultants

- **CONTACT**: Email or call consultants directly

## Data Model

### Consultant Entity

```typescript
interface Consultant {
  id: string;                    // Unique identifier (CONS-xxx)
  name: string;                  // Full name
  specialty: string;             // Medical specialty
  hospital: string;              // Hospital/Institution
  phone: string;                 // Contact phone
  email: string;                 // Contact email
  photo: string;                 // Profile photo URL
  available: boolean;            // Availability status
  languages: string[];           // Languages spoken
  experience: number;            // Years of experience
  rating: number;                // Average rating (1-5)
  reviewCount: number;           // Number of reviews
  bio?: string;                  // Biography
  notes?: string;                // Admin-only notes
  reviews?: ConsultantReview[];  // Review history
  createdBy: string;             // Creator ID
  createdAt: string;             // Creation timestamp
  updatedBy: string;             // Last updater ID
  updatedAt: string;             // Update timestamp
}
```

## API Endpoints

| Method | Endpoint | Description | Access |
| -------- | ---------- | ------------- | -------- |
| GET | `/api/consultants` | List all consultants | All |
| GET | `/api/consultants/:id` | Get single consultant | All |
| POST | `/api/consultants` | Create consultant | Admin |
| PUT | `/api/consultants/:id` | Update consultant | Admin |
| DELETE | `/api/consultants/:id` | Delete consultant | Admin |
| POST | `/api/consultants/:id/availability` | Toggle availability | Admin |
| POST | `/api/consultants/:id/review` | Add rating/review | Doctor |
| GET | `/api/consultants/specialties/list` | Get specialties list | All |


## Workflows

### 1. Admin: Add New Consultant

```text
1. Admin clicks "Add Consultant" button
2. Fill required fields: Name, Specialty, Email
3. Optional: Hospital, Phone, Languages, Experience, Bio, Notes
4. Click "Add Consultant"
5. System validates and creates record
6. Consultant appears in list with "Available" status
```

### 2. Admin: Edit Consultant

```text
1. Admin clicks "Edit" on consultant card
2. Modal opens with current data
3. Admin modifies fields
4. Click "Save Changes"
5. System updates record with audit trail
```

### 3. Admin: Toggle Availability

```text
1. Admin clicks availability badge on consultant card
2. System toggles available status
3. Badge updates immediately (green/gray)
```

### 4. Admin: Delete Consultant

```text
1. Admin clicks delete (trash) icon
2. Confirmation modal appears
3. Admin confirms deletion
4. Record is permanently removed
```

### 5. Doctor: Rate Consultant

```text
1. Doctor clicks "Rate" button
2. Rate modal opens
3. Select 1-5 stars
4. Optionally add comment
5. Click "Submit Rating"
6. Rating added, average recalculated
```

### 6. Doctor: Contact Consultant

```text
1. Click "Email" → Opens email client
2. Click "Call" → Opens phone dialer
```

### 7. View Consultant Details

```text
1. Click eye icon on consultant card
2. Detail modal shows full profile
3. Shows recent reviews if available
4. Admin sees internal notes
```

## Data Storage

Data is persisted in GCS bucket: `izara-meta-data`

- Path: `consultants/consultants.json`

- Specialties: `consultants/specialties.json`

## Error Handling

| Error | User Message | Resolution |
| ------- | -------------- | ------------ |
| Network failure | "Failed to fetch consultants" + Retry button | Retry request |
| Duplicate email | "A consultant with this email already exists" | Use different email |
| Missing required fields | "Please fill in required fields" | Complete form |
| Unauthorized action | "Only admins can..." | Check user role |


## Correlation with Admin Users

1. **Audit Trail**: All changes tracked with `createdBy`, `updatedBy` fields
2. **Admin Notes**: Private notes visible only to admin users
3. **Review System**: Doctor reviews visible to all, aggregated into rating
4. **Availability Control**: Only admins can toggle consultant availability

---

## PostgreSQL Database Architecture

### Database Tables

| Table | Purpose | Key Columns |
| ----- | ------- | ----------- |
| **consultants** | Specialist directory | id, name, specialty, email, phone, hospital, languages (JSONB), is_available (boolean), rating (decimal), reviews (JSONB), admin_notes (text), created_by, updated_by |
| **doctor_reviews** | Doctor ratings for consultants | id, doctor_id, patient_id (null for consultant reviews), appointment_id (null), rating (1-5), comment |
| **users** | Creator/modifier identity | id, name, role (admin/doctor) |
| **audit_logs** | All CRUD operations tracked | id, user_id, action, entity_type='consultant', entity_id, details (JSONB) |


### Data Flow: CRUD Operations

```text
Doctor Portal (port 3010) — mainApiServer.cjs
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Admin creates consultant:                                       │
│  INSERT INTO consultants (name, specialty, email, phone,        │
│    hospital, languages, is_available, admin_notes, created_by)   │
│  VALUES ($1, $2, $3, $4, $5, $6::jsonb, true, $7, $userId)     │
│  INSERT INTO audit_logs (action='create_consultant')             │
│                                                                  │
│  Admin toggles availability:                                     │
│  UPDATE consultants SET is_available = NOT is_available          │
│  WHERE id = $1                                                   │
│                                                                  │
│  Doctor rates consultant:                                        │
│  INSERT INTO doctor_reviews (doctor_id, rating, comment)        │
│  WHERE entity_type='consultant' AND entity_id=$consultantId     │
│  UPDATE consultants SET rating = (SELECT AVG(rating)            │
│    FROM doctor_reviews WHERE entity_id=$consultantId)            │
│                                                                  │
│  All read:                                                       │
│  SELECT * FROM consultants WHERE is_available = true            │
│    ORDER BY rating DESC                                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  PostgreSQL - izara_phase1                                       │
│  Local: izara-postgres:5432 (Docker)                             │
│  Production: 35.240.157.230:5432 (GCE VM)                       │
│  Region: asia-southeast1                                         │
└──────────────────────────────────────────────────────────────────┘
```

### API Endpoints with DB Operations

| Method | Endpoint | DB Operation |
| ------ | -------- | ------------ |
| GET | `/api/consultants` | SELECT FROM consultants ORDER BY rating DESC |
| GET | `/api/consultants/:id` | SELECT FROM consultants WHERE id=$1 |
| POST | `/api/consultants` | INSERT INTO consultants + audit_logs |
| PUT | `/api/consultants/:id` | UPDATE consultants + audit_logs |
| DELETE | `/api/consultants/:id` | DELETE FROM consultants + audit_logs |
| POST | `/api/consultants/:id/availability` | UPDATE consultants SET is_available=NOT is_available |
| POST | `/api/consultants/:id/review` | INSERT INTO doctor_reviews + UPDATE consultants (avg rating) |


### Deployment

| Environment | Service | Database |
| ----------- | ------- | -------- |
| Local Docker | Doctor Portal (3010) | izara-postgres:5432 |
| Production | Doctor Portal (Cloud Run, asia-southeast1) | 35.240.157.230:5432 |


### Scenario Coverage

| # | Scenario | Actor | DB Tables |
| - | -------- | ----- | --------- |
| 1 | Add new consultant | Admin | consultants, audit_logs |
| 2 | Edit consultant profile | Admin | consultants, audit_logs |
| 3 | Toggle availability | Admin | consultants |
| 4 | Delete consultant | Admin | consultants, audit_logs |
| 5 | Rate consultant | Doctor | doctor_reviews, consultants |
| 6 | View consultants list | Doctor | consultants (read) |
| 7 | Filter by specialty | Doctor | consultants (read) |

