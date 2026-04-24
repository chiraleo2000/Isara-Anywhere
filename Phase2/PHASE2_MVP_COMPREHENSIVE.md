# 🏥 Izara: Your Doctor Anywhere — Phase 2 MVP Comprehensive Plan

**Version:** 2.2.0
**Date:** February 19, 2026
**Codename:** AI Doctor Anywhere (หมอ AI ทุกที่)
**Platform:** React Native (Expo) — iOS & Android + Web Portal Enhancements
**Architecture:** AI-Based HIS + Unified Mobile App with Role Selection

---


## Executive Summary

Phase 2 transforms Izara from a telemedicine platform (Phase 1) into a **complete AI-Based HIS (Health Information System)** that transcends traditional HIS. The application serves as a central hub for healthcare delivery — from community health centers (รพ.สต.) to franchise clinic networks, elderly care facilities, and hospital OPDs — powered by 4 foundational pillars:


### The 4 Pillars

1. **Smart Data Architecture (The Foundation)**
   - **FHIR Standard:** HL7 FHIR as the core data format for seamless interoperability between systems and applications
   - **Vector Database:** pgvector for unstructured medical records enabling RAG (Retrieval-Augmented Generation) — AI answers from patient history with precision
   - Data must not just be "storable" but "machine-readable" and "AI-ready"

2. **AI Integration Layers (The Intelligence)**
   - **Medical Scribe (NLP):** Automatic conversion of doctor-patient conversations into structured Clinical Notes
   - **Predictive Analytics:** Readmission risk, complication forecasting, Early Warning Scores
   - **Clinical Decision Support (CDS):** Deep cross-reaction drug checking, allergy validation, treatment recommendations

3. **Modern Healthcare UI/UX (The Experience)**
   - **Role-Based Dashboards:** Doctors see data visualizations summarizing critical symptoms; patients see simple, actionable interfaces
   - **Edge Computing (IoT):** Wearable connectivity (Apple Health, Google Fit) for real-time data without hospital visits
   - **Thai Traditional Medicine (CTM):** Dedicated interfaces for สมุฏฐานวินิจฉัย and herbal prescriptions

4. **Security & Compliance (Non-negotiable)**
   - **PDPA & HIPAA Compliance:** Encryption at rest & in transit, strict RBAC
   - **Immutable Audit Logs:** Blockchain-hashed access records for transparency
   - **Consent Management:** Granular e-Consent per data type, PDPA-compliant sharing


### Target User Groups

| Group | Thai | Description |
| ------- | ------ | ------------- |
| **General Clinics** | คลินิกเวชกรรม | Franchise clinic network |
| **CTM Clinics** | คลินิกแพทย์แผนไทยประยุกต์ | Contemporary Thai Medicine clinics |
| **Elderly Care** | ศูนย์ดูแลผู้สูงอายุ | Retirement Homes / Home Care / Nursing facilities |
| **Health Centers** | รพ.สต. | Sub-district Health Promoting Hospitals |
| **Hospital OPD** | แผนกผู้ป่วยนอก | Outpatient departments at all hospital levels |




### Clinical Task Workflow (Task 1–5)

```text
Task 1: Patient & Family
  ├── Self-entered Data (diet, sleep, exercise, supplements)
  ├── Wearable Data (BP, HR, glucose, steps) → FHIR Observations
  ├── AI History Taking (CC/PI via chat/voice → SOAP format)
  ├── e-Living Will & PDPA Consent
  └── Patient Check-in & Queue Display

Task 2: Healthcare Team
  ├── Executive Health Dashboard (AI Insights + Timelines)
  ├── Nursing Dashboard (Vital grid, MAR, pre-screening alerts)
  ├── CTM Dashboard (ธาตุเจ้าเรือน, สมุฏฐานวินิจฉัย)
  ├── Geriatric Screening (ADL, fall risk, nutrition)
  ├── Predictive Analytics (readmission, Sarcopenia, Alzheimer's)
  └── Consult / Conference / AI Meeting Scribe

Task 3: Investigation
  ├── Laboratory Reports (structured with LOINC codes)
  ├── Radiology Reports (X-ray, CT, MRI with PACS link)
  ├── Pathology Reports (specimen → microscopic → diagnosis)
  └── Critical Value Alerts → push to doctor mobile

Task 4: Treatment
  ├── Modern Prescription (drug interaction AI checks)
  ├── Herbal Prescription - CTM (ยาสมุนไพร with preparation instructions)
  ├── Medical Procedures (นวดประคบ, หัตถการ)
  ├── Follow-up Tracking (recovery scoring, care team alerts)
  └── Medication Reminders (push notifications to patient)

Task 5: Refer & Data Exchange
  ├── Automated Referral Report (PDF with full medical record)
  ├── FHIR-based HIE (HL7 data exchange between facilities)
  ├── API Protocol for รพ.สต. (REST API sync)
  ├── SOS Emergency Call (real-time alert to Nursing Dashboard)
  └── Clinic Network Management (admin dashboard)
```

---


## 1. Clinical Task Workflow (Task 1–5)


