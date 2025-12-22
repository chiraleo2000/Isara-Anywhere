# 👨‍⚕️ Doctor Portal Features

## Overview

The Doctor Portal provides healthcare providers with comprehensive tools for managing patient care, conducting virtual consultations, and maintaining electronic medical records.

---

## 🏠 Dashboard (Health Studio)

The main dashboard provides an at-a-glance view of the doctor's daily activities.

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────┐
│                    HEALTH STUDIO DASHBOARD                       │
├──────────────────┬──────────────────┬────────────────────────────┤
│   HEALTH DATA    │  HEALTH MEETING  │      HEALTH STUDIO         │
│                  │                  │                            │
│ • Patient List   │ • Investigation  │ • Diagnosis Panel          │
│ • EMR Records    │ • Treatment      │ • Treatment Plan           │
│ • Lab Results    │ • Refer          │ • System Reports           │
│ • Prescriptions  │                  │ • Radiology                │
│                  │                  │ • Laboratory               │
│                  │                  │ • Pathology                │
└──────────────────┴──────────────────┴────────────────────────────┘
```

### Dashboard Features

| Feature | Description |
|---------|-------------|
| **Patient Queue** | Real-time queue of waiting patients |
| **Today's Stats** | Appointments, patients seen, pending items |
| **Quick Actions** | Start consultation, create prescription, order labs |
| **AI Chat** | Integrated AI assistant for clinical queries |

### Dashboard Statistics
- Today's appointments count
- Patients seen today
- Pending prescriptions
- Unread messages
- Average wait time
- Patients in queue

---

## 👥 Patient Management

### Patient List View
- Searchable patient directory
- Filter by status, last visit, risk level
- Quick access to patient details
- Consent status indicators

### Patient Record Components

```
Patient Record
├── Demographics
│   ├── Name, Age, Gender
│   ├── Date of Birth
│   ├── ID Number
│   └── Photo
├── Contact Information
│   ├── Phone, Email
│   ├── Address
│   └── Emergency Contact
├── Medical Information
│   ├── Blood Type
│   ├── Allergies
│   ├── Chronic Conditions
│   └── Current Medications
├── Consent Status
│   ├── Has Consent
│   ├── Data Types Allowed
│   └── Expiry Date
└── Risk Assessment
    └── Risk Level (Low/Medium/High)
