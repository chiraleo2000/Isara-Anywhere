# K. Content Management Workflow (Patient view)

> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §K`
> **Synced:** 2025-06-25
> **Portal:** Patient (`Isara-patient-portal`)
> **Use:** Workflow excerpt — edit canonical copy in platform `Processes/`; refresh via `npm run docs:sync-to-apps`.

---
## K. Content Management Workflow


### K1. Medical Content Creation (Doctor)

**Pages:** `MedicalContent.tsx`
**API:** `POST /api/medical-content`
**Tables:** `medical_content`

```text
Process:
1. Doctor navigates to /medical-content
2. Click "Create New Article"
3. Fill form:
   - Title (Thai required, English optional)
   - Content (Thai required, English optional)
   - Category (from fixed list)
   - Tags
   - Cover image
4. Save as Draft → INSERT medical_content (status: 'draft')
5. Submit for Review → UPDATE status = 'pending'
6. Admin receives notification
```

---


### K2. Content Approval (Admin)

**Pages:** `MedicalContent.tsx` (admin view)
**API:** `PUT /api/medical-content/:id/approve`
**Tables:** `medical_content`, `notifications`

```text
Process:
1. Admin sees pending articles in review queue
2. Read full article content
3. Decision:
   - APPROVE → status = 'published' → visible to patients
   - REJECT → status = 'draft' → notification to author
4. Author notified of decision
```


### K3. Patient Content Consumption (Patient Portal)

**Pages:** `MedicalContentLibrary.tsx`
**API:** `GET /api/content/medical`, `GET /api/content/medical/:id`
**Tables:** `medical_content` (status = published)

```text
Process:
1. Patient browses published articles by category
2. Search and filter bilingual content
3. View article detail; increment view count
```