### Task 1: Patient & Family — Data Input & AI History Taking

| Feature | Description | Status |
| --------- | ------------- | -------- |
| **AI History Taking** | Automated CC/PI collection via chat/voice using OPQRST methodology | New |
| **Self-entered Data** | Daily health logs: diet, sleep, exercise, smoking/alcohol, supplements | New |
| **Wearable Integration** | Real-time sync from Apple Health/Google Fit (BP, HR, glucose, steps) | New |
| **FHIR Observation** | Vital signs stored as FHIR Observation Resources with LOINC codes | New |
| **e-Living Will** | Digital advance directives with electronic signatures | Existing |
| **PDPA Consent** | Granular data sharing consent management | Existing |
| **Patient Check-in** | Queue number display, self-check vital signs at screening | New |




### Task 2: Healthcare Team — AI Dashboard & Consultation

| Feature | Description | Status |
| --------- | ------------- | -------- |
| **Executive Health Dashboard** | AI Clinical Insights + Integrated Timelines + Investigation Matrix + One-click Order Entry | New |
| **AI Summary Verification** | Doctor reviews/approves AI-generated Clinical Notes before EMR | Existing |
| **Thai Element Calculator** | Auto-compute ธาตุเจ้าเรือน from birth date for CTM clinics | New |
| **CTM Dashboard** | สมุฏฐานวินิจฉัย, มูลเหตุ, Thai PE, herbal treatment planning | New |
| **Consult/Conference** | Team consultation with AI meeting scribe summaries | Existing |
| **Nursing Dashboard** | Real-time vital grid, AI pre-screening alerts, MAR tracking, ADL monitoring | New |
| **Geriatric Screening** | ADL assessment, fall risk, cognitive screening, nutritional status for elderly care | New |
| **Predictive Analytics** | Readmission prediction, Sarcopenia/Alzheimer risk scoring, Early Warning Score | New |
| **Follow-up Tracking** | Recovery scoring, proactive monitoring, Care Team alerts for Home Care patients | New |
| **Admin Network Dashboard** | Clinic network overview, service monitoring, resource allocation, referral tracking | New |




### Task 3: Investigation — Lab, Radiology, Pathology

| Feature | Description | Status |
| --------- | ------------- | -------- |
| **Laboratory Report** | Structured test items, results, reference ranges, AI interpretation | Enhanced |
| **Radiology Report** | Imaging technique, findings, impression, PACS link | New |
| **Pathology Report** | Specimen details, gross/microscopic description, final diagnosis | New |
| **Critical Value Alerts** | Auto-notify doctor when lab values exceed critical thresholds | New |
| **AI Lab Analysis** | AI-assisted interpretation of lab results with trend analysis | Existing |




### Task 4: Treatment — Prescription & Order Entry

| Feature | Description | Status |
| --------- | ------------- | -------- |
| **Modern Prescription** | Standard medication ordering with drug interaction checks (Cross-reaction AI) | Existing |
| **Herbal Prescription (CTM)** | Thai herbal medicine ordering with preparation instructions (ต้ม/บด/ชง/ทา) | New |
| **Medical Procedure** | Record procedures (Thai massage, herbal compress, acupuncture, etc.) | New |
| **Order Approval Dashboard** | Doctor approves AI-suggested treatment with one-click, modify, or refer | New |
| **Follow-up Tracking** | Post-treatment recovery scoring, proactive monitoring, Care Team alerts | New |
| **Medication Reminders** | Push notification to patients for medication/herbal schedules | New |
| **Automated Medical Record** | AI compiles treatment data into structured EMR for long-term storage | New |




### Task 5: Refer & Data Exchange

| Feature | Description | Status |
| --------- | ------------- | -------- |
| **Automated Refer Report** | AI compiles complete medical record for referral (PDF) | New |
| **FHIR-based HIE** | HL7 FHIR data exchange between Izara and hospital HIS | New |
| **API Protocol (รพ.สต.)** | REST API for syncing with community health centers | New |
| **SOS Emergency Call** | Real-time emergency alert from patient app to Nursing Dashboard | New |



---


## 2. Database Schema — Phase 2 Additions


### 2.1 New Tables for AI-Based HIS

