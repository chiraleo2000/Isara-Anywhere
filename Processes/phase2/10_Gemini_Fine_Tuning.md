# 🧠 Gemini Fine-Tuning Plan — Izara Dr. Anywhere

**Version:** 2.0.0  
**Date:** February 2026  
**Model Base:** Gemini 2.0 Flash (via Vertex AI)

---

## 1. Fine-Tuning Objectives

### 1.1 Why Fine-Tune?

| Problem | Solution |
|---------|----------|
| Generic Gemini lacks Thai medical terminology | Fine-tune on Thai medical corpus |
| Drug names in Thai script not recognized well | Train on Thai drug database (FDA) |
| ICD-10 mapping inaccurate for Thai symptoms | Train on Thai symptom-to-ICD mappings |
| EMR generation not following Thai medical standards | Train on Thai EMR templates |
| Clinical guidelines not Thailand-specific | Train on Thai medical practice guidelines |

### 1.2 Target Improvements

| Metric | Current (Base) | Target (Fine-tuned) |
|--------|:--------------:|:-------------------:|
| Thai medical term accuracy | ~75% | 95%+ |
| Drug name recognition (Thai) | ~60% | 90%+ |
| ICD-10 mapping accuracy | ~70% | 90%+ |
| EMR draft quality score | 3.2/5 | 4.5/5 |
| CDS relevance score | 3.5/5 | 4.5/5 |
| Response latency | ~3s | ~2s |

---

## 2. Training Data Sources

### 2.1 Data Categories

| Category | Source | Size | Format |
|----------|--------|------|--------|
| Thai Medical Terms | Thai Medical Council glossary | ~50,000 terms | Term pairs (TH↔EN) |
| Drug Database | FDA Thailand drug directory | ~30,000 drugs | Structured JSON |
| ICD-10 Thai Mappings | Thai Health Coding Center | ~68,000 codes | Code-description pairs |
| Thai EMR Templates | Hospital EMR samples (anonymized) | ~5,000 records | Structured text |
| Thai Clinical Guidelines | Royal College of Physicians | ~200 guidelines | Document text |
| Patient-Doctor Dialogues | Simulated conversations | ~10,000 dialogues | Conversation format |
| Symptom-Diagnosis Pairs | Medical textbooks + Thai data | ~20,000 pairs | Q&A format |
| Drug Interaction Data | DrugBank + Thai FDA | ~15,000 interactions | Structured JSON |

### 2.2 Data Preparation Pipeline

```
Raw Data Sources
       │
       ▼
┌─────────────────────┐
│ 1. Data Collection   │
│ - Scrape Thai FDA    │
│ - Export ICD-10      │
│ - Anonymize EMRs     │
│ - Translate guides   │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│ 2. Data Cleaning     │
│ - Remove PII         │
│ - Normalize Thai text│
│ - Fix encoding       │
│ - De-duplicate       │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│ 3. Format for Gemini │
│ - JSONL training     │
│   format             │
│ - System prompts     │
│ - Input/Output pairs │
│ - Validation split   │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│ 4. Upload to         │
│ Vertex AI            │
│ Cloud Storage        │
└─────────────────────┘
```

### 2.3 Training Data Format

```jsonl
{"systemInstruction": "คุณเป็นผู้ช่วยแพทย์ AI ที่เชี่ยวชาญด้านการแพทย์ไทย", "contents": [{"role": "user", "parts": [{"text": "อาการปวดหัวข้างเดียว เป็นๆ หายๆ มีคลื่นไส้ร่วม วินิจฉัยอะไรได้บ้าง?"}]}, {"role": "model", "parts": [{"text": "จากอาการที่อธิบาย สามารถวินิจฉัยเบื้องต้นได้ดังนี้:\n\n1. **G43 ไมเกรน (Migraine)** - ความน่าจะเป็นสูง\n   - ปวดข้างเดียว\n   - เป็นๆ หายๆ (episodic)\n   - มีคลื่นไส้ร่วม\n\n2. **G44.0 Cluster headache** - ควรพิจารณา\n   - ถ้ามีอาการน้ำตาไหล หรือจมูกตัน\n\n3. **G44.2 Tension-type headache** - น่าจะเป็นน้อยกว่า\n   - มักปวดทั้ง 2 ข้าง\n\nแนะนำส่งตรวจเพิ่มเติม: ตรวจระบบประสาท, ถ้าอาการรุนแรงควรทำ CT/MRI สมอง"}]}]}
```

