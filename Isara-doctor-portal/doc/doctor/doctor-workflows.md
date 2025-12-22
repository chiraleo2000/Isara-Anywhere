# 🔄 Doctor Workflows

## Overview

This document describes the key workflows that doctors follow when using the Izara Doctor Portal.

---

## 1️⃣ Login & Authentication Workflow

### Flow Diagram
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Enter     │────▶│   Validate  │────▶│   Check     │────▶│  Dashboard  │
│ Credentials │     │  Password   │     │  Approval   │     │   Loaded    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Error:    │     │  Pending    │
                    │   Invalid   │     │  Approval   │
                    └─────────────┘     └─────────────┘
```

### Steps
1. **Navigate to Login Page** (`/login`)
2. **Enter Credentials**
   - Email address
   - Password
3. **System Validates**
   - Check user exists in GCS
   - Verify password hash
   - Check account status
4. **Check Approval Status**
   - If pending: Show "Awaiting approval" message
   - If rejected: Show rejection message
   - If approved: Continue to dashboard
5. **Create Session**
   - Generate session token
   - Store in localStorage
   - Store in GCS sessions
6. **Redirect to Dashboard**
   - Navigate to `/doctor/{userId}/dashboard`

### Error Handling
| Error | Action |
|-------|--------|
| Invalid credentials | Show error, allow retry |
| Account locked | Show lockout message with time |
| Pending approval | Show pending message |
| Account deactivated | Show deactivation message |

---

## 2️⃣ Patient Consultation Workflow

### Flow Diagram
```
┌──────────────┐
│ View Queue   │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ Call Patient │────▶│   Record     │
│              │     │   Consent    │
└──────────────┘     └──────┬───────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Telehealth  │     │  In-Person   │     │  Review      │
│  (Video)     │     │  Consultation│     │  Records     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Create EMR  │
                     └──────┬───────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Prescribe   │     │  Order Labs  │     │   Referral   │
│  Medication  │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Schedule    │
                     │  Follow-up   │
                     └──────────────┘
```

### Detailed Steps

#### Step 1: View Patient Queue
- Navigate to Dashboard
- View waiting patients
- Check priority levels
- Review reason for visit

#### Step 2: Call Patient
- Click "Call" on patient entry
- Patient status changes to "In-Progress"
- System records call time

#### Step 3: Record Consent (if required)
- Display consent form
- Patient acknowledges
- Record consent in system

#### Step 4: Conduct Consultation
**Telehealth:**
- Start video call
- Enable recording (with consent)
- Use AI transcription
- Share screen if needed

**In-Person:**
- Review patient in clinic
- Document findings directly

#### Step 5: Create EMR
- Select template (SOAP, SBAR, etc.)
- Enter clinical findings
- Use AI suggestions for ICD-10 codes
- Document assessment and plan

#### Step 6: Post-Consultation Actions
- **Prescribe**: Create e-prescription if needed
- **Order Labs**: Order any required tests
- **Referral**: Refer to specialist if needed
- **Schedule Follow-up**: Book next appointment

#### Step 7: Complete Consultation
- Finalize and sign EMR
- Mark patient as completed
- Update queue status

---

## 3️⃣ EMR Creation Workflow

### Flow Diagram
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Select     │────▶│    Enter     │────▶│    Enter     │
│   Template   │     │    CC/HPI    │     │  Vital Signs │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   AI Code    │◀────│    Enter     │◀────│   Physical   │
│  Suggestions │     │  Assessment  │     │    Exam      │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Select     │────▶│   Document   │────▶│    Sign &    │
│  ICD-10 Code │     │    Plan      │     │   Finalize   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Steps

1. **Select Template**
   - Choose from SOAP, SBAR, Admission, Discharge, Progress
   - Template sections auto-populate

2. **Enter Chief Complaint**
   - Document main reason for visit
   - Note symptom duration and severity

3. **Document History of Present Illness**
   - Detailed symptom description
   - Onset, duration, progression
   - Associated symptoms
   - Previous treatments

4. **Enter Vital Signs**
   - Blood pressure
   - Heart rate
   - Temperature
   - Respiratory rate
   - O2 saturation
   - Weight/Height/BMI

5. **Physical Examination**
   - General appearance
   - System-by-system examination
   - Pertinent positive/negative findings

6. **Assessment**
   - Clinical impression
   - AI suggests ICD-10 codes
   - Select appropriate diagnosis codes

7. **Treatment Plan**
   - Document plan of care
   - Link to prescriptions/orders
   - Follow-up instructions

8. **Sign and Finalize**
   - Digital signature
   - Status changes to "Finalized"
   - Version control activated

### Auto-Save Feature
- EMR auto-saves every 30 seconds
- Draft status until finalized
- Version history maintained

---

## 4️⃣ E-Prescribing Workflow

### Flow Diagram
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Search     │────▶│   Safety     │────▶│   Set        │
│   Drug       │     │   Check      │     │   Dosage     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     │   Warning?  │
                     └──────┬──────┘
                            │
              ┌─────────────┼─────────────┐
              │ No          │             │ Yes
              ▼             │             ▼
       ┌──────────────┐     │      ┌──────────────┐
       │  Continue    │     │      │   Review     │
       │              │     │      │   Warning    │
       └──────────────┘     │      └──────┬───────┘
              │             │             │
              │             │      ┌──────┴──────┐
              │             │      │  Override?  │
              │             │      └──────┬──────┘
              │             │             │
              └─────────────┼─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Add to     │
                     │   Prescription│
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Review &   │
                     │   Sign       │
                     └──────────────┘
```