```

### Patient Actions
| Action | Description |
|--------|-------------|
| **View Profile** | Full patient demographics |
| **View EMR** | Electronic medical records |
| **Create EMR** | New encounter note |
| **Prescribe** | E-prescribing |
| **Order Labs** | Laboratory tests |
| **Start Consultation** | Virtual meeting |

---

## 📝 EMR Editor (Electronic Medical Records)

### Clinical Templates
| Template | Sections |
|----------|----------|
| **SOAP Note** | Subjective, Objective, Assessment, Plan |
| **SBAR Note** | Situation, Background, Assessment, Recommendation |
| **Admission Note** | Chief Complaint, HPI, PMH, Medications, Allergies, Social Hx, Family Hx, ROS, PE, Assessment & Plan |
| **Discharge Summary** | Admission Date, Discharge Date, Diagnoses, Hospital Course, Discharge Meds, Follow-up |
| **Progress Note** | Interval History, Current Status, Assessment, Plan |

### EMR Components

```typescript
interface EMR {
  id: string;
  patientId: string;
  doctorId: string;
  encounterDate: Date;
  encounterType: 'consultation' | 'follow-up' | 'emergency' | 'procedure';
  chiefComplaint: string;
  historyOfPresentIllness: string;
  reviewOfSystems: ReviewOfSystems;
  physicalExamination: PhysicalExam;
  vitalSigns: VitalSigns;
  assessment: string;
  diagnosis: DiagnosisCode[];      // ICD-10 codes
  treatmentPlan: string;
  prescriptions: Prescription[];
  investigations: Investigation[];
  followUpInstructions: string;
  followUpDate?: Date;
  status: 'draft' | 'finalized' | 'amended';
  digitalSignature?: string;
  version: number;
}
```

### EMR Features
- Auto-save with version control
- AI-powered ICD-10 code suggestions
- Digital signatures
- PDF export
- Template selection
- Vital signs auto-population

---

## 💊 E-Prescribing System

### Drug Search
- Search by generic name or brand name
- Drug database integration
- Dosage suggestions

### Safety Features
| Feature | Description |
|---------|-------------|
| **Allergy Checking** | Alert if patient has known allergy |
| **Drug Interactions** | Check against current medications |
| **Contraindications** | Warn about contraindicated conditions |
| **Dosage Warnings** | Age/weight-based dosage alerts |

### Prescription Workflow
```
1. Search Drug → 2. Check Safety → 3. Set Dosage → 4. Add Instructions → 5. Sign & Send
```

### Prescription Fields
| Field | Description |
|-------|-------------|
| Drug Name | Generic and brand name |
| Dosage | Strength and form |
| Route | Oral, injection, topical, etc. |
| Frequency | Once daily, twice daily, etc. |
| Duration | Number of days |
| Quantity | Total quantity to dispense |
| Refills | Number of refills allowed |
| Instructions | Patient instructions |

---

## 🧪 Lab Orders

### Common Test Panels
- Complete Blood Count (CBC)
- Comprehensive Metabolic Panel (CMP)
- Lipid Panel
- HbA1c (Diabetes)
- Thyroid Function (TSH)

### Lab Order Features
| Feature | Description |
|---------|-------------|
| **Panel Selection** | Pre-configured test panels |
| **Individual Tests** | Select specific tests |
| **Clinical Indication** | Reason for ordering |
| **Urgency Level** | Routine, Urgent, STAT |
| **Result Viewing** | View completed results |
| **Trend Analysis** | Historical result trends |

### Lab Order Status
```
Ordered → Collected → In Progress → Completed
```

---

## 📅 Schedule Management

### Calendar Views
- Day view
- Week view
- Month view
- Agenda view

### Scheduling Features
| Feature | Description |
|---------|-------------|
| **Availability Settings** | Set working hours |
| **Appointment Slots** | Define consultation slots |
| **Booking** | Book/modify appointments |
| **Recurring** | Recurring appointments |
| **Reminders** | Email/notification reminders |

### Appointment Types
- Telehealth (video consultation)
- In-Person
- Follow-up
- Emergency
- Consultation

---

## 🎥 Virtual Consultations

### Meeting Features
| Feature | Description |
|---------|-------------|
| **Video Call** | Google Meet integration |
| **Consent Recording** | Patient consent before start |
| **Screen Sharing** | Share medical images |
| **Recording** | Record consultation (with consent) |
| **Transcription** | AI voice transcription |
| **AI Summary** | Auto-generated clinical summary |

### Meeting Workflow
```
1. Patient Consent → 2. Start Video → 3. Consultation → 4. AI Summary → 5. Generate EMR
```

### AI Meeting Summary
```typescript
interface MeetingAISummary {
  chiefComplaint: string;
  symptoms: string[];
  diagnosis?: string;
  treatmentPlan: string[];
  prescriptions: SuggestedPrescription[];
  labOrders: string[];
  followUpRecommended: boolean;
  redFlags: string[];
  patientEducation: string[];
}
```

---

## 📊 Queue Management

### Queue Display
- Patient name and queue number
- Appointment time
- Reason for visit
- Priority level (routine, urgent, emergency)
- Estimated wait time
- Status (waiting, in-progress, completed)

### Queue Actions
| Action | Description |
|--------|-------------|
| **Call Next** | Call next patient in queue |
| **Call Specific** | Call specific patient |
| **Skip** | Skip patient (with reason) |
| **Complete** | Mark consultation complete |

---

## 🏥 Health Meeting

### Participant Types
- Patients
- Doctors
- Consultants (Specialists)

### Meeting Types
| Type | Description |
|------|-------------|
| **Consultation** | Patient-doctor consultation |
| **Follow-up** | Follow-up appointment |
| **Team Meeting** | Multi-provider meeting |
| **Referral** | Specialist referral discussion |

### Meeting Features
- Email invites via Gmail API
- Google Meet links
- Calendar integration
- Participant status tracking

---

## 🤖 AI Clinical Assistant

### AI Features
| Feature | Description |
|---------|-------------|
| **Chat Interface** | Ask clinical questions |
| **Diagnosis Support** | Differential diagnosis suggestions |
| **Drug Information** | Drug details and interactions |
| **Clinical Summaries** | Auto-generate from transcripts |
| **ICD-10 Coding** | Suggest diagnosis codes |

### AI Chat
- Floating action button for quick access
- Context-aware responses
- Medical terminology support
- Evidence-based suggestions

---

## 📚 Medical Content

### Resource Categories
- Clinical Guidelines
- Drug Information
- Patient Education
- Medical News
- Research Articles

### Content Features
- Search functionality
- Category filtering
- Favorites/bookmarks
- Offline access (planned)

---

## 🧑‍⚕️ Medical Consultants Directory

### Consultant Information
- Name and specialty
- Contact details
- Availability status
- Hospital/clinic affiliation

### Referral Features
- Search by specialty
- View consultant profiles
- Send referral requests
- Track referral status

---

## 📱 Responsive Design

### Desktop View
- Full sidebar navigation
- Three-column dashboard layout
- Full feature access

### Tablet View
- Collapsible sidebar
- Two-column layouts
- Touch-optimized controls

### Mobile View
- Bottom navigation bar
- Single-column layouts
- Swipe gestures
- Mobile-optimized forms

---

## ⌨️ Keyboard Shortcuts (Planned)

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | New EMR |
| `Ctrl + P` | New Prescription |
| `Ctrl + L` | Lab Order |
| `Ctrl + S` | Save |
| `Ctrl + /` | AI Assistant |

---

## 🔔 Notifications

### Notification Types
- New appointment requests
- Patient arrived in queue
- Lab results ready
- Message from patient
- System alerts

### Notification Channels
- In-app notifications
- Email notifications
- Push notifications (planned)
- SMS alerts (planned)
