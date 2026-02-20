# 📚 Mobile Content Library & Medical Resources Workflows

**Version:** 1.0  
**Module:** Phase 2 — Mobile App  
**Status:** 📋 Planning  
**Related:** [11_Mobile_App_Description.md](11_Mobile_App_Description.md), webapp [Clinical_Resources_&_Medical_Library_Workflows.md](../Clinical_Resources_&_Medical_Library_Workflows.md)

---

## 1. Overview

The Izara Dr. Anywhere mobile app provides access to health education content and clinical resources matching the webapp's Medical Content Library, Clinical Resources, and Medical Consultants pages.

| Feature | Patient Mode | Doctor Mode |
| --------- | :----------: | :----------: |
| View Health Articles | ✅ Read-only | ✅ Read + Create |
| Clinical Resources | ❌ | ✅ View + Create |
| Medical Consultants Directory | ❌ | ✅ View + Manage |
| Content Approval Workflow | ❌ | ✅ (Admin only) |
| Bookmark & Offline Reading | ✅ | ✅ |
| Share Articles | ✅ | ✅ |
| Search & Filter | ✅ | ✅ |

---

## 2. Patient — Health Library (Read-Only)

### 2.1 Navigation

`(patient)/health-library` — accessible from Dashboard quick actions or hamburger menu

### 2.2 Screen: Health Library List

```text
┌──────────────────────────────────────────┐
│  📚 ห้องสมุดสุขภาพ                        │
│     Health Library                        │
│                                          │
│  🔍 [Search articles...________________] │
│                                          │
│  Categories:                             │
│  [All] [โรค] [ยา] [สุขภาพ] [โภชนาการ]    │
│  [ออกกำลัง] [จิตใจ] [ผู้สูงอายุ] [เด็ก]    │
│                                          │
│  ── Popular Articles ─────────────────── │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 📷 [Image]                       │    │
│  │ 5 วิธีดูแลสุขภาพหัวใจ             │    │
│  │ 5 Ways to Heart Health            │    │
│  │ 👁️ 1,234 views • 15 Feb 2026     │    │
│  │ 🏷️ สุขภาพ, หัวใจ                  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 📷 [Image]                       │    │
│  │ เบาหวาน: สิ่งที่ควรรู้             │    │
│  │ Diabetes: What You Should Know    │    │
│  │ 👁️ 987 views • 12 Feb 2026       │    │
│  │ 🏷️ โรค, เบาหวาน                   │    │
│  └──────────────────────────────────┘    │
│                                          │
│  [Load More / โหลดเพิ่ม]                 │
└──────────────────────────────────────────┘
```

### 2.3 Screen: Article Detail

```text
┌──────────────────────────────────────────┐
│  ← Back                     [🔖] [↗️]    │
│                                          │
│  📷 [Hero Image - Full Width]            │
│                                          │
│  5 วิธีดูแลสุขภาพหัวใจ                    │
│  5 Ways to Heart Health                  │
│                                          │
│  ✍️ โดย นพ.สมชาย แพทย์ดี                 │
│  📅 15 Feb 2026 • ⏱️ 5 min read          │
│  👁️ 1,234 views                          │
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│  [Rich text article content]             │
│  - Headers, paragraphs                   │
│  - Inline images                         │
│  - Bullet lists                          │
│  - Bold, italic text                     │
│  - Links                                 │
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│  🏷️ Tags: สุขภาพ, หัวใจ, ออกกำลังกาย     │
│                                          │
│  ── Related Articles ─────────────────── │
│  [Card 1] [Card 2] [Card 3]             │
│                                          │
│  ── ⚠️ Disclaimer ──────────────────── │
│  "เนื้อหานี้เป็นข้อมูลเพื่อการศึกษาเท่านั้น│
│   ไม่ใช่คำแนะนำทางการแพทย์"              │
│                                          │
└──────────────────────────────────────────┘

Actions:
  🔖 Bookmark → Save for offline reading (SQLite cache)
  ↗️ Share → Native share sheet (iOS/Android)
```