```sql
-- ═══════════════════════════════════════════════════════════
-- FHIR-COMPLIANT OBSERVATION TABLE (Vital Signs / Wearable)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fhir_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT NOT NULL REFERENCES users(id),
    category TEXT NOT NULL DEFAULT 'vital-signs',
    loinc_code TEXT NOT NULL,           -- e.g., '8480-6' for Systolic BP
    display_name TEXT NOT NULL,
    value NUMERIC,
    value_string TEXT,
    unit TEXT,
    reference_range_low NUMERIC,
    reference_range_high NUMERIC,
    interpretation TEXT,                 -- normal, abnormal, critical
    source TEXT DEFAULT 'manual',        -- manual, wearable, device
    device_name TEXT,
    effective_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- CLINICAL IMPRESSION (AI History Taking Summary)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clinical_impressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT NOT NULL REFERENCES users(id),
    encounter_id UUID,
    status TEXT NOT NULL DEFAULT 'in-progress',    -- in-progress, completed
    cc TEXT,                                        -- Chief Complaint
    pi TEXT,                                        -- Present Illness
    ai_summary TEXT,                                -- AI-generated clinical summary
    differential_diagnosis JSONB DEFAULT '[]',
    suggested_investigations JSONB DEFAULT '[]',
    thai_etiology JSONB,                            -- สมุฏฐานวินิจฉัย
    mulahet_analysis JSONB,                         -- มูลเหตุเกิดโรค
    source TEXT DEFAULT 'ai_history_taking',
    doctor_approved BOOLEAN DEFAULT FALSE,
    approved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- THAI TRADITIONAL MEDICINE (CTM) CLINICAL NOTES
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ctm_clinical_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT NOT NULL REFERENCES users(id),
    encounter_id UUID,
    birth_element TEXT,                  -- ธาตุเจ้าเรือน (ดิน, น้ำ, ลม, ไฟ)
    birth_element_detail TEXT,           -- ปฐวี, อาโป, วาโย, เตโช
    current_etiology TEXT,               -- สมุฏฐานปัจจุบัน
    etiology_status TEXT,                -- กำเริบ, หย่อน, พิการ
    mulahet JSONB DEFAULT '[]',          -- มูลเหตุเกิดโรค
    thai_pe JSONB,                       -- Thai Physical Examination
    diagnosis_thai TEXT,                  -- Thai medicine diagnosis
    treatment_plan JSONB,                -- Treatment plan
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- HERBAL PRESCRIPTIONS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS herbal_prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID,
    patient_id TEXT NOT NULL REFERENCES users(id),
    doctor_id TEXT NOT NULL REFERENCES users(id),
    medication_name TEXT NOT NULL,
    medication_type TEXT DEFAULT 'compound', -- single, compound
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    preparation_method TEXT,             -- ต้ม, บด, ชง, ทา
    instruction TEXT,
    warnings TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- INVESTIGATION REPORTS (Radiology, Lab, Pathology)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS investigation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT NOT NULL REFERENCES users(id),
    encounter_id UUID,
    report_type TEXT NOT NULL,            -- 'radiology', 'laboratory', 'pathology'
    -- Radiology fields
    imaging_technique TEXT,
    imaging_body_part TEXT,
    findings TEXT,
    impression TEXT,
    pacs_link TEXT,
    -- Laboratory fields
    test_items JSONB,                     -- [{name, result, unit, reference_range, interpretation}]
    -- Pathology fields
    specimen_source TEXT,
    gross_description TEXT,
    microscopic_description TEXT,
    pathological_diagnosis TEXT,
    -- Common fields
    ai_analysis TEXT,
    ai_flags JSONB,                       -- [{severity, message}]
    reported_by TEXT,
    reported_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',         -- pending, preliminary, final
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- REFERRAL RECORDS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS referral_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT NOT NULL REFERENCES users(id),
    from_facility TEXT NOT NULL,
    to_facility TEXT,
    priority TEXT DEFAULT 'normal',       -- normal, urgent, emergency
    clinical_summary TEXT,
    investigation_summary JSONB,
    treatment_summary JSONB,
    referral_reason TEXT,
    consent_token TEXT,                    -- PDPA consent reference
    pdf_url TEXT,
    fhir_bundle JSONB,                    -- FHIR Bundle for HIE
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════
-- SOS EMERGENCY LOG
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS emergency_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT NOT NULL REFERENCES users(id),
    latitude NUMERIC,
    longitude NUMERIC,
    latest_vitals JSONB,
    severity TEXT DEFAULT 'critical',
    status TEXT DEFAULT 'active',          -- active, acknowledged, resolved
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- QUEUE MANAGEMENT (Enhanced)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS patient_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT NOT NULL REFERENCES users(id),
    queue_number TEXT NOT NULL,
    facility_id TEXT,
    status TEXT DEFAULT 'waiting',         -- waiting, in-progress, completed, no-show
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    called_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    ai_triage_score NUMERIC,
    priority INTEGER DEFAULT 0
);

-- ═══════════════════════════════════════════════════════════
-- WEARABLE CONNECTIONS
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wearable_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL,               -- apple_health, google_fit, samsung_health
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    sync_interval INTEGER DEFAULT 3600,
    last_synced_at TIMESTAMPTZ,
    data_types JSONB DEFAULT '[]',        -- [heart_rate, blood_pressure, steps, ...]
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- SELF-ENTERED HEALTH DATA (Daily Logs)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS daily_health_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT NOT NULL REFERENCES users(id),
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    diet JSONB,                           -- meals, times, descriptions
    sleep_hours NUMERIC,
    sleep_quality TEXT,                    -- good, fair, poor
    exercise TEXT,
    exercise_duration_minutes INTEGER,
    smoking BOOLEAN DEFAULT FALSE,
    alcohol BOOLEAN DEFAULT FALSE,
    supplements JSONB,                     -- [{name, dosage}]
    mood TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- CLINIC NETWORK (Franchise Management)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clinic_network (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_thai TEXT,
    type TEXT NOT NULL,                    -- general_clinic, ctm_clinic, health_center, home_care
    address TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    phone TEXT,
    operating_hours JSONB,
    services JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fhir_obs_patient ON fhir_observations(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_obs_loinc ON fhir_observations(loinc_code);
CREATE INDEX IF NOT EXISTS idx_clinical_impression_patient ON clinical_impressions(patient_id);
CREATE INDEX IF NOT EXISTS idx_ctm_patient ON ctm_clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_investigation_patient ON investigation_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_investigation_type ON investigation_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_referral_patient ON referral_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_patient ON emergency_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON patient_queue(status);
CREATE INDEX IF NOT EXISTS idx_daily_log_patient ON daily_health_logs(patient_id, log_date);
```


