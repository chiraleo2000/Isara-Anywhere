> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §L`
> **Portal:** Doctor (`Isara-doctor-portal`)
> **Excerpt:** Clinical resources and RAG — edit canonical copy in platform `Processes/`.

## L. Clinical Resources Workflow


### L1. Resource Creation & RAG Integration

**Pages:** `ClinicalResources.tsx`
**API:** `POST /api/clinical-resources`
**Tables:** `clinical_resources`, `knowledge_base`

```text
Process:
1. Doctor creates clinical resource (guideline/protocol/research)
2. INSERT clinical_resources (status: 'pending')
3. Admin approves → status = 'approved'
4. On approval:
   a. Extract text content
   b. Generate embedding via Gemini
   c. INSERT INTO knowledge_base (embedding = vector)
   d. Now searchable via AI RAG chat
```


## Resource Types


- `guideline` — Clinical practice guidelines


- `protocol` — Treatment protocols


- `research` — Research papers


- `template` — Clinical templates


- `reference` — Reference materials

---
