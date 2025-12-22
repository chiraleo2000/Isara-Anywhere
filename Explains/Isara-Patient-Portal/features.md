# Izara Patient Portal - Features (ฟีเจอร์ระบบผู้ป่วย)

## 1. Dashboard (หน้าหลัก)

The main landing page showing:
- **Upcoming Appointments**: Next scheduled appointments with countdown
- **Recent Results**: Latest lab results and EMR summaries
- **Health Summary**: Quick stats (BMI, blood pressure, etc.)
- **Quick Actions**: Book appointment, view records, AI chat
- **Notification Bell**: Real-time appointment and health alerts

---

## 2. Notifications (การแจ้งเตือน)

### Notification Types
| Type | Description | Thai |
|------|-------------|------|
| appointment_confirmed | Doctor confirmed appointment | แพทย์ยืนยันนัดหมาย |
| appointment_declined | Doctor declined, finding another | แพทย์ไม่ว่าง |
| appointment_cancelled | Appointment cancelled | ยกเลิกนัดหมาย |
| meeting_link_ready | Meeting link available | ลิงก์ประชุมพร้อม |
| meeting_reminder | Meeting starting in 15 min | เตือนก่อนประชุม 15 นาที |
| emr_signed | Doctor signed EMR | แพทย์ลงนาม EMR |

### Features
- Real-time notification bell with unread count
- Click to navigate to appointment or join meeting
- Join meeting directly from notification
- Mark as read

---

## 3. Appointment Booking (จองนัดหมาย)

### Booking Steps

| Step | Name | Description |
|------|------|-------------|
| 1 | Symptoms | Enter symptoms with optional voice/image |
| 2 | AI Analysis | Review AI-suggested urgency & specialty |
| 3 | Doctor Selection | Choose doctor or let system assign |
| 4 | Date/Time | Select preferred appointment slot |
| 5 | Invitees | Add family members (optional) |
| 6 | Confirmation | Review and submit |

### Appointment Types

| Type | Description | Thai |
|------|-------------|------|
| **Online** | Video consultation via Jitsi Meet (no login required) | พบแพทย์ออนไลน์ |
| **Onsite** | In-person visit at clinic | พบแพทย์ที่คลินิก |

### Urgency Levels

| Level | Color | Wait Time |
|-------|-------|-----------|
| Emergency | 🔴 Red | Immediate |
| Urgent | 🟠 Orange | Same day |
| Normal | 🟢 Green | Within 7 days |

### Status Flow
```
pending → confirmed → completed
    ↓          ↓
declined   cancelled
```

---

## 3. Health Studio (PHR)

### Vital Signs
- Blood Pressure (Systolic/Diastolic mmHg)
- Heart Rate (BPM)
- Temperature (°C)
- Weight (kg)
- Oxygen Saturation (%)
- Blood Glucose (mg/dL)

### Medical Information

| Category | Description |
|----------|-------------|
| Allergies | Drug/Food allergies with severity |
| Chronic Conditions | Ongoing conditions with status |
| Current Medications | Active prescriptions |
| Vaccinations | Immunization history |

### Lifestyle Data

| Field | Options |
|-------|---------|
| Diet | Regular, Vegetarian, Vegan, Keto, Low-carb |
| Exercise | None, Light, Moderate, Active |
| Sleep | Hours per night (5-9+) |
| Smoking | Never, Former, Current |
| Alcohol | Never, Occasional, Moderate, Frequent |

---

## 4. AI Health Chat

Gemini-powered AI assistant for:
- General health questions
- Medical term explanations
- Lifestyle recommendations
- Symptom review (not diagnosis)

**Limitations**: Cannot diagnose, prescribe, or access external systems.

---

## 5. Treatment Results

View appointment outcomes:
- EMR summaries from doctor
- Prescription details
- Follow-up instructions
- Lab result summaries
- Doctor's notes

---

## 6. PDPA Consent

Thai Personal Data Protection Act compliance:

| Type | Required |
|------|----------|
| Essential (service operation) | Yes |
| Health Data (medical sharing) | Yes |
| Marketing | No |
| Analytics | No |

---

## 7. Living Will

Digital advance directive:
- Healthcare proxy designation
- Life-sustaining treatment preferences
- Organ donation preferences
- End-of-life care instructions

---

## 8. Profile Management

- Personal Info (Name, DOB, Gender, Phone, Email)
- Physical Info (Height, Weight, Blood Type, BMI)
- Emergency Contact
- Account Settings (Password, Notifications, Language)

---
**Last Updated:** December 14, 2025