### 2.2 Mock Data — 10 Demo Cases

| Case | Name | Type | CC / PI | Treatment |
| ------ | ------ | ------ | --------- | ----------- |
| IZ-001 | นายสมศักดิ์ รักไทย | Geriatric | ปวดเข่าเรื้อรัง | นวดประคบ + ยาเถาวัลย์เปรียง |
| IZ-002 | นางมาลี มีสุข | NCDs | เบาหวาน/ความดัน (BP 150/95) | Lab Glucose + HbA1c + Amlodipine |
| IZ-003 | นายบุญส่ง มั่นคง | CTM | ท้องอืด แน่นท้อง | ธาตุลม + ยาธาตุบรรจบ |
| IZ-004 | นางสมใจ ใฝ่ดี | Home Care | นอนไม่หลับ กระสับกระส่าย | HR monitoring + ยาหอมนวโกฐ |
| IZ-005 | นายวิชัย ใจสู้ | Emergency (SOS) | เวียนศีรษะกะทันหัน | Refer to provincial hospital |
| IZ-006 | น.ส.ฟ้าใส ใจเย็น | General | ปวดศีรษะ Office Syndrome | Paracetamol + massage |
| IZ-007 | นายอำนาจ อาจหาญ | Follow-up | แผลเบาหวานที่เท้า | Wound care + glucose check |
| IZ-008 | นางดวงใจ ได้บุญ | Bedridden | ไอ มีเสมหะ | CXR + ยาแก้ไอน้ำมะขามป้อม |
| IZ-009 | นายเกษม เปรมปรีดิ์ | Anti-aging | Sarcopenia prevention | Supplements + exercise program |
| IZ-010 | นางวิมล คนขยัน | Mental Health | เครียดสะสม ปวดท้ายทอย | Sleep tracking + counseling |



---


## 3. API Endpoints — Phase 2 New Routes


### 3.1 FHIR Observations (Wearable / Vital Signs)

```text
POST   /api/v1/fhir/observations          — Create FHIR observation
GET    /api/v1/fhir/observations/:patientId — Get patient observations
GET    /api/v1/fhir/observations/:patientId/latest — Latest vitals
DELETE /api/v1/fhir/observations/:id       — Delete observation
```


### 3.2 AI History Taking

```text
POST   /api/v1/ai/history-taking           — Start AI history session
POST   /api/v1/ai/history-taking/respond    — Send patient response
GET    /api/v1/ai/history-taking/:sessionId — Get session state
POST   /api/v1/ai/history-taking/complete   — Complete & generate summary
```


### 3.3 Clinical Impressions

```text
POST   /api/v1/clinical-impressions         — Create AI clinical impression
GET    /api/v1/clinical-impressions/:patientId — Get patient impressions
PUT    /api/v1/clinical-impressions/:id/approve — Doctor approves
```


### 3.4 CTM (Thai Traditional Medicine)

```text
POST   /api/v1/ctm/clinical-notes          — Create CTM note
GET    /api/v1/ctm/clinical-notes/:patientId — Get CTM history
POST   /api/v1/ctm/calculate-element       — Calculate ธาตุเจ้าเรือน
GET    /api/v1/ctm/herbal-catalog          — List herbal medicines
POST   /api/v1/ctm/herbal-prescriptions    — Create herbal prescription
GET    /api/v1/ctm/herbal-prescriptions/:patientId — Get prescriptions
PUT    /api/v1/ctm/herbal-prescriptions/:id/approve — Approve prescription
```


### 3.5 Investigation Reports

```text
POST   /api/v1/investigations               — Create investigation report
GET    /api/v1/investigations/:patientId     — Get patient investigations
GET    /api/v1/investigations/:id/report     — Get specific report
PUT    /api/v1/investigations/:id/finalize   — Finalize report
```


### 3.6 Referral

```text
POST   /api/v1/referral/create              — Create referral package
GET    /api/v1/referral/:patientId           — Get patient referrals
GET    /api/v1/referral/:id/pdf              — Generate PDF report
POST   /api/v1/referral/:id/send             — Send to receiving facility
```


### 3.7 Emergency (SOS)

```text
POST   /api/v1/emergency/sos                — Trigger SOS alert
GET    /api/v1/emergency/active              — Get active emergencies
PUT    /api/v1/emergency/:id/acknowledge     — Nurse acknowledges
PUT    /api/v1/emergency/:id/resolve         — Resolve emergency
```


