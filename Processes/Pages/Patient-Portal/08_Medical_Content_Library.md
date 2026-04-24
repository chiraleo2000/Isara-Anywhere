# 📚 Patient Portal — Medical Content Library

**Route:** `/health-library`
**Component:** `src/pages/health/MedicalContentLibrary.tsx`
**Access:** 🔒 Authenticated patients
**Thai Title:** คลังความรู้สุขภาพ / Health Knowledge Library

---


## 1. Purpose

Health education library providing medical articles, videos, guides, and infographics written by doctors and approved by admins. Read-only for patients.

---


## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📚 คลังความรู้สุขภาพ (Health Knowledge Library)                     │
│                                                                     │
│  🔍 [Search articles...                                    ]       │
│                                                                     │
│  Categories:                                                        │
│  [ทั้งหมด] [แนะนำ] [สุขภาพทั่วไป] [โรคเรื้อรัง] [สุขภาพจิต]         │
│  [โภชนาการ] [ออกกำลังกาย] [การป้องกัน]                                │
│                                                                     │
│  ⭐ Featured Content:                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🌈 Gradient Featured Card                                  │   │
│  │  "วิธีดูแลสุขภาพหัวใจ"                                       │   │
│  │  โดย นพ. ทดสอบ · 5 นาที · 👁️ 1,234 views                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📄 Content Grid:                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                           │
│  │ 📷 Thumb │ │ 📷 Thumb │ │ 📷 Thumb │                           │
│  │ Title    │ │ Title    │ │ Title    │                           │
│  │ Tags     │ │ Tags     │ │ Tags     │                           │
│  │ 5min·300 │ │ 3min·150 │ │ 8min·500 │                           │
│  │ Author   │ │ Author   │ │ Author   │                           │
│  └──────────┘ └──────────┘ └──────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```


### Article Detail View

```text
┌─────────────────────────────────────────────────────────────────────┐
│  [← กลับ]                                                          │
│                                                                     │
│  🌈 Gradient Header                                                 │
│  📋 Category Badge                                                  │
│  "วิธีดูแลสุขภาพหัวใจ"                                               │
│  โดย นพ. ทดสอบ ระบบ · 21 ม.ค. 2569 · 👁️ 1,234 views              │
│                                                                     │
│  ─────────────────────────────────────────────────────────────     │
│                                                                     │
│  (Article content rendered as markdown)                             │
│  # Heading                                                          │
│  ## Sub-heading                                                     │
│  - List items                                                       │
│  Paragraphs with Thai content                                       │
│                                                                     │
│  🎥 [Embedded Video Player] (if video content)                      │
│                                                                     │
│  Tags: [หัวใจ] [สุขภาพทั่วไป] [การป้องกัน]                           │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. Content Categories

| ID | Thai Name | English Name |
| -- | --------- | ------------ |
| all | ทั้งหมด | All |
| featured | แนะนำ | Featured |
| general-health | สุขภาพทั่วไป | General Health |
| chronic-disease | โรคเรื้อรัง | Chronic Disease |
| mental-health | สุขภาพจิต | Mental Health |
| nutrition | โภชนาการ | Nutrition |
| exercise | ออกกำลังกาย | Exercise |
| preventive-care | การป้องกัน | Preventive Care |



---


## 4. Features & Actions

| Feature | Description |
| ------- | ----------- |
| **Search** | Filter articles by title, content |
| **Category filter** | Quick pill buttons for category selection |
| **Featured section** | Gradient cards for highlighted content |
| **Content grid** | Card-based layout with thumbnails |
| **Article view** | Full markdown rendering with video support |
| **View tracking** | Auto-increment view count on article open |
| **Tag display** | Clickable tags for related content |
| **Video player** | YouTube iframe or HTML5 native video |



---


## 5. Workflows


### Workflow 1: Browse Health Content

```text
Step 1: Navigate to /health-library
Step 2: GET /api/content/medical → loads all published content
Step 3: GET /api/content/tags/medical → loads available tags
Step 4: Browse featured content and article grid
Step 5: Use search bar or category pills to filter
Step 6: Click article card to view full content
```


### Workflow 2: Read Article

```text
Step 1: Click on article card from grid
Step 2: Article detail view opens
Step 3: POST /api/content/medical/:id/view (track view count)
Step 4: Read article with rendered markdown content
Step 5: Watch embedded video if available
Step 6: View related tags
Step 7: Click "Back" to return to list
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/content/medical` | List published health content |
| GET | `/api/content/tags/medical` | Get content tags |
| POST | `/api/content/medical/:id/view` | Track article view |



---


## 7. Content Types

| Type | Description | Icon |
| ---- | ----------- | ---- |
| article | Written health article | 📄 |
| video | Video content (YouTube/native) | 🎥 |
| guide | Step-by-step health guide | 📋 |
| infographic | Visual health information | 📊 |



---


## 8. Connections to Other Pages

| From/To | Direction | Description |
| ------- | --------- | ----------- |
| Dashboard Health Studio | → | Content tab shows articles |
| Doctor Portal Medical Content | ← | Doctors create content here |
| Admin approval | ← | Only approved content visible |



---


## 9. AI Agent Improvement Opportunities


- **Personalized recommendations**: AI suggest articles based on patient's conditions

- **Content summarization**: AI provide quick summaries of long articles

- **Translation**: AI translate articles for multilingual patients

- **Accessibility**: AI read articles aloud for visually impaired

- **Interactive content**: AI-powered quizzes about health topics

- **Related content**: AI suggest related articles based on reading history

---


## PostgreSQL Database Integration


### Tables Used
| Table | Operation | Description |
| ----- | --------- | ----------- |
| medical_content | SELECT | Published health articles (WHERE status='published') |




### API Endpoints
| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/content/articles | GET | SELECT medical_content WHERE status='published' |




### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