### 2.4 Offline Reading

```text
Bookmark Action:
│
├── Save article HTML/markdown to SQLite
├── Download images to file system cache
├── Mark as "available_offline = true"
├── Show in "Bookmarks" section on Health Library screen
│
└── When offline:
    ├── Show cached articles normally
    ├── Hide articles not cached (or show grayed out)
    └── Show "Offline Mode" banner
```

---

## 3. Doctor — Content Management

### 3.1 Navigation

`(doctor)/content/` — multiple sub-pages:
- `library` — Clinical Resources (guidelines, protocols)
- `medical-content` — Health Education Content (articles for patients)
- `consultants` — Medical Consultants Directory

### 3.2 Screen: Clinical Resources

Clinical guidelines, treatment protocols, research papers — for doctor reference only.

```text
┌──────────────────────────────────────────┐
│  📖 แหล่งข้อมูลทางคลินิก                   │
│     Clinical Resources                    │
│                                          │
│  🔍 [Search...] [📝 Create New]          │
│                                          │
│  Filter: [All] [Guidelines] [Protocols]  │
│          [Research] [Drug Info]           │
│                                          │
│  Sort: [Latest] [Most Viewed] [My Posts] │
│                                          │
│  ── Guidelines ──────────────────────── │
│                                          │
│  📋 แนวทางการรักษาเบาหวาน Type 2         │
│     Diabetes Type 2 Treatment Guideline  │
│     By: นพ.สมชาย • Approved ✅           │
│     Updated: 10 Feb 2026                 │
│     [View] [Edit] [Share]                │
│                                          │
│  📋 Protocol: การดูแลผู้ป่วย COVID-19      │
│     COVID-19 Patient Care Protocol       │
│     By: พญ.สมศรี • Pending Review ⏳     │
│     Created: 8 Feb 2026                  │
│     [View] [Edit]                        │
│                                          │
└──────────────────────────────────────────┘
```

### 3.3 Screen: Create/Edit Content

```text
┌──────────────────────────────────────────┐
│  ← Back            [Save Draft] [Submit] │
│                                          │
│  📝 Create Clinical Resource             │
│                                          │
│  Title (TH):                             │
│  [แนวทางการรักษา...___________________]  │
│                                          │
│  Title (EN):                             │
│  [Treatment Guideline for...__________]  │
│                                          │
│  Category:                               │
│  [Guideline ▼]                           │
│                                          │
│  Tags:                                   │
│  [เบาหวาน] [×] [ต่อมไร้ท่อ] [×] [+Add]  │
│                                          │
│  Cover Image:                            │
│  [📷 Upload from Camera/Gallery]         │
│                                          │
│  Content:                                │
│  ┌────────────────────────────────────┐  │
│  │ [B] [I] [H1] [H2] [•] [🔗] [📷]  │  │
│  │                                    │  │
│  │ Rich text editor area...           │  │
│  │ • Markdown support                 │  │
│  │ • Image insertion                  │  │
│  │ • Tables                           │  │
│  │ • Code blocks (for medical codes)  │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Attachments:                            │
│  [📎 Add PDF/Document]                   │
│                                          │
│  ─────────────────────────────────────── │
│  [Save Draft]  [Submit for Review]       │
└──────────────────────────────────────────┘
```

### 3.4 Content Approval Workflow

```text
Doctor creates content
       │
       ▼
  ┌──────────┐
  │  DRAFT   │  ← Doctor can edit, preview, delete
  └────┬─────┘
       │ Submit for Review
       ▼
  ┌──────────┐
  │ PENDING  │  ← Waiting admin review
  │  REVIEW  │     Push notification → Admin
  └────┬─────┘
       │
   ┌───┴───────────┐
   ▼               ▼
┌──────────┐  ┌──────────┐
│ APPROVED │  │ REJECTED │
│    ✅     │  │    ❌     │
└────┬─────┘  └────┬─────┘
     │              │
     │              │ Notification + reason
     ▼              ▼
 Published      Doctor can edit
 to all         and resubmit
 users

Admin actions (admin/content-moderation):
  • View pending content
  • Preview article
  • Approve → publishes to all users
  • Reject → sends reason to author
  • Request Changes → feedback without rejection
```