### 3.8 Queue Management

```text
POST   /api/v1/queue/check-in               — Patient check-in
GET    /api/v1/queue/status                  — Get queue status
PUT    /api/v1/queue/:id/call                — Call next patient
PUT    /api/v1/queue/:id/complete            — Complete consultation
GET    /api/v1/queue/analytics               — Queue analytics
```


### 3.9 Daily Health Logs

```text
POST   /api/v1/health-logs                   — Create daily log
GET    /api/v1/health-logs/:patientId        — Get patient logs
GET    /api/v1/health-logs/:patientId/trends  — Get trend analysis
```


### 3.10 Wearable Connections

```text
POST   /api/v1/wearables/connect             — Connect wearable provider
GET    /api/v1/wearables/connections          — List connections
POST   /api/v1/wearables/sync                — Manual sync trigger
DELETE /api/v1/wearables/:id/disconnect       — Disconnect provider
```


### 3.11 Clinic Network

```text
GET    /api/v1/network/clinics               — List network clinics
GET    /api/v1/network/clinics/nearby         — Find nearby clinics
GET    /api/v1/network/analytics              — Network analytics
POST   /api/v1/network/clinics               — Add clinic (admin)
```


### 3.12 HIS Data Exchange (รพ.สต.)

```text
POST   /api/v1/hie/sync-patient-record       — Sync to health center HIS
GET    /api/v1/hie/referral-package/:patientId — Get referral package
POST   /api/v1/hie/receive                    — Receive data from HIS
GET    /api/v1/hie/status                     — Exchange status
```


### 3.13 Geriatric Screening

```text
POST   /api/v1/screening/geriatric            — Create geriatric assessment
GET    /api/v1/screening/geriatric/:patientId  — Get screening history
GET    /api/v1/screening/geriatric/:id/report  — Generate screening report
POST   /api/v1/screening/adl                   — Record ADL (Barthel Index)
POST   /api/v1/screening/fall-risk             — Record fall risk (TUG test)
POST   /api/v1/screening/cognitive             — Record cognitive screen (Mini-Cog)
POST   /api/v1/screening/nutritional           — Record MNA assessment
```


### 3.14 Follow-up Tracking

```text
POST   /api/v1/follow-up/create               — Create follow-up plan
GET    /api/v1/follow-up/:patientId            — Get patient follow-ups
PUT    /api/v1/follow-up/:id/record            — Record follow-up outcome
GET    /api/v1/follow-up/:patientId/recovery   — Get recovery score trends
POST   /api/v1/follow-up/:id/alert             — Trigger care team alert
```


### 3.15 Predictive Analytics

```text
GET    /api/v1/analytics/readmission/:patientId     — Readmission risk score
GET    /api/v1/analytics/sarcopenia/:patientId       — Sarcopenia risk
GET    /api/v1/analytics/complications/:patientId    — Complication forecast
GET    /api/v1/analytics/adherence/:patientId        — Medication adherence %
GET    /api/v1/analytics/element-balance/:patientId  — Thai element trend (CTM)
POST   /api/v1/analytics/early-warning               — Compute Early Warning Score
```


### 3.16 Nursing Dashboard

```text
GET    /api/v1/nursing/patients                — Get all monitored patients
GET    /api/v1/nursing/vitals-grid             — Real-time vitals for all patients
GET    /api/v1/nursing/mar/:patientId          — Medication admin record
POST   /api/v1/nursing/mar/:id/administer      — Record medication given
GET    /api/v1/nursing/alerts                   — Active nursing alerts
PUT    /api/v1/nursing/alerts/:id/acknowledge   — Acknowledge alert
```

---


## 4. AI Prompt Engineering


### 4.1 General Medicine — AI History Taking

```text
System Prompt: "คุณคือผู้ช่วยแพทย์แผนกทั่วไปในแอป Izara ทำหน้าที่ซักประวัติ
แบบ SOAP. เริ่มจากการถาม Chief Complaint (CC) และ Present Illness (PI).
หากพบอาการสำคัญ ให้ซักรายละเอียดตามหลัก OPQRST. เมื่อจบการสนทนา
ให้สรุปข้อมูลเป็น JSON ที่ประกอบด้วย Medical History, Vital Signs
และการวินิจฉัยแยกโรค (Differential Diagnosis)."
```


### 4.2 Thai Traditional Medicine (CTM)

```text
System Prompt: "คุณคือผู้เชี่ยวชาญการคัดกรองในคลินิกแพทย์แผนไทย.
นอกจากซักประวัติทั่วไป ให้เน้นการถามข้อมูลเฉพาะทางตามคัมภีร์ เช่น
สมุฏฐานวินิจฉัย (ธาตุเจ้าเรือน, กาลสมุฏฐาน). ถามเกี่ยวกับพฤติกรรมเสี่ยง
ที่เป็นมูลเหตุเกิดโรค และสรุปข้อมูลเพื่อเชื่อมโยงกับแผนการรักษาทางแผนไทย."
```

---


## 5. Security & Compliance

