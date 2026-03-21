# Clinical Resources & Medical Library Workflows

**Version:** 1.5.9  
**Last Updated:** March 15, 2026  
**Status:** ✅ PostgreSQL Implementation

---

## Overview

The Clinical Resources page provides access to medical guidelines, research papers, and evidence-based study materials. Doctors can create content that requires admin approval before publishing.

## Phase 1 AI Integration

| Feature | Description | Status |
| --------- | ------------- | -------- |
| **RAG Knowledge Base** | Clinical resources indexed for AI search | ✅ |
| **AI Chat Assistant** | Doctors can query clinical guidelines via chat | ✅ |
| **Document Analysis** | AI can analyze uploaded PDF guidelines | ✅ |

---

## Thai-First Content Policy

- **Primary Language**: Thai (ภาษาไทย) is now required for all content
- **Secondary Language**: English is optional
- **Form Fields**: Thai fields appear first and are marked required (*)
- **Display**: Thai content is shown as primary in all views

### Image Support

Content now supports inline images:

```text
[image:URL:description]
```

Example: `[image:https://example.com/diagram.jpg:แผนภาพการรักษา]`

---

## User Roles & Permissions

### Admin Users

- **APPROVE/REJECT**: Review pending content submissions
- **READ**: View all resources regardless of status
- **COMMENT**: Provide feedback on submissions
- **VIEW PENDING**: See pending approval queue with count badge

### Doctor Users

- **CREATE**: Create new clinical resources
- **READ**: View published resources and own drafts
- **UPDATE**: Edit own resources (triggers re-approval if published)
- **DELETE**: Delete own resources
- **SUBMIT**: Submit drafts for admin approval

## Data Model

### Clinical Resource Entity

```typescript
interface ClinicalResourceItem {
  id: string;                        // Unique identifier (CR-xxx)
  
  // Bilingual Content (Thai Primary)
  titleTh: string;                   // Thai title - REQUIRED
  title?: string;                    // English title (optional)
  descriptionTh: string;             // Thai description - REQUIRED
  description?: string;              // English description (optional)
  contentTh: string;                 // Thai content - REQUIRED (supports [image:URL:desc])
  content?: string;                  // English content (optional)
  
  // Classification
  category: ClinicalResourcesCategoryId;  // Fixed category
  tags: string[];                    // Dynamic tags
  resourceType: 'guideline' | 'protocol' | 'research' | 'template' | 'reference';
  source?: string;                   // Content source
  references?: string[];             // Reference list
  
  // Status & Workflow
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  version: number;                   // Version number
  history: ContentVersion[];         // Version history
  comments: ContentComment[];        // Admin feedback
  rejectionReason?: string;          // If rejected
  
  // Audit Trail
  createdBy: string;                 // Creator ID
  createdByName: string;             // Creator name
  createdAt: string;                 // Creation timestamp
  updatedBy: string;                 // Last updater ID
  updatedByName: string;             // Last updater name
  updatedAt: string;                 // Update timestamp
  submittedAt?: string;              // Submission timestamp
  reviewedBy?: string;               // Reviewer ID
  reviewedByName?: string;           // Reviewer name
  reviewedAt?: string;               // Review timestamp
  publishedAt?: string;              // Publication timestamp
}
```

## Categories (Fixed)

| ID | Name | Thai Name |
| ---- | ------ | ----------- |
| diagnosis | Diagnosis Guidelines | แนวทางการวินิจฉัย |
| treatment | Treatment Protocols | แนวทางการรักษา |
| pharmacology | Pharmacology | เภสัชวิทยา |
| radiology | Radiology | รังสีวิทยา |
| laboratory | Laboratory | ห้องปฏิบัติการ |
| pathology | Pathology | พยาธิวิทยา |
| emergency | Emergency Medicine | เวชศาสตร์ฉุกเฉิน |
| nursing | Nursing Guidelines | แนวทางการพยาบาล |
| research | Research Papers | งานวิจัย |
| case-studies | Case Studies | กรณีศึกษา |