### Steps

1. **Open E-Prescribing**
   - Select patient
   - View current medications
   - View known allergies

2. **Search for Drug**
   - Search by name (generic or brand)
   - View drug information
   - Check formulary status

3. **Safety Checks**
   - **Allergy Check**: Compare against patient allergies
   - **Interaction Check**: Check against current medications
   - **Contraindication Check**: Compare against conditions

4. **Handle Warnings**
   - Review warning details
   - Option to override with reason
   - Document override justification

5. **Set Dosage**
   - Select strength
   - Choose route (oral, topical, etc.)
   - Set frequency
   - Set duration
   - Calculate quantity

6. **Add Instructions**
   - Patient instructions
   - Special handling notes
   - Refill instructions

7. **Review Prescription**
   - Verify all medications
   - Check for completeness
   - Review total prescription

8. **Sign and Submit**
   - Digital signature
   - Save to patient record
   - Option to print

---

## 5️⃣ Lab Order Workflow

### Flow Diagram
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Select     │────▶│   Add        │────▶│   Set        │
│   Panel      │     │   Individual │     │   Urgency    │
└──────────────┘     │   Tests      │     └──────────────┘
                     └──────────────┘            │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Track      │◀────│   Submit     │◀────│   Clinical   │
│   Status     │     │   Order      │     │  Indication  │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│   View       │
│   Results    │
└──────────────┘
```

### Steps

1. **Select Test Panels**
   - Choose from common panels (CBC, CMP, etc.)
   - Or select individual tests

2. **Add Individual Tests**
   - Search test catalog
   - Add to order

3. **Set Urgency**
   - **Routine**: Standard processing
   - **Urgent**: Priority processing
   - **STAT**: Immediate processing

4. **Enter Clinical Indication**
   - Reason for ordering
   - Link to diagnosis if applicable

5. **Submit Order**
   - Review order details
   - Submit to lab system

6. **Track Status**
   - Ordered → Collected → In Progress → Completed

7. **View Results**
   - Access completed results
   - View abnormal flags
   - Trend analysis over time

---

## 6️⃣ Virtual Consultation Workflow

### Flow Diagram
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Start      │────▶│   Patient    │────▶│   Start      │
│   Meeting    │     │   Consent    │     │   Video      │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Enable     │
                                          │   Recording  │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Conduct    │
                                          │   Consult    │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   End        │
                                          │   Meeting    │
                                          └──────┬───────┘
                                                 │
       ┌─────────────────────────────────────────┤
       │                                         │
       ▼                                         ▼
┌──────────────┐                          ┌──────────────┐
│   Upload     │                          │   AI        │
│   Recording  │                          │   Summary   │
└──────────────┘                          └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Generate   │
                                          │   EMR Draft  │
                                          └──────────────┘
```

### Steps

1. **Initiate Meeting**
   - Select patient from queue
   - Click "Start Consultation"

2. **Patient Consent**
   - Display consent form
   - Patient acknowledges recording consent
   - Record consent in system

3. **Start Video**
   - Access camera and microphone
   - Connect to Google Meet
   - Verify audio/video quality

4. **Enable Recording** (if consented)
   - Start recording
   - Enable AI transcription
   - Monitor recording status

5. **Conduct Consultation**
   - Video consultation with patient
   - Use AI chat for clinical queries
   - Screen share if needed

6. **End Meeting**
   - Stop recording
   - End video call
   - Save meeting data

7. **Post-Meeting Processing**
   - Upload recording to cloud
   - Generate AI clinical summary
   - Create EMR draft from summary

8. **Review and Complete**
   - Review AI-generated summary
   - Edit and finalize EMR
   - Follow up actions

---

## 7️⃣ Schedule Management Workflow

### Creating Availability
```
1. Navigate to Schedule → 2. Set Working Hours → 3. Define Slot Duration → 4. Save
```

### Booking Appointment
```
1. Select Date/Time → 2. Select Patient → 3. Set Type → 4. Confirm → 5. Send Notification
```

### Managing Appointments
| Action | Workflow |
|--------|----------|
| **Reschedule** | Select → New Date/Time → Notify Patient |
| **Cancel** | Select → Add Reason → Notify Patient |
| **Complete** | Mark as Done → Link EMR |
| **No-Show** | Mark No-Show → Log in System |

---

## 8️⃣ Referral Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Select     │────▶│   Search     │────▶│   Create     │
│   Patient    │     │  Consultant  │     │  Referral    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Include    │
                                          │   Records    │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Send to    │
                                          │   Specialist │
                                          └──────────────┘
```

### Steps
1. Select patient for referral
2. Search for appropriate specialist
3. Create referral request with reason
4. Attach relevant medical records
5. Send to specialist
6. Track referral status

---

## 📋 Workflow Quick Reference

| Workflow | Start Point | End Point | Typical Duration |
|----------|-------------|-----------|------------------|
| Login | Login page | Dashboard | < 30 seconds |
| Consultation | Queue | EMR Complete | 15-30 minutes |
| EMR Creation | Patient Select | Sign & Finalize | 5-15 minutes |
| E-Prescribing | Patient Select | Sign & Submit | 2-5 minutes |
| Lab Order | Patient Select | Order Submit | 1-3 minutes |
| Virtual Consult | Call Patient | Summary Generated | 15-45 minutes |