| Feature | Implementation |
| --------- | --------------- |
| **PDPA Compliance** | Granular consent per data type, right to erasure, data portability |
| **HIPAA Alignment** | AES-256 encryption at rest, TLS 1.3 in transit |
| **RBAC** | Patient, Doctor, Nurse, Admin, CTM Practitioner roles |
| **Audit Logs** | Immutable access logs with blockchain hashing |
| **OAuth 2.0 + JWT** | API authentication with token rotation |
| **Biometric Auth** | Fingerprint/FaceID for mobile app |
| **Consent Microservice** | Separate service for e-Consent status (wearable, AI, sharing, refer) |
| **PHI Encryption** | Radiology images, Lab results encrypted per-access by authorized RBAC role |



---


## 6. Detailed Feature Specifications


### 6.1 Executive Health Dashboard (Task 2 & 4)

The primary decision-making interface for doctors. Designed for rapid comprehension of complex health data:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Executive Health Dashboard — Patient: นายสมศักดิ์ รักไทย (IZ-001)      │
├─────────────────┬──────────────────────┬────────────────────────────────┤
│  LEFT PANEL     │  CENTER PANEL        │  RIGHT PANEL                  │
│                 │                      │                               │
│  Patient Info   │  AI Clinical Brief   │  Treatment Orders             │
│  ┌───────────┐  │  ┌────────────────┐  │  ┌──────────────────────┐     │
│  │ 📷 Avatar │  │  │ CC: ปวดเข่า    │  │  │ [✅ Approve Order]   │     │
│  │ Age: 65   │  │  │ PI: 6 เดือน   │  │  │ [✏️ Modify]          │     │
│  │ ธาตุ: ดิน  │  │  │ AI Dx: OA     │  │  │ [🔄 Refer]           │     │
│  │ BMI: 25.7 │  │  │ Risk: Medium  │  │  │                      │     │
│  └───────────┘  │  └────────────────┘  │  │ Rx: ยาเถาวัลย์เปรียง │     │
│                 │                      │  │ Proc: นวดประคบ       │     │
│  Vital Trends   │  Investigation       │  │ F/U: 2 weeks        │     │
│  ┌───────────┐  │  ┌────────────────┐  │  └──────────────────────┘     │
│  │ BP ↗ 130  │  │  │ 🟢 Lab: OK    │  │                               │
│  │ HR → 72   │  │  │ 🔴 XR: Flag   │  │  Decision Support Flags      │
│  │ Sugar → 95│  │  │ ⬜ Patho: N/A │  │  ⚠️ Drug allergy: None       │
│  └───────────┘  │  └────────────────┘  │  ⚠️ Herb contraindication: ✓ │
├─────────────────┴──────────────────────┴────────────────────────────────┤
│  📋 Health Timeline (Interactive — click any point for details)        │
│  ██─────██────██─────────██─────██─────██────→ Today                   │
│  Visit  Lab   Rx       Visit  XR    Visit                             │
└─────────────────────────────────────────────────────────────────────────┘
```


## Key Interactions:

- **AI Clinical Insights:** Shows CC, PI, differential diagnosis, and สมุฏฐานวินิจฉัย (for CTM patients)

- **Investigation Matrix:** Color-coded flags (🟢 normal, 🟡 borderline, 🔴 critical) — click to expand

- **One-Click Order Entry:** Approve, modify, or refer with pre-populated AI suggestions

- **Holistic View:** Self-entered data (diet, sleep, exercise) visible alongside clinical data


### 6.2 Nursing Dashboard (Elderly Care / Home Care)

Real-time monitoring interface for nursing teams managing multiple patients:

| Component | Description |
| ----------- | ------------- |
| **Vital Sign Grid** | Table view of all patients' BP, HR, RR, Temp, SpO2 — auto-refreshed from wearables |
| **AI Pre-screening Alerts** | AI flags patients at risk → status "Require Consult" immediately |
| **Daily Activity Tracker** | Diet, sleep quality, exercise, supplement intake per patient |
| **MAR (Medication Administration Record)** | Checklist of scheduled medications/herbs with "Given" confirmation |
| **SOS Receiver** | Red alert popup + sound when patient triggers emergency |
| **Recovery Timeline** | Per-patient progress visualization post-treatment |




### 6.3 Geriatric Screening Module

Specialized assessment tools for elderly care facilities:

| Assessment | Tool | Description |
| ------------ | ------ | ------------- |
| **ADL (Activities of Daily Living)** | Barthel Index | Measures self-care ability: feeding, bathing, dressing, mobility |
| **IADL (Instrumental ADL)** | Lawton Scale | Phone use, shopping, cooking, housekeeping, laundry, transport |
| **Fall Risk** | Timed Up & Go (TUG) | Stand from chair, walk 3m, return — AI-assisted scoring |
| **Cognitive Screen** | Mini-Cog / MMSE-Thai | Short cognitive assessment with Thai language adaptation |
| **Nutritional Status** | MNA (Mini Nutritional Assessment) | BMI, weight loss, appetite, psychological stress |
| **Depression Screen** | Thai GDS-15 | Geriatric Depression Scale (15-item Thai version) |
| **Sarcopenia Risk** | SARC-F | Strength, Assistance walking, Rising from chair, Climbing, Falls |
| **Pressure Ulcer Risk** | Braden Scale | Sensory perception, moisture, activity, mobility, nutrition, friction |



```text
Geriatric Screening Workflow:
  Patient arrives → Nurse opens Screening Dashboard
    → System pulls: current vitals (wearable), recent labs, medication list
    → Nurse completes ADL + Fall Risk + Cognitive assessments
    → AI computes composite risk score
    → Flags high-risk patients for doctor review (Task 2)
    → Results stored in EMR + shown on Health Timeline