---

## 3. Fine-Tuning Process

### 3.1 Vertex AI Tuning Configuration

```python
# fine_tune_gemini.py
from google.cloud import aiplatform

aiplatform.init(
    project="izara-telemedicine",
    location="asia-southeast1",  # Singapore (closest to Thailand)
)

# Create tuning job
tuning_job = aiplatform.SupervisedTuningJob(
    source_model="gemini-2.0-flash-001",
    training_dataset_uri="gs://izara-training-data/medical-thai-v2.jsonl",
    validation_dataset_uri="gs://izara-training-data/medical-thai-v2-val.jsonl",
    
    # Hyperparameters
    epoch_count=5,
    learning_rate_multiplier=0.5,
    adapter_size=4,  # LoRA rank
    
    # Labels
    tuned_model_display_name="izara-medical-thai-v2",
)

tuning_job.run()
```

### 3.2 Tuning Tasks

| Task | Training Examples | Description |
|------|:-----------------:|-------------|
| Thai Medical Chat | 10,000 | Patient symptom conversations in Thai |
| Symptom-to-ICD | 20,000 | Map Thai symptoms to ICD-10 codes |
| EMR Generation | 5,000 | Generate Thai EMR from meeting transcripts |
| Drug Information | 15,000 | Thai drug names, dosages, interactions |
| CDS Alerts | 8,000 | Clinical decision support in Thai context |
| Patient Instructions | 3,000 | Generate Thai patient instructions |
| Medical Translation | 10,000 | EN↔TH medical term translation |

### 3.3 Evaluation Metrics

```python
# Evaluation script
from sklearn.metrics import classification_report
from rouge_score import rouge_scorer

def evaluate_model(model, test_data):
    results = {
        'icd10_accuracy': [],
        'emr_rouge_scores': [],
        'drug_recognition': [],
        'response_latency': [],
    }
    
    for sample in test_data:
        # Time response
        start = time.time()
        prediction = model.predict(sample['input'])
        latency = time.time() - start
        results['response_latency'].append(latency)
        
        # ICD-10 accuracy
        if sample['task'] == 'icd10':
            correct = sample['expected_icd'] in prediction
            results['icd10_accuracy'].append(correct)
        
        # EMR quality (ROUGE score)
        if sample['task'] == 'emr':
            scorer = rouge_scorer.RougeScorer(['rouge1', 'rougeL'])
            scores = scorer.score(sample['expected'], prediction)
            results['emr_rouge_scores'].append(scores['rougeL'].fmeasure)
    
    return {
        'icd10_accuracy': np.mean(results['icd10_accuracy']),
        'emr_rouge_l': np.mean(results['emr_rouge_scores']),
        'avg_latency': np.mean(results['response_latency']),
    }
```

---

## 4. RAG Enhancement (pgvector)

### 4.1 Current RAG Architecture

```
User Query (Thai)
       │
       ▼
┌─────────────────────┐
│ 1. Generate Embedding│
│ (text-embedding-004) │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│ 2. Vector Search     │
│ pgvector             │
│                      │
│ SELECT * FROM        │
│ medical_knowledge    │
│ ORDER BY embedding   │
│ <=> $1               │
│ LIMIT 5              │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│ 3. Augmented Prompt  │
│                      │
│ System: You are...   │
│ Context: [retrieved  │
│   medical knowledge] │
│ User: [original Q]   │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│ 4. Gemini Fine-tuned │
│ Model generates      │
│ response             │
└─────────────────────┘
```

