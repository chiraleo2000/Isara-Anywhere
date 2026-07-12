# Clinical Document Delivery Workflows

**Version:** 2.5.0  
**Last Updated:** July 10, 2026  
**Status:** Canonical (PostgreSQL + `patient_documents` registry + meeting recordings)

---

## Table of Contents

1. [Overview](#1-overview)
2. [End-to-end delivery pipeline](#2-end-to-end-delivery-pipeline)
3. [Document types](#3-document-types)
4. [EMR delivery chain](#4-emr-delivery-chain)
5. [Lab / imaging delivery](#5-lab--imaging-delivery)
6. [Prescription delivery](#6-prescription-delivery)
7. [Meeting video delivery](#7-meeting-video-delivery)
8. [Patient upload](#8-patient-upload)
9. [Near-real-time sync](#9-near-real-time-sync)
10. [Security](#10-security)
11. [APIs](#11-apis)
12. [Database](#12-database)
13. [Cross-references](#13-cross-references)

---

## 1. Overview

All clinical file artifacts delivered to patients flow through **`patient_documents`** and **`DocumentDeliveryService`**. Meeting videos stay on **`meeting_records.recording_url`** but use the same authenticated download UX.

| Layer | Component | Role |
| ----- | --------- | ---- |
| Doctor Portal | `documentDeliveryService.cjs` + PatientRecordViewer | Publish + list/download parity |
| Patient Portal | `documentDeliveryService.ts` + PHR + Timeline | List, download, upload |
| Meeting server | recording serve `?download=1` | Attachment download for videos |
| Notifications | `document_delivered` + type-specific | Bell + Socket.IO refresh |

**Patient labels:** ประวัติการรับยา (Rx history), ยาที่ใช้ปัจจุบัน (self-reported).  
**Doctor labels:** ประวัติการจ่ายยา (Rx history), เอกสาร, การประชุม.

---

## 2. End-to-end delivery pipeline

```mermaid
sequenceDiagram
  participant Doc as DoctorPortal
  participant DDS as DocumentDeliveryService
  participant PG as PostgreSQL
  participant Sock as SocketIO
  participant Pat as PatientPortal

  Doc->>PG: Sign EMR / Rx / Lab PDF / Imaging / Save recording
  Doc->>DDS: publishDocument when file artifact
  DDS->>PG: INSERT patient_documents
  DDS->>PG: INSERT notifications document_delivered
  PG-->>Sock: NOTIFY
  Sock-->>Doc: emr/lab/rx/data:changed
  Sock-->>Pat: same events
  Pat->>Pat: Timeline + PHR list refresh
  Doc->>Doc: PatientRecordViewer tab refresh
```

### Working order (clinical visit → both portals)

| Step | Actor | Action | Artifact | Patient sees | Doctor sees |
| ---- | ----- | ------ | -------- | ------------ | ----------- |
| 1 | Doctor | Record + end meeting | `meeting_records.recording_url` | Timeline meeting + Download | Meetings tab + Download |
| 2 | Doctor | Sign EMR | `emr_report` + `instruction_sheet` | Timeline + Documents | EMR + Docs |
| 3 | Doctor | Prescribe | `prescriptions` + `prescription` doc | **ประวัติการรับยา** + Documents | **ประวัติการจ่ายยา** + Docs |
| 4 | Doctor | Lab/imaging results + PDF | `lab_report` / `imaging_report` | Lab & Imaging + Documents | Labs & Imaging + Docs |
| 5 | Patient | Upload file | `patient_upload` | Documents | Docs (PDPA) |
| 6 | System | Notify + socket | `document_delivered` | Auto-refresh | Auto-refresh |
| 7 | Either | Download | Auth stream | File saved | File saved |

---

## 3. Document types

| source_type | Doctor action | Patient view | Doctor view |
|-------------|---------------|--------------|-------------|
| `emr_report` | Sign EMR | Timeline + Documents | EMR + Docs |
| `instruction_sheet` | EMR sign | Documents | Docs |
| `lab_report` | Lab results + PDF | Lab & Imaging + Documents | Labs + Docs |
| `imaging_report` | Imaging results | Lab & Imaging + Timeline + Documents | Labs & Imaging + Docs |
| `prescription` | Save Rx | **ประวัติการรับยา** + Documents | **ประวัติการจ่ายยา** + Docs |
| `patient_upload` | Doctor share or patient upload | Documents | Docs |
| *(recording)* | Meeting save | Timeline meeting download | Meetings download |

---

## 4. EMR delivery chain

1. Doctor signs EMR → `POST /api/patients/:id/health-logs`
2. Backend signs `emr`, publishes `emr_report` + `instruction_sheet`
3. Emits `document_delivered` (+ optional `emr-signed`)
4. Patient Timeline / Documents; doctor EMR / Docs tabs refresh via Socket.IO

---

## 5. Lab / imaging delivery

1. `PUT /api/lab-orders/:id/results` or `PUT /api/imaging-orders/:id/results`
2. `publishDocument` for each PDF + structured text fallback
3. Notifications `lab_results` / `imaging_results` + `document_delivered`
4. Doctor `GET /api/patients/:id/ehr` returns `labGroups`, `imagingGroups`, `externalRecords` with `downloadUrl`

---

## 6. Prescription delivery

1. `POST /api/prescriptions` → DB + `prescription` document
2. Notifications `prescription_ready` + `document_delivered`
3. Patient **ประวัติการรับยา** via `GET /api/prescriptions` (`download_url`)
4. Doctor **ประวัติการจ่ายยา** via `GET /api/prescriptions/patient/:id`

---

## 7. Meeting video delivery

1. Doctor records in MeetingRoom → `POST .../save-recording`
2. Pipeline sets `meeting_records.recording_url` (e.g. `/api/recordings/meetings/.../video.webm`)
3. Doctor: `GET /api/patients/:id/meetings` → Meetings tab download (`?download=1` / BFF stream)
4. Patient: Timeline `meeting` events + `/api/meetings/recording-download?path=...`

---

## 8. Patient upload

1. PHR Documents `phr-document-upload` → `POST /api/patients/documents`
2. Doctor may share via `POST /api/patients/:id/documents` (PDPA-gated)
3. Both Docs lists show download via `GET /api/documents/:id/download`

---

## 9. Near-real-time sync

| Surface | Hook | Refetch on |
|---------|------|------------|
| PatientRecordViewer | doctor `useRealtimeSync` | emr, prescription, lab-order, data:changed |
| PHRPage | patient `useRealtimeSync` | emr, Rx, lab, phr, notification, data:changed |
| TimelinePage | patient `useRealtimeSync` | same |

Primary path: PG NOTIFY → Socket.IO. Fallback: notification bell 30s poll.

---

## 10. Security

- Auth-only downloads (JWT); no public file URLs
- Patients see **signed EMR only**
- Doctor medical tabs PDPA-gated
- Recording access role-checked on meeting-server
- Clinical GCS paths disabled (`DISABLE_GCS_CLINICAL` default)

---

## 11. APIs

| Method | Path | Role |
|--------|------|------|
| GET | `/api/documents/:id/download` | Patient/doctor download |
| GET | `/api/patients/:patientId/documents` | Doctor list (PDPA) |
| POST | `/api/patients/:patientId/documents` | Doctor share upload |
| GET | `/api/patients/:patientId/ehr` | Labs + imaging + documents |
| GET | `/api/patients/:patientId/meetings` | Meeting history + video URLs |
| GET | `/api/prescriptions/patient/:patientId` | Doctor Rx history + download_url |
| GET | `/api/phr/:patientId/timeline` | Patient ประวัติการรักษา (+ imaging/meeting/docs) |
| GET | `/api/phr/meetings` | Patient meeting list |
| GET | `/api/meetings/recording-download?path=` | Patient recording proxy |
| GET | `/api/recordings/.../?download=1` | Attachment disposition |

---

## 12. Database

| Table | Purpose |
| ----- | ------- |
| `patient_documents` | Registry of deliverable clinical files |
| `prescriptions` | E-prescription history |
| `lab_orders` / `imaging_orders` | Orders + results |
| `meeting_records` | Sessions + `recording_url` / BYTEA |
| `notifications` | Includes `document_delivered` |

---

## 13. Cross-references

| Topic | Document |
| ----- | -------- |
| Doctor viewer | [Pages/Doctor-Portal/11_Patient_Record_Viewer.md](Pages/Doctor-Portal/11_Patient_Record_Viewer.md) |
| Patient PHR | [Pages/Patient-Portal/06_PHR_Page.md](Pages/Patient-Portal/06_PHR_Page.md) |
| Timeline | [Pages/Patient-Portal/14_Timeline_Page.md](Pages/Patient-Portal/14_Timeline_Page.md) |
| Health records | [Health_Records_Processes.md](Health_Records_Processes.md) |
| Data sync | [Data_Sync_Documentation.md](Data_Sync_Documentation.md) |
| Notifications | [Notification_Workflows.md](Notification_Workflows.md) |