```


### 6.4 Follow-up Tracking System

Post-treatment monitoring for chronic patients and Home Care:

| Feature | Description |
| --------- | ------------- |
| **Recovery Scoring** | AI calculates recovery % from vitals, behavior data, and symptom reports |
| **Proactive Monitoring** | System analyzes daily self-entered data (diet, sleep, exercise) for treatment response |
| **Care Team Alerts** | If vitals/behavior indicate risk → auto-notify Healthcare Team for immediate Consult |
| **Referral Readiness** | If condition worsens → system pre-generates Referral Report (Task 5) for quick transfer |
| **Scheduled Check-ins** | Push notifications for patient to report symptoms at set intervals |
| **Thai Element Tracking** | For CTM patients — track ธาตุ changes over recovery period |




### 6.5 Predictive Health Analytics

AI-powered long-term health risk analysis:

| Model | Input Data | Output | Use Case |
| ------- | ----------- | -------- | ---------- |
| **Readmission Predictor** | EMR history, vitals trend, medication adherence | Risk % (30-day readmission) | Hospital discharge planning |
| **Sarcopenia Risk** | Weight/BMI trend, grip strength, gait speed | Risk category (Low/Med/High) | Elderly care prevention |
| **Alzheimer's Early Warning** | Cognitive test scores over time, sleep patterns | Trend alert | Geriatric screening |
| **Diabetic Complication** | HbA1c trend, glucose variability, foot exam | Complication risk score | Chronic disease management |
| **Thai Element Imbalance** | Seasonal patterns, lifestyle data, symptom history | Element deviation forecast | CTM preventive care |
| **Medication Adherence** | Refill patterns, self-reported compliance | Adherence % + risk flags | All chronic patients |




### 6.6 CTM Clinical Record System

Complete Thai Traditional Medicine recording interface:

```json
{
  "ctm_clinical_note": {
    "birth_element": "ปฐวี (ดิน)",
    "birth_element_computation": {
      "birth_date": "1961-05-15",
      "birth_month": 5,
      "element_group": "April-June → เตโช (ไฟ)",
      "method": "เดือนเกิดตามจันทรคติ"
    },
    "current_etiology": "วาโย (ลม) กำเริบ",
    "etiology_status": "กำเริบ",
    "mulahet_analysis": [
      "การพักผ่อนไม่เพียงพอ (5 hrs/night)",
      "อาหารแสลง (ทานของทอดบ่อย)",
      "สูบบุหรี่ (10 มวน/วัน)"
    ],
    "thai_pe": {
      "line_examination": "เส้นเอ็นตึง บริเวณน่อง",
      "tongue_examination": "ลิ้นเหลืองซีด",
      "pulse_quality": "เบา เร็ว"
    },
    "treatment": {
      "herbal_med": "ยาหอมนวโกฐ",
      "herbal_type": "compound",
      "preparation": "ชงน้ำอุ่น",
      "procedure": "นวดไทยเพื่อการรักษา (30 นาที)",
      "procedure_area": "บริเวณน่องและหลัง",
      "instruction": "รับประทานเมื่อมีอาการหน้ามืด"
    },
    "follow_up": "นัด 2 สัปดาห์ — ประเมินธาตุซ้ำ"
  }
}
```


### 6.7 SOS Emergency System Architecture

```text
┌──────────────────────┐          ┌──────────────────────┐
│    Patient Mobile     │   SOS    │   Nursing Dashboard   │
│                       │ ──────►  │                       │
│  🆘 SOS Button       │ Socket   │  🚨 Red Alert Popup   │
│  + GPS location       │   .IO    │  + Patient vitals     │
│  + Latest vitals      │          │  + AI medical brief   │
│  + Medical history    │          │  + Location on map    │
│                       │          │                       │
│  Auto-collect:        │          │  Actions:             │
│  • HR from wearable   │          │  • [Acknowledge]      │
│  • BP from last check │          │  • [Dispatch team]    │
│  • Medications list   │          │  • [Prepare Refer]    │
│  • Allergy alerts     │          │  • [Call ambulance]   │
└──────────────────────┘          └──────────────────────┘
                                           │
                                  ┌────────▼────────────┐
                                  │  If beyond capacity: │
                                  │  Auto-generate       │
                                  │  Referral PDF        │
                                  │  (Task 5)            │
                                  └─────────────────────┘
