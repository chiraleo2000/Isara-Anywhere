# Izara Doctor Portal - Features

## 1. Dashboard (แดชบอร์ด)

Main landing page for doctors showing:
- **Today's Stats**: Appointments, completed, pending
- **Patient Queue Count**: Awaiting confirmation
- **Investigation/Treatment/Refer Lists**: Patients by status
- **Quick Actions**: View queue, schedule, patients
- **Notification Bell**: Real-time alerts for appointments and messages

---

## 2. Notifications (การแจ้งเตือน)

### Notification Types
| Type | Description | Thai |
|------|-------------|------|
| appointment_requested | New appointment request | คำขอนัดหมายใหม่ |
| appointment_confirmed | Appointment confirmed | ยืนยันนัดหมายแล้ว |
| appointment_cancelled | Appointment cancelled | ยกเลิกนัดหมาย |
| meeting_reminder | Meeting starting soon | เตือนการประชุม |
| emr_signed | EMR signed by patient | ผู้ป่วยลงนาม EMR |

### Features
- Real-time notification bell with unread count
- Click notification to navigate to relevant section
- Mark individual or all as read
- Join meeting directly from notification

---

## 3. Patient Queue (Appointments & Meetings)

### Overview
View and manage pending appointment requests from patients.

### Queue Tabs
| Tab | Shows | Access |
|-----|-------|--------|
| Patient Queue | All pending appointments | All |
| Scheduled Meetings | Confirmed appointments | All |
| All Appointments | System-wide view | Admin only |

### Patient Queue Actions
- **View Details**: Patient info, symptoms, AI analysis
- **Confirm**: Set date/time, generate meeting link
- **Decline**: With reason, notify patient
- **Assign** (Admin): Assign to specific doctor

### Sorting
Priority: Emergency → Urgent → Normal → Creation date (FIFO)

---

## 3. Scheduled Meetings

Confirmed appointments ready for consultation.

### Information Displayed
- Patient name and contact
- Appointment date and time
- Symptoms summary
- Meeting link (for online)

### Actions
- **Join Meeting**: Opens Google Meet
- **Add to Calendar**: Google Calendar integration
- **View Patient Records**: Open EMR/PHR
- **Complete Appointment**: Mark as done

---

## 4. EMR Editor (Thai OPD Card)

Electronic Medical Record following Thai Health Ministry Standard.

### EMR Sections (Tabs)

| Tab | Thai | Content |
|-----|------|---------|
| S | ประวัติ | Chief complaint, history of present illness |
| O | ตรวจร่างกาย | Vital signs, physical examination |
| A | การวินิจฉัย | Diagnosis with ICD-10 codes |
| P | การรักษา | Treatment plan, prescriptions, follow-up |
| AI | สรุป AI | Gemini-generated patient summary |

### Encounter Types
- ตรวจทั่วไป (General)
- นัดติดตาม (Follow-up)
- ฉุกเฉิน (Emergency)
- หัตถการ (Procedure)

### Features
- Auto-save drafts
- Version history
- AI summary generation
- Print/Export

---

## 5. E-Prescribing

Digital prescription management.

### Prescription Fields
- Medication name
- Dosage
- Frequency
- Duration
- Quantity
- Instructions (Thai/English)

### Features
- Drug database search
- Interaction checking
- Allergy alerts
- Print prescription
- Save to patient record

---

## 6. Lab Orders

Laboratory test management.

### Order Process
1. Select tests from catalog
2. Add clinical notes
3. Submit order
4. Track status
5. View results

### Test Categories
- Blood tests
- Urine tests
- Imaging
- Special tests

---

## 7. Clinical Resources

Medical guidelines and reference library.

### Resource Types
| Type | Description |
|------|-------------|
| Guideline | Treatment guidelines |
| Protocol | Standard procedures |
| Research | Research papers |
| Template | Document templates |
| Reference | Quick reference |

### Categories
- Diagnosis Guidelines
- Treatment Protocols
- Pharmacology
- Emergency Medicine
- Research Papers
- Case Studies

### Actions (Doctor)
- View published resources
- Create new (requires approval)
- Edit own drafts
- Submit for approval

### Actions (Admin)
- Approve/Reject submissions
- Edit any resource
- Delete resources
- View pending queue

---

## 8. Medical Consultants

Specialist directory for referrals.

### Consultant Information
- Name and specialty
- Hospital/Institution
- Contact (phone, email)
- Availability status
- Languages spoken
- Experience and ratings

### Actions (Doctor)
- View consultant profiles
- Search by specialty
- Rate and review
- Contact directly

### Actions (Admin)
- Add new consultants
- Edit profiles
- Toggle availability
- Delete consultants
- View admin notes

---

## 9. AI Copilot

Gemini-powered clinical assistant.

### Capabilities
- Summarize patient history
- Suggest diagnoses
- Drug interaction check
- Generate patient summaries
- Answer clinical questions

### Integration Points
- EMR Editor (AI summary tab)
- Prescribing (interaction check)
- Patient Queue (symptom analysis)

---

## 10. Schedule Management

Doctor availability and calendar.

### Features
- Set working hours
- Block unavailable times
- View appointment calendar
- Manage recurring schedules

---

## Component Reference

| Component | File | Purpose |
|-----------|------|---------|
| Dashboard | `DoctorDashboard.tsx` | Main dashboard |
| Appointments | `HealthMeeting.tsx` | Queue & meetings |
| EMR | `CompleteEMREditor.tsx` | Medical records |
| Prescribing | `CompletePrescribing.tsx` | Prescriptions |
| Lab | `CompleteLabOrders.tsx` | Lab orders |
| Resources | `ClinicalResources.tsx` | Medical library |
| Consultants | `MedicalConsultants.tsx` | Specialist directory |

---
**Last Updated:** December 14, 2025
