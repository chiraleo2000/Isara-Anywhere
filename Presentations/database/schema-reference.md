# Izara Telemedicine Database Schema - Quick Reference

## Version 2.0 | Updated: December 2025

---

## GCS Bucket Structure Overview

| Bucket | Tables | Purpose |
|--------|--------|---------|
| **izara-users-credentials** | 9 | Authentication, sessions, roles, API keys |
| **izara-patients-data** | 10 | Patient profiles, PHR, vital signs, living will, PDPA |
| **izara-doctors-data** | 6 | Doctor profiles, schedules, meeting recordings |
| **izara-appointments** | 12 | Appointments, EMR, prescriptions, labs, imaging, payments |
| **izara-meta-data** | 15 | Medical content, drugs, ICD-10, notifications, audit |

**Total: 52 Tables with 45+ Cross-Bucket Relationships**

---

## Relationship Map

```
                    ┌─────────────────────────────────────────┐
                    │     BUCKET 1: izara-users-credentials    │
                    │                                         │
                    │  ┌─────────────────────────────────┐    │
                    │  │         users_auth (PK: uid)    │    │
                    │  │  - email, role, password_hash   │    │
                    │  │  - is_admin, is_active          │    │
                    │  │  - approval_status              │    │
                    │  └──────────────┬──────────────────┘    │
                    │                 │                       │
                    │    ┌────────────┼────────────┐          │
                    │    ▼            ▼            ▼          │
                    │ users_index auth_sessions user_roles    │
                    │ oauth_tokens  api_keys  service_accounts│
                    │ google_calendar_sync password_reset     │
                    └─────────────────┬───────────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           ▼                          │                          ▼
┌──────────────────────────┐          │          ┌──────────────────────────┐
│  BUCKET 2: izara-        │          │          │  BUCKET 3: izara-        │
│  patients-data           │          │          │  doctors-data            │
│                          │          │          │                          │
│ ┌────────────────────┐   │          │          │  ┌────────────────────┐  │
│ │ patient_profiles   │   │          │          │  │ doctor_profiles    │  │
│ │ (PK: patient_id)   │◄──┼──────────┼──────────┼──│ (PK: doctor_id)    │  │
│ │ - uid (FK users)   │   │          │          │  │ - uid (FK users)   │  │
│ │ - personal_info    │   │          │          │  │ - license, specialty│ │
│ └─────────┬──────────┘   │          │          │  └─────────┬──────────┘  │
│           │              │          │          │            │             │
│     ┌─────┴─────┐        │          │          │     ┌──────┴──────┐      │
│     ▼           ▼        │          │          │     ▼             ▼      │
│ patient_phr  vital_signs │          │          │ schedules  availability  │
│ health_logs  documents   │          │          │ meeting_recordings       │
│ consents     living_will │          │          │ clinical_templates       │
│ pdpa_consents            │          │          │                          │
│ family_history           │          │          │                          │
│ wearable_data            │          │          │                          │
└────────────┬─────────────┘          │          └─────────────┬────────────┘
             │                        │                        │
             │    ┌───────────────────┴────────────────────┐   │
             │    │                                        │   │
             └────┼────────────────────────────────────────┼───┘
                  ▼                                        ▼
        ┌──────────────────────────────────────────────────────────┐
        │              BUCKET 4: izara-appointments                 │
        │                                                          │
        │  ┌─────────────────────────────────────────────────┐     │
        │  │             appointments (PK: appointment_id)    │     │
        │  │  - patient_id (FK patient_profiles)              │     │
        │  │  - doctor_id (FK doctor_profiles)                │     │
        │  │  - status, type, symptoms, meeting_link          │     │
        │  └──────────────────────┬────────────────────────────┘    │
        │                         │                                │
        │    ┌────────────────────┼────────────────────┐           │
        │    ▼                    ▼                    ▼           │
        │ appointment_pool   meeting_links        emr_records     │
        │ (doctor assignment)                    (clinical notes) │
        │                                             │           │
        │                    ┌────────────────────────┼───────┐   │
        │                    ▼                        ▼       ▼   │
        │              prescriptions            lab_orders  imaging│
        │              prescription_items       lab_results imaging│
        │                                                  results│
        │                                                         │
        │              referrals            payment_transactions  │
        └─────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌──────────────────────────────────────────────────────────┐
        │               BUCKET 5: izara-meta-data                   │
        │                                                          │
        │  ┌─────────────────┐    ┌─────────────────┐              │
        │  │ medical_content │    │clinical_resources│             │
        │  │ (author_id FK)  │    │ (doctor created)│             │
        │  └─────────────────┘    └─────────────────┘              │
        │                                                          │
        │  ┌─────────────────┐    ┌─────────────────┐              │
        │  │  drug_database  │    │   icd10_codes   │              │
        │  │ (prescriptions) │    │  (diagnosis)    │              │
        │  └─────────────────┘    └─────────────────┘              │
        │                                                          │
        │  ┌─────────────────┐    ┌─────────────────┐              │
        │  │notification_queue│   │   audit_logs    │              │
        │  │(recipient_id FK) │   │  (user_id FK)   │              │
        │  └─────────────────┘    └─────────────────┘              │
        │                                                          │
        │  system_config  feature_flags  specialties  hospitals    │
        │  notification_templates  user_notifications  metrics     │
        └──────────────────────────────────────────────────────────┘
```

