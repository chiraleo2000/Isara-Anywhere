# 📚 Doctor Portal — Medical Content Page

**Route:** `/medical-content`
**Component:** `src/pages/MedicalContent.tsx`
**Access:** 🔒 Doctor (create + edit own) / Admin (approve + full CRUD)
**Thai Title:** เนื้อหาทางการแพทย์ / Medical Content

---


## 1. Purpose

Create, manage, and publish health education content for patients. Thai-first bilingual content with admin approval workflow. Published content visible to patients in Health Knowledge Library.

---


## 2. Content Workflow

```text
Draft → Submit for Review → Pending → Approved (Published) → Visible to Patients
                                   └→ Rejected → Back to Draft
Edit Published Content → Re-triggers approval
```

---


## 3. Features by Role

| Feature | Doctor | Admin |
| ------- | ------ | ----- |
| Create content | ✅ | ✅ |
| Edit own content | ✅ | ✅ |
| Delete own content | ✅ | ✅ |
| Submit for approval | ✅ | ✅ |
| Approve/reject | ❌ | ✅ |
| View pending queue | ❌ | ✅ |
| Featured content | ❌ | ✅ (set) |

---


## 4. Content Fields (Bilingual)

| Field | Thai (Primary*) | English (Optional) |
| ----- | --------------- | ------------------ |
| Title | หัวข้อ* | Title |
| Summary | สรุป* | Summary |
| Content | เนื้อหา* | Content |
| Category | หมวดหมู่ | — |
| Tags | แท็ก | — |
| Type | article/video/guide/infographic | — |
| Image | Inline `[image:URL:description]` | — |

---


## 5. Content Types

| Type | Thai | Description |
| ---- | ---- | ----------- |
| article | บทความ | Written health article |
| video | วิดีโอ | Video content (YouTube/native) |
| guide | คู่มือ | Step-by-step guide |
| infographic | อินโฟกราฟิก | Visual health information |

---


## 6. Workflow

See [Medicine_Content_Processes.md](../../Processes/Medicine_Content_Processes.md) for complete workflow details.

---


## 7. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/content/medical` | List all content |
| POST | `/api/content/medical` | Create content |
| PUT | `/api/content/medical/:id` | Update content |
| DELETE | `/api/content/medical/:id` | Delete content |
| POST | `/api/content/medical/:id/review` | Approve/reject |
| GET | `/api/content/tags/medical` | Get tags |
| POST | `/api/content/tags/medical` | Create tags |

---


## 8. AI Agent Improvement Opportunities


- **Content generation**: AI draft health articles from medical topics


- **Translation**: AI auto-translate between Thai and English


- **Quality scoring**: AI rate content readability and accuracy


- **SEO optimization**: AI improve content discoverability


- **Image generation**: AI create medical illustrations

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| medical_content | SELECT/INSERT/UPDATE | Health articles CRUD with status workflow |
| knowledge_base | INSERT/SELECT | AI indexing of content for RAG retrieval |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/content/articles | GET | SELECT medical_content |
| POST /api/content/articles | POST | INSERT medical_content; INSERT knowledge_base |
| PUT /api/content/articles/:id | PUT | UPDATE medical_content WHERE id |
| POST /api/content/:id/review | POST | UPDATE medical_content SET status WHERE id |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