---

## 4. Doctor — Medical Content (Patient-Facing)

Health education articles created by doctors for patients (published to Patient Health Library).

### 4.1 Screen: Medical Content List

```text
┌──────────────────────────────────────────┐
│  📝 Medical Content (Patient Articles)    │
│                                          │
│  My Articles:                            │
│  [All] [Published] [Pending] [Draft]     │
│                                          │
│  ✅ 5 วิธีดูแลสุขภาพหัวใจ                │
│     Published • 1,234 views              │
│     [View] [Edit] [Unpublish]            │
│                                          │
│  ⏳ เบาหวาน: สิ่งที่ควรรู้                │
│     Pending Review since 13 Feb          │
│     [View] [Edit] [Withdraw]             │
│                                          │
│  📝 ความดันโลหิตสูง (Draft)               │
│     Last edited: 14 Feb 2026             │
│     [Edit] [Delete] [Submit]             │
│                                          │
│  ─────────────────────────────────────── │
│  [📝 Create New Article]                 │
└──────────────────────────────────────────┘
```

### 4.2 Workflow

Same approval workflow as Clinical Resources. After admin approves:
- Article appears in Patient Health Library
- Push notification to patients who follow the category (optional)
- Author shows as the doctor (builds reputation)

---

## 5. Doctor — Medical Consultants Directory

### 5.1 Screen: Consultants List

```text
┌──────────────────────────────────────────┐
│  👥 Medical Consultants                   │
│     ที่ปรึกษาทางการแพทย์                   │
│                                          │
│  🔍 [Search by name or specialty...]     │
│                                          │
│  Filter: [All Specialties ▼]             │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 🧑‍⚕️ รศ.นพ.สมบัติ ผู้เชี่ยวชาญ       │    │
│  │ Specialty: Cardiology             │    │
│  │ Hospital: Bumrungrad              │    │
│  │ ⭐ 4.8 (45 ratings)               │    │
│  │ 📞 Available for Referral         │    │
│  │ [View Profile] [Refer Patient]    │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ 🧑‍⚕️ ผศ.พญ.สมใจ รักษาดี           │    │
│  │ Specialty: Dermatology            │    │
│  │ Hospital: Siriraj                 │    │
│  │ ⭐ 4.9 (32 ratings)               │    │
│  │ 📞 Available for Referral         │    │
│  │ [View Profile] [Refer Patient]    │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ── Admin Only ──                        │
│  [+ Add Consultant] (Admin role only)    │
└──────────────────────────────────────────┘
```

### 5.2 Consultant Profile Detail

```text
┌──────────────────────────────────────────┐
│  ← Back                                  │
│                                          │
│  🧑‍⚕️ [Photo]                              │
│  รศ.นพ.สมบัติ ผู้เชี่ยวชาญ                 │
│  Assoc.Prof. Sombat Phuchuaychan          │
│                                          │
│  ── Info ──                              │
│  Specialty: Cardiology (โรคหัวใจ)         │
│  Sub-specialty: Interventional Cardiology │
│  Hospital: Bumrungrad International      │
│  License: ว.12345                        │
│  Experience: 15 years                    │
│  Languages: Thai, English                │
│                                          │
│  ── Contact ──                           │
│  📧 dr.sombat@hospital.com              │
│  📞 02-xxx-xxxx ext. 1234               │
│                                          │
│  ── Rating ──                            │
│  ⭐ 4.8 / 5.0 (45 ratings)              │
│  "Extremely knowledgeable" • Dr. A       │
│  "Quick response to referrals" • Dr. B   │
│                                          │
│  ── Actions ──                           │
│  [📋 Refer Patient] [📞 Contact]         │
│  [⭐ Rate Consultant]                    │
└──────────────────────────────────────────┘
```