## API Endpoints

| Method | Endpoint | Description | Access |
| -------- | ---------- | ------------- | -------- |
| GET | `/api/content/clinical` | List resources | All |
| GET | `/api/content/clinical/:id` | Get single resource | All |
| GET | `/api/content/clinical/pending` | Get pending approvals | Admin |
| POST | `/api/content/clinical` | Create resource | Doctor |
| PUT | `/api/content/clinical/:id` | Update resource | Owner |
| DELETE | `/api/content/clinical/:id` | Delete resource | Owner |
| POST | `/api/content/clinical/:id/review` | Approve/Reject | Admin |
| GET | `/api/content/tags/clinical` | Get tags | All |
| POST | `/api/content/tags/clinical` | Create tag | Doctor |

## Workflows

### 1. Doctor: Create Clinical Resource

```text
1. Doctor clicks "Create Resource" button
2. Fill required fields: Title, Content
3. Select Category and Resource Type
4. Add optional: Thai translations, Tags, Source, References
5. Choose status: "Draft" or "Submit for Approval"
6. Click "Create"
7. If draft: Saved privately
8. If pending: Added to admin approval queue
```

### 2. Doctor: Edit Resource

```text
1. Doctor clicks "Edit" on own resource
2. Modal opens with current data
3. Doctor modifies content
4. Add change note (optional)
5. Click "Save Changes"
6. If previously published: Status changes to "pending"
7. Admin must re-approve changes
```

### 3. Doctor: Submit Draft for Approval

```text
1. View own draft resource
2. Click "Submit for Approval"
3. Status changes from "draft" to "pending"
4. Resource enters admin review queue
5. Admin receives notification (badge count)
```

### 4. Admin: Review Pending Content

```text
1. Admin sees pending count badge
2. Click to view pending list
3. Select resource to review
4. Read full content
5. Provide feedback comment (optional)
6. Click "Approve" or "Reject"
   - Approve: Status → "published", publishedAt set
   - Reject: Status → "rejected", reason required
7. Creator can view feedback
```

### 5. Doctor: View Rejection Feedback

```text
1. Resource shows "Rejected" status
2. Rejection reason displayed in red banner
3. Admin comments shown as feedback
4. Doctor can edit and resubmit
```

### 6. View Version History

```text
1. Click "History" button
2. Modal shows all versions
3. Each version shows: version number, date, modifier, change note
4. Current version highlighted
```

### 7. Filter and Search

```text
1. Use search bar for keyword search
2. Filter by status dropdown
3. Filter by category tabs
4. Toggle "My Content" to see own resources only
```

## Content Lifecycle

```text
[DRAFT] → [PENDING] → [PUBLISHED]
            ↓              ↓
       [REJECTED]    (edit triggers)
            ↓              ↓
       (edit) → [PENDING] ←
```

## Data Storage

Data is persisted in GCS bucket: `izara-meta-data`

- Resources: `clinical-resources/resources.json`
- Tags: `clinical-resources/tags.json`

## Error Handling

| Error | User Message | Resolution |
| ------- | -------------- | ------------ |
| Network failure | "Failed to fetch resources" + Retry | Retry request |
| Missing required fields | Form validation | Complete form |
| Cannot delete others' content | "Only the creator can delete" | Check ownership |
| Content not pending | "Resource is not pending approval" | Check status |

## Correlation with Admin Users

1. **Approval Workflow**: Admins see pending badge, review content
2. **Feedback System**: Admin comments visible to content creator
3. **Audit Trail**: All changes tracked with user info
4. **Status Control**: Only admin approval changes pending → published
5. **Re-approval**: Published content changes require re-approval

## Best Practices

1. **Bilingual Support**: Always provide both English and Thai content when possible
2. **References**: Include credible sources for clinical guidelines
3. **Version Notes**: Add meaningful change notes when editing
4. **Tags**: Use existing tags before creating new ones
5. **Categories**: Choose most appropriate category for discoverability
