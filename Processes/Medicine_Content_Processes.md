# 🩺 Medicine Content Processes

**Version:** 1.6.0
**Last Updated:** March 31, 2026
**Status:** ✅ PostgreSQL Implementation + Full DB Schema
**Purpose:** Complete reference for medical content management workflows, data structures, cross-portal synchronization, and implementation guidelines for the Izara Telemedicine Platform.

---


## 📋 Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Workflow Steps](#4-workflow-steps)
5. [Data Structures](#5-data-structures)
6. [GCS Storage Structure](#6-gcs-storage-structure)
7. [Cross-Portal Data Synchronization](#7-cross-portal-data-synchronization)
8. [API Endpoints](#8-api-endpoints)
9. [Content Categories](#9-content-categories)
10. [Implementation Guidelines](#10-implementation-guidelines)
11. [Patient Portal Access](#11-patient-portal-access)
12. [Developer Notes](#12-developer-notes)
13. [Future Enhancements](#13-future-enhancements)

---


## 🆕 Version 3.0 Changes (January 2025)


### Thai-First Content Policy


- **Primary Language**: Thai (ภาษาไทย) is now the default and required language


- **Secondary Language**: English is optional for international accessibility


- **Form UI**: Thai fields are displayed first and marked as required (*)


- **Display Priority**: Thai content is shown as primary in all views


### Image Support in Content

Content now supports inline images using a simple markdown-like syntax:

```text
[image:URL:description]
```

**Example**:

```text
[image:<https://storage.googleapis.com/izara-meta-data/images/heart-diagram.jpg:ภาพแสดงโครงสร้างของหัวใจ>]
```

Images are rendered inline with proper styling and captions.

---


## 1. Overview

The medical content system consists of two main modules that serve different audiences:


### Medical Content (คลังความรู้สุขภาพ)


- **Purpose**: Health education articles for patients


- **Audience**: Patients (read-only), Doctors (CRUD), Admins (CRUD + Approve)


- **Location**:
  - Doctor Portal: `MedicalContent.tsx` page
  - Patient Portal: `MedicalContentLibrary.tsx` → "คลังความรู้สุขภาพ" tab in Health Studio


### Clinical Resources (แหล่งข้อมูลทางการแพทย์)


- **Purpose**: Medical guidelines, protocols, and research for healthcare professionals


- **Audience**: Doctors only (with admin approval workflow)


- **Location**: Doctor Portal: `ClinicalResources.tsx` page

---


## 2. System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONTENT MANAGEMENT SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────┐              ┌─────────────────┐                 │
│   │  DOCTOR PORTAL  │              │  PATIENT PORTAL │                 │
│   ├─────────────────┤              ├─────────────────┤                 │
│   │ • MedicalContent│              │ • MedicalContent│                 │
│   │   (Full CRUD)   │──── SYNC ────│   Library       │                 │
│   │ • ClinicalRes.  │              │   (Read Only)   │                 │
│   │   (Full CRUD)   │              │                 │                 │
│   └────────┬────────┘              └────────┬────────┘                 │
│            │                                │                           │
│            ▼                                ▼                           │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │                    GCS BUCKET                           │          │
│   │              izara-meta-data                            │          │
│   ├─────────────────────────────────────────────────────────┤          │
│   │  medical-content/                                       │          │
│   │  ├── articles.json      ← Shared content               │          │
│   │  ├── tags.json          ← Dynamic tags                 │          │
│   │  └── audit-logs.json    ← Change tracking              │          │
│   │                                                         │          │
│   │  clinical-resources/                                    │          │
│   │  ├── resources.json     ← Doctor-only content          │          │
│   │  ├── pending.json       ← Awaiting approval            │          │
│   │  └── audit-logs.json    ← Change tracking              │          │
│   └─────────────────────────────────────────────────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---


## 3. User Roles & Permissions


### Permission Matrix

| Role | Medical Content | Clinical Resources |
| --------- | ------------------------------------------ | ----------------------------------- |
| Patient | ✅ Read published only | ❌ No access |
| Doctor | ✅ Create, Edit, Delete own | ✅ Create, Edit, Submit for approval |
| | ✅ Publish (direct or via approval) | ⏳ Pending approval required |
| | ✅ Read all published | ✅ Read approved only |
| Admin | ✅ Full CRUD | ✅ Approve/Reject |
| | ✅ Approve/Reject submissions | ✅ View all (including pending) |
| | ✅ Audit log access | ✅ Audit log access |


### Role Capabilities

```typescript
interface ContentRoleCapabilities {
  // Medical Content
  medicalContent: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    publish: boolean;
    approve: boolean;
    viewAuditLog: boolean;
  };
  // Clinical Resources
  clinicalResources: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    submitForApproval: boolean;
    approve: boolean;
    viewAuditLog: boolean;
  };
}

// Doctor capabilities
const doctorCapabilities: ContentRoleCapabilities = {
  medicalContent: {
    create: true,
    read: true,
    update: true,  // Own content only
    delete: true,  // Own content only
    publish: true, // May require approval in future
    approve: false,
    viewAuditLog: false
  },
  clinicalResources: {
    create: true,
    read: true,    // Published only
    update: true,  // Own content only
    delete: true,  // Own content only
    submitForApproval: true,
    approve: false,
    viewAuditLog: false
  }
};

// Admin capabilities
const adminCapabilities: ContentRoleCapabilities = {
  medicalContent: {
    create: true,
    read: true,
    update: true,
    delete: true,
    publish: true,
    approve: true,
    viewAuditLog: true
  },
  clinicalResources: {
    create: true,
    read: true,    // All including pending
    update: false, // Review only
    delete: false,
    submitForApproval: false,
    approve: true,
    viewAuditLog: true
  }
};
```

---


## 4. Workflow Steps


### Medical Content Workflow (Patient-Facing)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                    MEDICAL CONTENT WORKFLOW                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌──────────┐              │
│  │  DRAFT  │───▶│ PENDING │───▶│APPROVED │───▶│PUBLISHED │              │
│  └─────────┘    └─────────┘    └─────────┘    └──────────┘              │
│       │              │              │               │                    │
│       ▼              ▼              │               ▼                    │
│  Doctor saves   Admin reviews  Automatic      Visible to                │
│  content        submission     (if admin)     patients                   │
│       │              │                              │                    │
│       │              ▼                              ▼                    │
│       │         ┌─────────┐                   ┌──────────┐              │
│       │         │REJECTED │                   │ ARCHIVED │              │
│       │         └─────────┘                   └──────────┘              │
│       │              │                                                   │
│       │              ▼                                                   │
│       └────────── Revise ◀──────────┘                                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```


#### Step-by-Step Process

1. **Create Draft**

    ```typescript
    // Doctor/Admin creates content
    const draft: MedicalContentArticle = {
      id: generateUUID(),
      status: 'draft',
      createdBy: 'doctor.test@izara.com',
      createdByName: 'Dr. Test',
      // ... content fields
    };
    ```

1. **Submit for Approval** (Optional - depends on configuration)

    ```typescript
    // Doctor submits for review
    content.status = 'pending';
    content.submittedAt = new Date().toISOString();
    ```

1. **Admin Review**

    ```typescript
    // Admin approves or rejects
    if (approved) {
      content.status = 'published';
      content.approvedBy = 'admin.test@izara.com';
      content.approvedAt = new Date().toISOString();
      content.publishedAt = new Date().toISOString();
    } else {
      content.status = 'rejected';
      content.rejectedBy = 'admin.test@izara.com';
      content.rejectedAt = new Date().toISOString();
      content.rejectionReason = 'Needs more medical references';
    }
    ```

1. **Publish** → Content visible in Patient Portal คลังความรู้สุขภาพ

1. **Archive** → Hidden but preserved for compliance

---


### Clinical Resources Workflow (Doctor-Facing)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                  CLINICAL RESOURCES WORKFLOW                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐    ┌─────────┐    ┌──────────┐                             │
│  │  DRAFT  │───▶│ PENDING │───▶│PUBLISHED │                             │
│  └─────────┘    └─────────┘    └──────────┘                             │
│       │              │               │                                   │
│       ▼              ▼               ▼                                   │
│  Doctor creates  Admin MUST     Visible to                              │
│  resource        approve        all doctors                              │
│                      │                                                   │
│                      ▼                                                   │
│                 ┌─────────┐                                              │
│                 │REJECTED │──────▶ Doctor revises                       │
│                 └─────────┘                                              │
│                                                                          │
│  ⚠️ IMPORTANT: Clinical resources ALWAYS require admin approval         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```


#### Step-by-Step Process (2)

1. **Create Draft**

    ```typescript
    const resource: ClinicalResourceItem = {
      id: generateUUID(),
      status: 'draft',
      requiresAdminApproval: true,
      createdBy: 'doctor.test@izara.com',
      createdByName: 'Dr. Test',
      // ... content fields
    };
    ```

1. **Submit for Approval** (REQUIRED)

    ```typescript
    resource.status = 'pending';
    resource.submittedAt = new Date().toISOString();
    // Add to pending queue
    pendingApprovalIds.push(resource.id);
    ```

1. **Admin Review** (MANDATORY)

    ```typescript
    if (approved) {
      resource.status = 'published';
      resource.reviewedBy = 'admin.test@izara.com';
      resource.reviewedByName = 'Admin';
      resource.reviewedAt = new Date().toISOString();
      resource.publishedAt = new Date().toISOString();
    } else {
      resource.status = 'rejected';
      resource.reviewedBy = 'admin.test@izara.com';
      resource.reviewedByName = 'Admin';
      resource.reviewedAt = new Date().toISOString();
      resource.rejectionReason = 'Evidence level needs verification';
    }
    ```

1. **Publish** → Resource visible to all doctors in Clinical Resources page

---


## 5. Data Structures


### Medical Content Article

```typescript
interface MedicalContentArticle {
  // Identification
  id: string;                              // UUID: 'mc-uuid-xxxx'

  // Core Content (Bilingual - Thai Primary)
  titleTh: string;                         // Thai title (ชื่อบทความ) - REQUIRED
  title?: string;                          // English title (optional)
  summaryTh: string;                       // Thai summary - REQUIRED
  summary?: string;                        // English summary (optional)
  contentTh: string;                       // Thai content - REQUIRED (supports [image:URL:desc])
  content?: string;                        // English content (optional, supports images)

  // Classification
  category: MedicalContentCategoryId;      // Fixed category ID
  tags: string[];                          // Dynamic tag IDs
  type: 'article' | 'video' | 'guide' | 'infographic';

  // Media Assets
  thumbnail?: string;                      // Cover image URL
  videoUrl?: string;                       // Embedded video URL
  attachments?: string[];                  // Additional files

  // Status & Workflow
  status: ContentStatus;                   // draft|pending|published|rejected|archived
  isFeatured: boolean;                     // Show in featured section

  // Reading Metrics
  readTimeMinutes: number;                 // Estimated read time

  // Analytics
  views: number;                           // View count
  likes: number;                           // Like count
  shares: number;                          // Share count

  // Version Control
  version: number;                         // Current version number
  history: ContentVersion[];               // Previous versions

  // Discussion
  comments: ContentComment[];              // Internal comments

  // Authorship
  createdBy: string;                       // Author email
  createdByName: string;                   // Author display name
  createdAt: string;                       // ISO timestamp
  updatedBy: string;                       // Last editor email
  updatedByName: string;                   // Last editor name
  updatedAt: string;                       // Last update timestamp

  // Approval Workflow
  submittedAt?: string;                    // When submitted for review
  approvedBy?: string;                     // Approver email
  approvedAt?: string;                     // Approval timestamp
  publishedAt?: string;                    // Publication timestamp
  rejectedBy?: string;                     // Rejector email
  rejectedAt?: string;                     // Rejection timestamp
  rejectionReason?: string;                // Why rejected
}
```


### Clinical Resource Item

```typescript
interface ClinicalResourceItem {
  // Identification
  id: string;                              // UUID: 'cr-uuid-xxxx'

  // Core Content (Bilingual)
  title: string;                           // Resource title
  titleTh?: string;                        // Thai title
  description: string;                     // Brief summary
  descriptionTh?: string;                  // Thai description
  content: string;                         // Full content (Markdown)
  contentTh?: string;                      // Thai content

  // Classification
  category: ClinicalResourcesCategoryId;   // Fixed category
  tags: string[];                          // Dynamic tags
  specialty?: string;                      // Medical specialty
  resourceType: 'guideline' | 'protocol' | 'reference' | 'template' | 'research';

  // References & Evidence
  source?: string;                         // Original source
  references?: string[];                   // Citation list
  attachments?: string[];                  // PDF, images, etc.
  evidenceLevel?: 'A' | 'B' | 'C' | 'D' | 'E'; // Evidence grading

  // Status & Approval
  status: ContentStatus;
  requiresAdminApproval: boolean;          // Always true for clinical

  // Approval Workflow
  submittedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  publishedAt?: string;

  // Version Control
  version: number;
  history: ContentVersion[];

  // Discussion
  comments: ContentComment[];

  // Authorship
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
}
```


### Supporting Types

```typescript
// Content Status
type ContentStatus =
  | 'draft'           // Work in progress
  | 'pending'         // Awaiting admin approval
  | 'published'       // Live and visible
  | 'rejected'        // Sent back for revision
  | 'archived';       // Hidden but preserved

// Version History Entry
interface ContentVersion {
  version: number;
  title: string;
  content: string;
  summary: string;
  modifiedBy: string;
  modifiedByName: string;
  modifiedAt: string;
  changeNote?: string;
}

// Internal Comment
interface ContentComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'doctor' | 'admin';
  content: string;
  createdAt: string;
  isAdminFeedback?: boolean;  // Approval/rejection comment
}

// Dynamic Tag
interface ContentTag {
  id: string;
  name: string;
  nameTh?: string;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

// Audit Log Entry
interface ContentAuditLog {
  id: string;
  contentId: string;
  contentType: 'medical-content' | 'clinical-resource';
  action: 'created' | 'edited' | 'submitted' | 'approved' | 'rejected' | 'published' | 'archived' | 'deleted';
  performedBy: {
    userId: string;
    userName: string;
    role: 'doctor' | 'admin';
  };
  timestamp: string;
  previousStatus?: ContentStatus;
  newStatus: ContentStatus;
  comment?: string;
  rejectionReason?: string;
  changesSummary?: string;
  metadata?: Record<string, any>;
}
```

---


## 6. GCS Storage Structure

```text
izara-meta-data/                          # GCS Bucket
│
├── medical-content/                       # Patient-facing content
│   ├── articles.json                      # All MedicalContentArticle[]
│   ├── tags.json                          # ContentTag[]
│   ├── categories.json                    # Fixed categories reference
│   └── audit-logs/
│       └── audit-log-YYYY-MM.json         # Monthly audit logs
│
├── clinical-resources/                    # Doctor-only content
│   ├── resources.json                     # All ClinicalResourceItem[]
│   ├── pending-approvals.json             # IDs awaiting approval
│   ├── tags.json                          # ContentTag[]
│   ├── categories.json                    # Fixed categories reference
│   └── audit-logs/
│       └── audit-log-YYYY-MM.json         # Monthly audit logs
│
└── content-assets/                        # Uploaded media
    ├── thumbnails/
    ├── attachments/
    └── videos/
```


### Storage Schema Examples

```json
// medical-content/articles.json
{
  "articles": [
    {
      "id": "mc-001",
      "title": "Understanding Blood Pressure",
      "status": "published",
      "createdBy": "doctor.test@izara.com",
      // ... full article data
    }
  ],
  "lastUpdated": "2025-12-11T10:00:00Z"
}

// clinical-resources/pending-approvals.json
{
  "pendingIds": ["cr-005", "cr-006"],
  "lastUpdated": "2025-12-11T10:00:00Z"
}
```

---


## 7. Cross-Portal Data Synchronization


### Sync Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     CROSS-PORTAL SYNC FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   DOCTOR PORTAL                          PATIENT PORTAL                 │
│   ┌─────────────┐                       ┌─────────────┐                │
│   │ Create/Edit │                       │  Display    │                │
│   │   Content   │                       │  Content    │                │
│   └──────┬──────┘                       └──────▲──────┘                │
│          │                                     │                        │
│          ▼                                     │                        │
│   ┌─────────────┐     ┌─────────────┐         │                        │
│   │   Save to   │────▶│    GCS      │─────────┘                        │
│   │     GCS     │     │   Bucket    │                                  │
│   └─────────────┘     └─────────────┘                                  │
│                                                                         │
│   SYNC TRIGGER POINTS:                                                  │
│   1. Content created/updated                                           │
│   2. Status changed (published/archived)                               │
│   3. Analytics updated (views, likes)                                  │
│   4. Periodic refresh (every 5 min for patient portal)                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```


### Sync Implementation

```typescript
// services/contentSyncService.ts

interface SyncConfig {
  refreshInterval: number;  // ms between syncs
  retryAttempts: number;
  retryDelay: number;
}

const SYNC_CONFIG: SyncConfig = {
  refreshInterval: 5 * 60 * 1000,  // 5 minutes
  retryAttempts: 3,
  retryDelay: 1000
};

// Doctor Portal: Write operations
async function publishContent(content: MedicalContentArticle): Promise<void> {
  // 1. Update content status
  content.status = 'published';
  content.publishedAt = new Date().toISOString();

  // 2. Save to GCS
  await saveToGCS('medical-content/articles.json', articles);

  // 3. Log audit entry
  await logAuditEntry({
    contentId: content.id,
    action: 'published',
    performedBy: currentUser,
    newStatus: 'published'
  });

  // 4. Sync is automatic - Patient Portal reads from same GCS location
}

// Patient Portal: Read operations
async function fetchPublishedContent(): Promise<MedicalContentArticle[]> {
  // Fetch from GCS
  const data = await fetchFromGCS('medical-content/articles.json');

  // Filter: Only published content visible to patients
  return data.articles.filter(
    article => article.status === 'published'
  );
}

// Real-time sync option (future enhancement)
async function setupRealtimeSync(): Promise<void> {
  // Using GCS Pub/Sub notifications
  const subscription = pubsub.subscription('content-updates');

  subscription.on('message', async (message) => {
    const update = JSON.parse(message.data);
    if (update.type === 'medical-content') {
      await refreshContentCache();
    }
    message.ack();
  });
}
```


### Sync Data Flow Matrix

| Action | Doctor Portal | GCS | Patient Portal |
| -------- | --------------- | ----- | ---------------- |
| Create Draft | ✅ Write | ✅ Store | ❌ Not visible |
| Submit for Review | ✅ Update status | ✅ Store | ❌ Not visible |
| Approve | ✅ Admin action | ✅ Store | ❌ Not visible |
| Publish | ✅ Status change | ✅ Store | ✅ Visible |
| Update Published | ✅ Edit | ✅ Store | ✅ Updated |
| Archive | ✅ Status change | ✅ Store | ❌ Hidden |
| View/Like | ❌ N/A | ✅ Analytics | ✅ Increment |

---


## 8. API Endpoints


### Medical Content APIs

```typescript
// Base URL: /api/content/medical

// List & Search
GET    /api/content/medical                    // List published (all users)
GET    /api/content/medical?status=draft       // List by status (doctor/admin)
GET    /api/content/medical/:id                // Get single article
GET    /api/content/medical/pending            // List pending approvals (admin)
GET    /api/content/medical/featured           // Get featured articles

// CRUD Operations
POST   /api/content/medical                    // Create new article
PUT    /api/content/medical/:id                // Update article
DELETE /api/content/medical/:id                // Delete article (soft delete)

// Workflow Actions
POST   /api/content/medical/:id/submit         // Submit for approval
POST   /api/content/medical/:id/review         // Approve/reject (admin)
POST   /api/content/medical/:id/publish        // Direct publish (admin)
POST   /api/content/medical/:id/archive        // Archive content

// Analytics
POST   /api/content/medical/:id/view           // Increment view count
POST   /api/content/medical/:id/like           // Toggle like
POST   /api/content/medical/:id/share          // Increment share count

// Audit
GET    /api/content/medical/:id/audit-log      // Get audit history
```


### Clinical Resources APIs

```typescript
// Base URL: /api/content/clinical

// List & Search
GET    /api/content/clinical                   // List published (doctors)
GET    /api/content/clinical?status=pending    // Pending approvals (admin)
GET    /api/content/clinical/:id               // Get single resource

// CRUD Operations
POST   /api/content/clinical                   // Create resource
PUT    /api/content/clinical/:id               // Update resource
DELETE /api/content/clinical/:id               // Delete resource

// Workflow Actions
POST   /api/content/clinical/:id/submit        // Submit for approval
POST   /api/content/clinical/:id/review        // Approve/reject (admin)

// Audit
GET    /api/content/clinical/:id/audit-log     // Get audit history
```


### Request/Response Examples

```typescript
// Create Medical Content
POST /api/content/medical
{
  "title": "Understanding Diabetes",
  "titleTh": "ทำความเข้าใจโรคเบาหวาน",
  "summary": "A comprehensive guide to diabetes management",
  "content": "# Diabetes Overview\n...",
  "category": "chronic-disease",
  "tags": ["diabetes", "lifestyle", "management"],
  "type": "guide",
  "thumbnail": "<https://example.com/image.jpg",>
  "status": "draft"
}

// Response
{
  "success": true,
  "data": {
    "id": "mc-uuid-xxxx",
    "title": "Understanding Diabetes",
    "status": "draft",
    "createdBy": "doctor.test@izara.com",
    "createdAt": "2025-12-11T10:00:00Z"
  }
}

// Admin Review
POST /api/content/medical/:id/review
{
  "action": "approve",
  "comment": "Well-researched article, approved for publication"
}

// Response
{
  "success": true,
  "data": {
    "id": "mc-uuid-xxxx",
    "status": "published",
    "approvedBy": "admin.test@izara.com",
    "approvedAt": "2025-12-11T11:00:00Z",
    "publishedAt": "2025-12-11T11:00:00Z"
  }
}
```

---


## 9. Content Categories


### Medical Content Categories (Fixed)

```typescript
const MEDICAL_CONTENT_CATEGORIES = [
  { id: 'general-health',   name: 'General Health',       nameTh: 'สุขภาพทั่วไป',           icon: 'Heart' },
  { id: 'chronic-disease',  name: 'Chronic Diseases',     nameTh: 'โรคเรื้อรัง',            icon: 'Activity' },
  { id: 'mental-health',    name: 'Mental Health',        nameTh: 'สุขภาพจิต',              icon: 'Brain' },
  { id: 'nutrition',        name: 'Nutrition',            nameTh: 'โภชนาการ',               icon: 'Apple' },
  { id: 'exercise',         name: 'Exercise & Fitness',   nameTh: 'การออกกำลังกาย',         icon: 'Dumbbell' },
  { id: 'preventive-care',  name: 'Preventive Care',      nameTh: 'การดูแลเชิงป้องกัน',      icon: 'Shield' },
  { id: 'womens-health',    name: "Women's Health",       nameTh: 'สุขภาพผู้หญิง',          icon: 'Heart' },
  { id: 'mens-health',      name: "Men's Health",         nameTh: 'สุขภาพผู้ชาย',           icon: 'Heart' },
  { id: 'pediatrics',       name: 'Pediatrics',           nameTh: 'กุมารเวชศาสตร์',         icon: 'Baby' },
  { id: 'elderly-care',     name: 'Elderly Care',         nameTh: 'การดูแลผู้สูงอายุ',       icon: 'Users' },
  { id: 'first-aid',        name: 'First Aid',            nameTh: 'การปฐมพยาบาล',          icon: 'Cross' },
  { id: 'medications',      name: 'Medications',          nameTh: 'ยาและการใช้ยา',          icon: 'Pill' },
];
```


### Clinical Resources Categories (Fixed)

```typescript
const CLINICAL_RESOURCES_CATEGORIES = [
  { id: 'diagnosis',    name: 'Diagnosis Guidelines',   nameTh: 'แนวทางการวินิจฉัย',   icon: 'Stethoscope' },
  { id: 'treatment',    name: 'Treatment Protocols',    nameTh: 'แนวทางการรักษา',      icon: 'FileText' },
  { id: 'pharmacology', name: 'Pharmacology',           nameTh: 'เภสัชวิทยา',          icon: 'Pill' },
  { id: 'radiology',    name: 'Radiology',              nameTh: 'รังสีวิทยา',           icon: 'Image' },
  { id: 'laboratory',   name: 'Laboratory',             nameTh: 'ห้องปฏิบัติการ',       icon: 'TestTube' },
  { id: 'pathology',    name: 'Pathology',              nameTh: 'พยาธิวิทยา',          icon: 'Microscope' },
  { id: 'emergency',    name: 'Emergency Medicine',     nameTh: 'เวชศาสตร์ฉุกเฉิน',    icon: 'Siren' },
  { id: 'nursing',      name: 'Nursing Guidelines',     nameTh: 'แนวทางการพยาบาล',    icon: 'Heart' },
  { id: 'research',     name: 'Research Papers',        nameTh: 'งานวิจัย',            icon: 'BookOpen' },
  { id: 'case-studies', name: 'Case Studies',           nameTh: 'กรณีศึกษา',           icon: 'FileCase' },
];
```

---


## 10. Implementation Guidelines


### For AI Agents / Developers


#### When Adding New Content

```typescript
// 1. Generate unique ID with prefix
const generateContentId = (type: 'medical' | 'clinical'): string => {
  const prefix = type === 'medical' ? 'mc' : 'cr';
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 2. Set required fields
const createNewContent = (input: CreateContentInput): MedicalContentArticle => {
  const now = new Date().toISOString();
  return {
    id: generateContentId('medical'),
    ...input,
    status: 'draft',
    version: 1,
    history: [],
    comments: [],
    views: 0,
    likes: 0,
    shares: 0,
    isFeatured: false,
    readTimeMinutes: calculateReadTime(input.content),
    createdBy: currentUser.email,
    createdByName: currentUser.name,
    createdAt: now,
    updatedBy: currentUser.email,
    updatedByName: currentUser.name,
    updatedAt: now
  };
};

// 3. Calculate read time
const calculateReadTime = (content: string): number => {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};
```


#### When Updating Content

```typescript
// 1. Save version to history
const updateContent = (
  existing: MedicalContentArticle,
  updates: UpdateContentInput
): MedicalContentArticle => {
  // Save current state to history
  const historyEntry: ContentVersion = {
    version: existing.version,
    title: existing.title,
    content: existing.content,
    summary: existing.summary,
    modifiedBy: existing.updatedBy,
    modifiedByName: existing.updatedByName,
    modifiedAt: existing.updatedAt,
    changeNote: updates.changeNote
  };

  return {
    ...existing,
    ...updates,
    version: existing.version + 1,
    history: [...existing.history, historyEntry],
    updatedBy: currentUser.email,
    updatedByName: currentUser.name,
    updatedAt: new Date().toISOString()
  };
};
```


#### When Implementing Approval

```typescript
// Admin approval handler
const handleApproval = async (
  contentId: string,
  action: 'approve' | 'reject',
  comment?: string,
  rejectionReason?: string
): Promise<void> => {
  const content = await getContent(contentId);
  const now = new Date().toISOString();

  if (action === 'approve') {
    content.status = 'published';
    content.approvedBy = currentUser.email;
    content.approvedAt = now;
    content.publishedAt = now;
  } else {
    content.status = 'rejected';
    content.rejectedBy = currentUser.email;
    content.rejectedAt = now;
    content.rejectionReason = rejectionReason;
  }

  // Add comment
  if (comment) {
    content.comments.push({
      id: generateUUID(),
      authorId: currentUser.email,
      authorName: currentUser.name,
      authorRole: 'admin',
      content: comment,
      createdAt: now,
      isAdminFeedback: true
    });
  }

  // Log audit entry
  await logAuditEntry({
    contentId,
    action: action === 'approve' ? 'approved' : 'rejected',
    performedBy: currentUser,
    previousStatus: 'pending',
    newStatus: content.status,
    comment,
    rejectionReason
  });

  await saveContent(content);
};
```

---


## 11. Patient Portal Access


### คลังความรู้สุขภาพ (Health Knowledge Library)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     PATIENT PORTAL - HEALTH STUDIO                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  TABS: [ สรุป | แนะนำ | ติดตาม | คลังความรู้สุขภาพ | ตั้งค่า ]    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ▲                                          │
│                              │                                          │
│                     ┌────────┴────────┐                                │
│                     │  MEDICAL CONTENT │                                │
│                     │     LIBRARY      │                                │
│                     └─────────────────┘                                │
│                                                                         │
│  FEATURES:                                                              │
│  • Browse by category                                                   │
│  • Search articles                                                      │
│  • View featured content                                                │
│  • Like and share                                                       │
│  • Read in Thai or English                                              │
│                                                                         │
│  VISIBILITY RULES:                                                      │
│  ✅ status === 'published'                                              │
│  ❌ Draft, pending, rejected content hidden                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```


### Patient Content Filtering

```typescript
// Patient Portal content service
const getPatientVisibleContent = async (): Promise<MedicalContentArticle[]> => {
  const allContent = await fetchFromGCS('medical-content/articles.json');

  // Filter for patient visibility
  return allContent.articles.filter(article =>
    article.status === 'published'
  ).sort((a, b) =>
    // Featured first, then by publish date
    (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) ||
    new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime()
  );
};
```

---


## 12. Developer Notes


### Critical Implementation Notes

1. **Authentication Required**: All write operations must verify user authentication and role
2. **GCS Path Convention**: Use consistent paths `izara-meta-data/{content-type}/{file}.json`
3. **Audit Logging**: Log ALL status changes for compliance
4. **Version Control**: Always save previous version to history before updates
5. **Thai Language**: All content should support bilingual fields (`title`, `titleTh`)


### File Locations

```text
Doctor Portal:
├── frontend/pages/MedicalContent.tsx          # Medical content management
├── frontend/pages/ClinicalResources.tsx       # Clinical resources with approval
├── frontend/types/contentTypes.ts             # Type definitions
└── frontend/services/contentService.ts        # API service layer

Patient Portal:
├── frontend/pages/health/MedicalContentLibrary.tsx  # Read-only library
├── frontend/components/health/MedicalContent.tsx    # Content display component
└── frontend/lib/services.ts                         # API calls

Backend:
└── server/gcsApiServer.cjs               # GCS API handling
```


### UI Components (MedicalContent.tsx)

The following UI components have been implemented to support the approval workflow:

1. **Status Options** (line ~78)

    ```tsx
    const statusOptions = [
      { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
      { value: 'pending', label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' },
      { value: 'published', label: 'Published', color: 'bg-green-100 text-green-700' },
      { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
      { value: 'archived', label: 'Archived', color: 'bg-gray-200 text-gray-600' },
    ];
    ```

1. **Admin Detection** (line ~93)

    ```tsx
    const isAdmin = user?.email?.includes('admin') || user?.role === 'admin';
    ```

1. **Pending Approvals Button** (Header - visible to Admin only when pendingCount > 0)
   - Shows notification badge with count
   - Opens pending list modal on click

1. **Submit for Approval Button** (View Modal)
   - Visible for draft/rejected articles
   - Calls `handleSubmitForApproval()` to change status to 'pending'

1. **Review Button** (View Modal)
   - Visible to Admin only for pending articles
   - Opens approval modal

1. **Approval Modal** (Admin only)
   - Preview of article content
   - Approval comment field
   - Reject with reason field
   - Approve/Reject action buttons

1. **Pending List Modal** (Admin only)
   - Lists all pending articles
   - Quick access to review each article


### Key Functions

```tsx
// Submit content for approval (Doctor)
handleSubmitForApproval(article: MedicalContentArticle): Promise<void>

// Approve or reject content (Admin)
handleApprovalAction(action: 'approve' | 'reject'): Promise<void>

// Fetch pending approvals count
fetchPendingApprovals(): Promise<void>

// Open approval modal with specific article
openApprovalModal(article: MedicalContentArticle): void
```


### Testing Checklist


- [ ] Doctor can create draft content


- [ ] Doctor can submit content for approval


- [ ] Admin sees pending approvals


- [ ] Admin can approve/reject with feedback


- [ ] Published content appears in Patient Portal


- [ ] Rejected content returns to draft with feedback


- [ ] Audit log captures all actions


- [ ] Version history preserved on updates

---


## 13. Future Enhancements


### Planned Features

1. **Rich Text Editor** (WYSIWYG)
   - Replace Markdown with visual editor
   - Inline image upload
   - Table support

2. **Real-time Notifications**
   - Push notifications for approval status
   - Email alerts for content submissions
   - In-app notification center

3. **Analytics Dashboard**
   - Content engagement metrics
   - Author performance tracking
   - Category popularity trends

4. **AI-Assisted Content**
   - Content suggestions
   - Auto-translation Thai ↔ English
   - Quality scoring

5. **Scheduled Publishing**
   - Set future publish date
   - Auto-archive after expiry

6. **Content Templates**
   - Pre-defined article structures
   - Category-specific templates

---


## 📊 Quick Reference


### Content Status Flow

| Status | Description | Who Can See | Next Actions |
| -------- | ------------- | ------------- | -------------- |
| `draft` | Work in progress | Author only | Edit, Submit |
| `pending` | Awaiting approval | Author, Admin | Approve, Reject |
| `published` | Live content | All (per visibility) | Edit, Archive |
| `rejected` | Needs revision | Author only | Edit, Resubmit |
| `archived` | Hidden | Admin only | Restore |


### Key Contacts


- **Platform Lead**: Platform team


- **Technical Support**: Development team


- **Content Policy**: Medical content review board

---

*Document maintained by: Development Team*
*For updates, submit a pull request or contact the platform lead.*

---


## 14. PostgreSQL Database Architecture


### Database Tables for Medicine Content

| Table | Purpose | Key Columns |
| ----- | ------- | ----------- |
| **medical_content** | Patient-facing health articles | id, title_thai, title_english, content_thai, content_english, category, tags (JSONB), author_id, author_name, status (draft/pending/published/rejected/archived), image_url, view_count |
| **clinical_resources** | Doctor-facing guidelines | id, title_thai, title_english, content_thai, content_english, category, specialty, guideline_year, tags (JSONB), status (pending/approved), author_id, approved_by, approved_at |
| **drugs** | Drug database for CDS | id, generic_name, brand_names (JSONB), drug_class, dosage_forms (JSONB), indications (JSONB), contraindications (JSONB), interactions (JSONB), pregnancy_category, renal_adjustment (JSONB) |
| **icd10_codes** | Diagnosis codes reference | code (PK), description_english, description_thai, category, chapter |
| **knowledge_base** | RAG-indexed content for AI | id, title, content, source, category, guideline_year, language, embedding (vector), is_active |
| **audit_logs** | All content CRUD operations | id, user_id, action, entity_type, entity_id, details (JSONB) |


### Content Lifecycle Data Flow

```text
Doctor Portal (port 3010)                        Patient Portal (port 3005)
┌────────────────────────────┐                   ┌──────────────────────────┐
│ Medical Content Manager    │                   │ Health Library Page       │
│ (Doctor/Admin creates)     │                   │ (Patient reads)          │
│                            │                   │                          │
│ POST  /api/content/articles│                   │ GET /api/content/articles│
│ PUT   /api/content/:id     │                   │   ?status=published      │
│ POST  /api/content/:id/    │                   │ GET /api/content/:id     │
│   review                   │                   │                          │
└──────────┬─────────────────┘                   └──────────┬───────────────┘
           │                                                │
           ▼                                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL - izara_phase1                              │
│                                                                          │
│  Doctor creates content (Thai-first):                                    │
│  INSERT INTO medical_content (title_thai, content_thai, category,       │
│    tags, author_id, status='draft')                                      │
│  VALUES ($1, $2, $3, $4::jsonb, $userId, 'draft')                       │
│                                                                          │
│  Submit for review:                                                      │
│  UPDATE medical_content SET status='pending' WHERE id=$1                │
│                                                                          │
│  Admin approves:                                                         │
│  UPDATE medical_content SET status='published' WHERE id=$1              │
│  INSERT INTO audit_logs (action='publish_content')                       │
│                                                                          │
│  Published content indexed for AI:                                       │
│  INSERT INTO knowledge_base (title, content, category, embedding)       │
│                                                                          │
│  Patient reads published content:                                        │
│  SELECT * FROM medical_content WHERE status='published'                 │
│    AND category=$1 ORDER BY created_at DESC                              │
│  UPDATE medical_content SET view_count = view_count + 1 WHERE id=$1     │
│                                                                          │
│  Drug information for CDS:                                               │
│  SELECT * FROM drugs WHERE generic_name ILIKE $1                        │
│  SELECT interactions FROM drugs WHERE id = ANY($drugIds)                │
│                                                                          │
│  ICD-10 codes for EMR:                                                   │
│  SELECT * FROM icd10_codes WHERE description_english ILIKE $1           │
│    OR description_thai ILIKE $1 OR code ILIKE $1                        │
└──────────────────────────────────────────────────────────────────────────┘
```


### Cross-Portal Content Sync

```text
┌─────────────────────────────────────────────────────────────────────┐
│                  MEDICINE CONTENT DATA FLOW                          │
│                                                                     │
│  DOCTOR PORTAL (port 3010) — Content Management                     │
│  ├── Create: INSERT medical_content / clinical_resources            │
│  ├── Review: UPDATE status (draft → pending → published)            │
│  ├── Edit:   UPDATE content fields + audit_logs                     │
│  └── Drug/ICD: Read-only SELECT from drugs, icd10_codes            │
│                                                                     │
│  PATIENT PORTAL (port 3005) — Content Consumption                   │
│  ├── Browse: SELECT medical_content WHERE status='published'        │
│  ├── Search: Full-text search on title_thai, content_thai           │
│  └── View:   SELECT by id + increment view_count                   │
│                                                                     │
│  MEETING SERVER (port 3020) — AI Integration                        │
│  ├── CDS:    SELECT FROM drugs + knowledge_base for drug checks     │
│  └── RAG:    SELECT FROM knowledge_base ORDER BY embedding <-> $q   │
│                                                                     │
│  ALL → PostgreSQL izara_phase1                                      │
│  ├── Local: izara-postgres:5432 (Docker, external 5433)             │
│  └── Production: 35.240.157.230:5432 (GCE VM)                      │
└─────────────────────────────────────────────────────────────────────┘
```


### Deployment Architecture

| Environment | Service | Content Access | Database |
| ----------- | ------- | -------------- | -------- |
| Local Docker | Doctor Portal (3010) | Full CRUD + reviews | izara-postgres:5432 |
| Local Docker | Patient Portal (3005) | Read published only | izara-postgres:5432 |
| Local Docker | Meeting Server (3020) | Drug CDS + RAG queries | izara-postgres:5432 |
| Production | All Cloud Run services | Same access per role | 35.240.157.230:5432 |


### API Endpoints with DB Operations

| Portal | Endpoint | Method | DB Operation |
| ------ | -------- | ------ | ------------ |
| Doctor | `/api/content/articles` | POST | INSERT INTO medical_content |
| Doctor | `/api/content/articles/:id` | PUT | UPDATE medical_content |
| Doctor | `/api/content/articles/:id/review` | POST | UPDATE medical_content SET status=$1 |
| Doctor | `/api/content/clinical` | POST | INSERT INTO clinical_resources |
| Doctor | `/api/content/clinical/:id/review` | POST | UPDATE clinical_resources SET status=$1 |
| Patient | `/api/content/articles` | GET | SELECT FROM medical_content WHERE status='published' |
| Patient | `/api/content/articles/:id` | GET | SELECT + UPDATE view_count |
| Meeting | `/api/ai/cds-check` | POST | SELECT FROM drugs, knowledge_base |


### Scenario Coverage

| # | Scenario | Actor | DB Tables |
| - | -------- | ----- | --------- |
| 1 | Create health article | Doctor | medical_content, audit_logs |
| 2 | Submit for review | Doctor | medical_content |
| 3 | Approve/publish | Admin | medical_content, knowledge_base, audit_logs |
| 4 | Reject article | Admin | medical_content, audit_logs |
| 5 | Patient browses articles | Patient | medical_content (read) |
| 6 | Create clinical resource | Doctor | clinical_resources, audit_logs |
| 7 | AI queries drug interactions | Meeting Server | drugs, cds_logs |
| 8 | AI RAG search | Doctor/Meeting | knowledge_base |
| 9 | ICD-10 code lookup | Doctor | icd10_codes (read) |
| 10 | Archive published content | Admin | medical_content, audit_logs |