```


### 6.8 HIS Data Exchange Protocol (รพ.สต.)

```text
┌─────────────────────────────────────────────────────────┐
│              Izara ←→ รพ.สต. Integration                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Izara App → POST /api/v1/hie/sync-patient-record       │
│  {                                                      │
│    header: { source: "Izara_Mobile", facility: "รพ.สต." }│
│    patient_info: { name, age, thai_element, BMI }       │
│    clinical_summary: { cc, pi, ai_interpretation }      │
│    current_vitals: { bp, hr, temp, rr }                 │
│    lifestyle: { sleep, diet, exercise, smoking }        │
│    consent: { pdpa_token, living_will_status }          │
│  }                                                      │
│                                                         │
│  Workflow at รพ.สต.:                                     │
│  1. Patient check-in → HIS pulls data from Izara Queue  │
│  2. Doctor opens Dashboard → sees AI summary + Timeline  │
│  3. Prescribes treatment → data saved to EMR + Izara     │
│  4. If refer needed → system creates FHIR Bundle for HIE │
│                                                         │
│  Security: OAuth 2.0 + JWT + AES-256 + PDPA consent     │
└─────────────────────────────────────────────────────────┘
```


### 6.9 Admin Clinic Network Dashboard

| Section | Description |
| --------- | ------------- |
| **Network Overview** | Total facilities: general clinics, CTM clinics, home care units, รพ.สต. |
| **Service Monitoring** | Real-time patient count per facility, queue length, average wait time |
| **Care Center Management** | Add/edit/deactivate facilities, manage operating hours, service types |
| **Referral Tracking** | Track referral status between facilities, success rate, response time |
| **Resource Allocation** | Analyze Lab/X-ray demand per facility for capacity planning |
| **RBAC Management** | Assign roles (Doctor, Nurse, Admin, CTM Practitioner) per facility |
| **Audit Monitor** | Real-time PDPA consent status across network, access log review |
| **System Status** | AI processing health, API connectivity, wearable sync status per site |



---


## 7. Target User Groups

| Group | Thai | Description | Key Features |
| ------- | ------ | ------------- | ------------- |
| **General Clinics** | คลินิกเวชกรรม | Franchise clinic network | AI History Taking, Queue, Prescriptions |
| **CTM Clinics** | คลินิกแพทย์แผนไทยประยุกต์ | Contemporary Thai Medicine | ธาตุเจ้าเรือน, สมุฏฐาน, Herbal Rx |
| **Elderly Care** | ศูนย์ดูแลผู้สูงอายุ | Retirement Home / Home Care / Nursing | Geriatric Screening, Nursing Dashboard, SOS |
| **Health Centers** | รพ.สต. | Sub-district Health Promoting Hospitals | HIS Integration, PHR sync, Referral |
| **Hospital OPD** | แผนกผู้ป่วยนอก | Outpatient departments at all levels | Full EMR, Lab/Radiology/Pathology |



---


## 7. Test Coverage Requirements

The Phase 2 MVP requires additional test specs to cover:

| Spec File | Tests | Coverage Area |
| ----------- | ------- | --------------- |
| 16-phase2-fhir-wearable.spec.ts | ~80 | FHIR Observations, Wearable sync, Daily health logs |
| 17-phase2-ai-history-ctm.spec.ts | ~70 | AI History Taking, CTM, Thai Element calculation |
| 18-phase2-investigation-treatment.spec.ts | ~75 | Lab/Radiology/Pathology reports, Herbal prescriptions |
| 19-phase2-referral-emergency.spec.ts | ~65 | Referral workflow, SOS emergency, Queue management |
| 20-phase2-network-hie-dashboard.spec.ts | ~70 | Clinic network, HIS data exchange, Admin dashboard |



**Target: 1,932+ total tests** (1,572 existing + 360 new)

---


## 8. Technology Stack

| Component | Technology | Purpose |
| ----------- | ----------- | -------- |
| Mobile App | React Native (Expo 52), TypeScript | Unified Patient/Doctor app — iOS & Android |
| Web Portals | React 18, Vite, Tailwind CSS | Phase 1 web portals (unchanged) |
| Backend | Node.js, Express.js | 5 server processes, REST APIs |
| Database | PostgreSQL 18 + pgvector | Primary DB + vector embeddings for RAG |
| AI Engine | Google Gemini 2.5 Flash (+ Fine-tuned) | Medical Thai NLP, CDS, Scribe, Analytics |
| Data Standard | HL7 FHIR R4 | Interoperability & machine-readable records |
| Video | Jitsi Meet (free tier) | Video consultations with lobby control |
| Speech | Web Speech API (free) + Native STT | Real-time transcription (Thai/English) |
| Cloud | Google Cloud Run, GCS, Vertex AI | Deployment, storage, AI training |
| Wearables | Apple Health, Google Fit APIs | Real-time BP, HR, glucose, steps sync |
| Payments | Stripe + PromptPay (Thai QR) | Consultation fee payment |
| Testing | Playwright (E2E), 1,900+ tests | Comprehensive test coverage |
| Security | AES-256, TLS 1.3, OAuth 2.0, JWT | PDPA/HIPAA compliant encryption |


