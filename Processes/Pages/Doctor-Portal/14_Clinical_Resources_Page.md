# 📋 Doctor Portal — Clinical Resources Page

**Route:** `/clinical-resources`
**Component:** `src/pages/ClinicalResources.tsx`
**Access:** 🔒 Doctor (create + edit own) / Admin (approve + full CRUD)
**Thai Title:** ทรัพยากรทางคลินิก / Clinical Resources

---


## 1. Purpose

Medical guidelines, protocols, and research papers for healthcare professionals. Same approval workflow as Medical Content but targeted at clinical staff rather than patients. Integrated with AI RAG knowledge base.

---


## 2. Resource Types

| Type | Thai | Description |
| ---- | ---- | ----------- |
| guideline | แนวทาง | Clinical practice guidelines |
| protocol | โปรโตคอล | Treatment protocols |
| research | งานวิจัย | Research papers |
| template | แม่แบบ | Clinical templates |
| reference | เอกสารอ้างอิง | Reference materials |


---


## 3. Categories (Fixed)

| ID | Thai | English |
| -- | ---- | ------- |
| diagnosis | แนวทางการวินิจฉัย | Diagnosis Guidelines |
| treatment | แนวทางการรักษา | Treatment Protocols |
| pharmacology | เภสัชวิทยา | Pharmacology |
| radiology | รังสีวิทยา | Radiology |
| laboratory | ห้องปฏิบัติการ | Laboratory |
| pathology | พยาธิวิทยา | Pathology |
| emergency | เวชศาสตร์ฉุกเฉิน | Emergency Medicine |
| nursing | แนวทางการพยาบาล | Nursing Guidelines |
| research | งานวิจัย | Research Papers |
| case-studies | กรณีศึกษา | Case Studies |


---


## 4. AI Integration

| Feature | Description |
| ------- | ----------- |
| RAG Knowledge Base | Clinical resources indexed for AI search |
| AI Chat Assistant | Doctors query guidelines via chat |
| Document Analysis | AI analyze uploaded PDF guidelines |


---


## 5. Content Workflow

Same as Medical Content: Draft → Submit → Pending → Approved/Rejected

See [Clinical_Resources_&_Medical_Library_Workflows.md](../../Processes/Clinical_Resources_&_Medical_Library_Workflows.md).

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/content/clinical` | List resources |
| POST | `/api/content/clinical` | Create resource |
| PUT | `/api/content/clinical/:id` | Update resource |
| DELETE | `/api/content/clinical/:id` | Delete resource |
| POST | `/api/content/clinical/:id/review` | Approve/reject |
| GET | `/api/content/tags/clinical` | Get tags |


---


## 7. AI Agent Improvement Opportunities


- **Guideline updates**: AI monitor and notify when guidelines are updated

- **Evidence grading**: AI classify evidence levels automatically

- **Quick reference**: AI generate quick-reference cards from full guidelines

- **Conflict detection**: AI detect conflicting recommendations across guidelines

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| clinical_resources | CRUD | Clinical guidelines and protocol management |
| knowledge_base | INSERT / SELECT | RAG indexing for AI-powered clinical search |



### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/content/clinical | GET | SELECT clinical_resources |
| POST /api/content/clinical | POST | INSERT clinical_resources; INSERT knowledge_base |
| PUT /api/content/clinical/:id | PUT | UPDATE clinical_resources WHERE id |
| POST /api/content/clinical/:id/review | POST | UPDATE clinical_resources SET status WHERE id |



### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