---

## Key Relationships Summary

### Patient-Centric Relationships
- `patient_profiles.uid` → `users_auth.uid`
- `patient_phr.patient_id` → `patient_profiles.patient_id`
- `patient_vital_signs.patient_id` → `patient_profiles.patient_id`
- `patient_health_logs.patient_id` → `patient_profiles.patient_id`
- `patient_living_will.patient_id` → `patient_profiles.patient_id`
- `patient_pdpa_consents.patient_id` → `patient_profiles.patient_id`
- `appointments.patient_id` → `patient_profiles.patient_id`
- `emr_records.patient_id` → `patient_profiles.patient_id`
- `prescriptions.patient_id` → `patient_profiles.patient_id`
- `lab_orders.patient_id` → `patient_profiles.patient_id`

### Doctor-Centric Relationships
- `doctor_profiles.uid` → `users_auth.uid`
- `doctor_schedules.doctor_id` → `doctor_profiles.doctor_id`
- `appointments.doctor_id` → `doctor_profiles.doctor_id`
- `emr_records.doctor_id` → `doctor_profiles.doctor_id`
- `prescriptions.doctor_id` → `doctor_profiles.doctor_id`
- `lab_orders.doctor_id` → `doctor_profiles.doctor_id`
- `medical_content.author_id` → `doctor_profiles.doctor_id`

### Appointment-Centric Relationships
- `appointment_pool.appointment_id` → `appointments.appointment_id`
- `appointment_meeting_links.appointment_id` → `appointments.appointment_id`
- `emr_records.appointment_id` → `appointments.appointment_id`
- `prescriptions.appointment_id` → `appointments.appointment_id`
- `lab_orders.appointment_id` → `appointments.appointment_id`
- `payment_transactions.appointment_id` → `appointments.appointment_id`
- `doctor_meeting_recordings.appointment_id` → `appointments.appointment_id`

### Cross-Bucket Audit Relationships
- `audit_logs.user_id` → `users_auth.uid`
- `notification_queue.recipient_id` → `users_auth.uid`
- `notification_queue.related_appointment_id` → `appointments.appointment_id`

---

## Process Coverage

| Process | Tables Involved |
|---------|-----------------|
| **User Authentication** | users_auth, users_index, auth_sessions, user_roles, oauth_tokens, password_reset_tokens |
| **Patient Registration** | users_auth, patient_profiles, patient_phr |
| **Doctor Registration** | users_auth, doctor_profiles, user_roles |
| **Appointment Booking** | appointments, appointment_pool, appointment_meeting_links |
| **Video Consultation** | appointments, doctor_meeting_recordings, doctor_meeting_files |
| **EMR Creation** | emr_records, appointments, patient_health_logs |
| **Prescribing** | prescriptions, prescription_items, drug_database |
| **Lab Ordering** | lab_orders, lab_results, appointments |
| **Imaging** | imaging_orders, imaging_results |
| **Living Will** | patient_living_will, patient_pdpa_consents |
| **PHR Management** | patient_phr, patient_vital_signs, patient_documents, patient_wearable_data |
| **Medical Content** | medical_content, medical_content_tags |
| **Clinical Resources** | clinical_resources, clinical_resources_tags |
| **Notifications** | notification_queue, notification_templates, user_notifications |
| **Payments** | payment_transactions, appointments |
| **Audit & Compliance** | audit_logs, patient_consents, patient_pdpa_consents |
| **Calendar Integration** | google_calendar_sync, appointments |
| **Referrals** | referrals, appointments, doctor_profiles |