---

## 6. API Endpoints

### 6.1 Health Library (Patient + Doctor)

| Method | Endpoint | Description | Auth |
| -------- | ---------- | ------------- | ------ |
| `GET` | `/api/content/articles` | List published articles | JWT (optional) |
| `GET` | `/api/content/articles/:id` | Get article detail | JWT (optional) |
| `GET` | `/api/content/categories` | List categories | Public |
| `GET` | `/api/content/articles/:id/related` | Get related articles | JWT |
| `POST` | `/api/content/articles/:id/bookmark` | Bookmark article | JWT |
| `DELETE` | `/api/content/articles/:id/bookmark` | Remove bookmark | JWT |
| `GET` | `/api/content/bookmarks` | List bookmarked articles | JWT |

### 6.2 Content Management (Doctor)

| Method | Endpoint | Description | Auth |
| -------- | ---------- | ------------- | ------ |
| `POST` | `/api/content/articles` | Create draft article | Doctor JWT |
| `PUT` | `/api/content/articles/:id` | Update article | Doctor JWT (author) |
| `DELETE` | `/api/content/articles/:id` | Delete draft | Doctor JWT (author) |
| `POST` | `/api/content/articles/:id/submit` | Submit for review | Doctor JWT |
| `POST` | `/api/content/articles/:id/withdraw` | Withdraw submission | Doctor JWT |
| `GET` | `/api/content/my-articles` | List doctor's own articles | Doctor JWT |

### 6.3 Clinical Resources (Doctor)

| Method | Endpoint | Description | Auth |
| -------- | ---------- | ------------- | ------ |
| `GET` | `/api/clinical-resources` | List resources | Doctor JWT |
| `GET` | `/api/clinical-resources/:id` | Get resource detail | Doctor JWT |
| `POST` | `/api/clinical-resources` | Create resource | Doctor JWT |
| `PUT` | `/api/clinical-resources/:id` | Update resource | Doctor JWT |
| `DELETE` | `/api/clinical-resources/:id` | Delete draft | Doctor JWT |
| `POST` | `/api/clinical-resources/:id/submit` | Submit for review | Doctor JWT |

### 6.4 Content Approval (Admin)

| Method | Endpoint | Description | Auth |
| -------- | ---------- | ------------- | ------ |
| `GET` | `/api/admin/content/pending` | List pending content | Admin JWT |
| `POST` | `/api/admin/content/:id/approve` | Approve content | Admin JWT |
| `POST` | `/api/admin/content/:id/reject` | Reject with reason | Admin JWT |

### 6.5 Medical Consultants (Doctor)

| Method | Endpoint | Description | Auth |
| -------- | ---------- | ------------- | ------ |
| `GET` | `/api/consultants` | List consultants | Doctor JWT |
| `GET` | `/api/consultants/:id` | Get consultant detail | Doctor JWT |
| `POST` | `/api/consultants` | Add consultant (Admin) | Admin JWT |
| `PUT` | `/api/consultants/:id` | Update consultant (Admin) | Admin JWT |
| `DELETE` | `/api/consultants/:id` | Remove consultant (Admin) | Admin JWT |
| `POST` | `/api/consultants/:id/rate` | Rate consultant | Doctor JWT |
| `POST` | `/api/consultants/:id/refer` | Refer patient | Doctor JWT |

---

## 7. Related Documents

| Document | Relationship |
| ---------- | ------------- |
| Webapp: [Clinical_Resources_&_Medical_Library_Workflows.md](../Clinical_Resources_&_Medical_Library_Workflows.md) | Existing web workflows |
| Webapp: [Medicine_Content_Processes.md](../Medicine_Content_Processes.md) | Medicine content web processes |
| [11_Mobile_App_Description.md](11_Mobile_App_Description.md) | Feature matrix reference |

---

### End of Mobile Content Library & Medical Resources Workflows — February 2026