### 4.2 Phase 2 RAG Improvements

| Improvement | Description |
|-------------|-------------|
| Hybrid Search | Combine vector + keyword search for Thai text |
| Reranking | Rerank retrieved chunks with cross-encoder |
| Chunk Optimization | Optimize chunk size for Thai text (2000 chars) |
| Medical Ontology | Add medical concept relationships |
| Multi-modal RAG | Support image + text queries |
| Context Window | Expand to full patient context |

### 4.3 Enhanced Knowledge Base Schema

```sql
-- Medical knowledge base with Thai content
CREATE TABLE medical_knowledge (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,     -- 'drug' | 'disease' | 'guideline' | 'procedure'
  title TEXT NOT NULL,
  title_th TEXT,                      -- Thai title
  content TEXT NOT NULL,
  content_th TEXT,                    -- Thai content
  icd10_codes TEXT[],                 -- Related ICD-10 codes
  drug_codes TEXT[],                  -- Related drug codes
  source VARCHAR(255),               -- Source reference
  embedding vector(768),             -- text-embedding-004 (768 dim)
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Optimized indexes
CREATE INDEX idx_knowledge_embedding ON medical_knowledge 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_knowledge_category ON medical_knowledge(category);
CREATE INDEX idx_knowledge_icd10 ON medical_knowledge USING GIN (icd10_codes);

-- Thai full-text search (for hybrid search)
CREATE INDEX idx_knowledge_thai_fts ON medical_knowledge 
  USING GIN (to_tsvector('simple', content_th));
```

---

## 5. Deployment & Monitoring

### 5.1 Model Versioning

```
izara-medical-thai-v1  → Phase 1 (base Gemini, no fine-tuning)
izara-medical-thai-v2  → Phase 2 Sprint 5 (first fine-tune)
izara-medical-thai-v3  → Phase 2.2 (second iteration with more data)
```

### 5.2 A/B Testing

```typescript
// Gradually roll out fine-tuned model
const MODEL_CONFIG = {
  // 80% fine-tuned, 20% base (for comparison)
  model_weights: {
    'izara-medical-thai-v2': 0.8,
    'gemini-2.0-flash': 0.2,
  },
  
  // Track which model was used for each request
  log_model_selection: true,
  
  // Auto-fallback to base if fine-tuned model errors
  fallback_model: 'gemini-2.0-flash',
};
```

### 5.3 Monitoring Dashboard

| Metric | Alert Threshold | Check Interval |
|--------|:--------------:|:--------------:|
| Response latency (p95) | > 5s | 1 minute |
| Error rate | > 2% | 1 minute |
| ICD-10 accuracy (sampled) | < 85% | Daily |
| User satisfaction rating | < 4.0/5 | Weekly |
| Token usage / cost | > $500/day | Hourly |
| Thai language detection fail | > 5% | Daily |

---

## 6. Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| 6.1 Data Collection | Collect & clean training data | Weeks 1-4 |
| 6.2 Data Preparation | Format JSONL, create validation set | Weeks 5-6 |
| 6.3 Initial Fine-tune | First training run, evaluate | Weeks 7-8 |
| 6.4 Iteration | Improve based on evaluation | Weeks 9-12 |
| 6.5 RAG Enhancement | Update knowledge base, hybrid search | Weeks 13-16 |
| 6.6 A/B Testing | Deploy 20% traffic, measure | Weeks 17-20 |
| 6.7 Full Rollout | 100% traffic on fine-tuned model | Week 21+ |

---

## 7. Cost Estimation

| Item | Monthly Cost (Est.) |
|------|:------------------:|
| Fine-tuning compute (Vertex AI) | $200-500 (one-time per tune) |
| Gemini API calls (fine-tuned) | $300-800 |
| Embedding generation | $50-100 |
| Cloud Storage (training data) | $10-20 |
| pgvector hosting (included in DB) | $0 (existing) |
| **Total Monthly** | **$360-920** |

---

### End of Gemini Fine-Tuning Plan — February 2026
