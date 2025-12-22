# 15. Glossary & Reference

## 15.1 Thai-English Glossary

| Thai | English | Description |
|------|---------|-------------|
| นัดหมาย | Appointment | Medical appointment booking |
| ผลการรักษา | Treatment Results | Results from medical treatments |
| เนื้อหาสุขภาพ | Medical Content | Health education articles |
| สุขภาพ | Health | Health-related features |
| แผนที่ | Map | Location & map services |
| ไทม์ไลน์ | Timeline | Activity timeline |
| ตั้งค่า | Settings | App settings |
| หน้าหลัก | Dashboard | Main dashboard |
| เข้าสู่ระบบ | Login | User authentication |
| ลงทะเบียน | Register | User registration |
| ประวัติสุขภาพ | Health Records | Personal Health Records (PHR) |
| หมอ AI | AI Doctor | AI Health Assistant |
| พินัยกรรมชีวิต | Living Will | Advance directive |
| ยินยอม | Consent | PDPA consent |
| วิดีโอคอล | Video Call | Telemedicine video consultation |
| สัญญาณชีพ | Vital Signs | Health measurements |
| ยา | Medications | Prescriptions |
| แพ้ยา | Drug Allergies | Allergic reactions to medications |
| ผลแล็บ | Lab Results | Laboratory test results |
| โรคประจำตัว | Chronic Conditions | Underlying diseases |
| ความดันโลหิต | Blood Pressure | BP measurement |
| น้ำตาลในเลือด | Blood Sugar | Glucose level |
| น้ำหนัก | Weight | Body weight |
| ส่วนสูง | Height | Body height |
| แพทย์ | Doctor | Healthcare provider |
| โรงพยาบาล | Hospital | Medical facility |
| คลินิก | Clinic | Medical clinic |
| ใบสั่งยา | Prescription | Medication order |
| รายงาน | Report | Medical report |

---

## 15.2 Abbreviations

| Abbreviation | Full Form | Description |
|--------------|-----------|-------------|
| API | Application Programming Interface | Server communication |
| CRUD | Create, Read, Update, Delete | Basic operations |
| GCP | Google Cloud Platform | Cloud infrastructure |
| GCS | Google Cloud Storage | File storage |
| JWT | JSON Web Token | Auth tokens |
| PDPA | Personal Data Protection Act | Thai data privacy law |
| PHR | Personal Health Records | Patient health data |
| PWA | Progressive Web App | Installable web app |
| SPA | Single Page Application | Frontend architecture |
| SSE | Server-Sent Events | Real-time data streaming |
| UI/UX | User Interface/Experience | Design aspects |
| UUID | Universally Unique Identifier | Unique IDs |

---

## 15.3 Status Codes Reference

### 15.3.1 Appointment Status

| Status | Thai | Description |
|--------|------|-------------|
| pending | รอยืนยัน | Awaiting confirmation |
| confirmed | ยืนยันแล้ว | Confirmed by doctor |
| completed | เสร็จสิ้น | Appointment done |
| cancelled | ยกเลิก | Cancelled |
| rescheduled | เลื่อนนัด | Rescheduled |

### 15.3.2 Consent Status

| Status | Thai | Description |
|--------|------|-------------|
| pending | รอการยินยอม | Not yet accepted |
| accepted | ยินยอมแล้ว | Consent given |
| declined | ปฏิเสธ | Consent declined |
| withdrawn | ถอนยินยอม | Consent revoked |

### 15.3.3 Appointment Types

| Type | Thai | Description |
|------|------|-------------|
| online | ออนไลน์ | Video consultation |
| in-person | ที่โรงพยาบาล | Physical visit |
| home-visit | เยี่ยมบ้าน | Home visit |

---

## 15.4 Error Codes

| Code | Message | Solution |
|------|---------|----------|
| AUTH_001 | Invalid credentials | Check username/password |
| AUTH_002 | Session expired | Re-login required |
| AUTH_003 | Unauthorized access | Check permissions |
| APPT_001 | Slot not available | Choose different time |
| APPT_002 | Doctor unavailable | Select another doctor |
| APPT_003 | Booking conflict | Check existing appointments |
| GCS_001 | Storage error | Check GCS connection |
| GCS_002 | File not found | Verify file path |
| GCS_003 | Permission denied | Check bucket IAM |
| PDPA_001 | Consent required | Accept PDPA first |
| PDPA_002 | Invalid consent type | Check consent type ID |
| PHR_001 | Invalid data format | Check data structure |
| PHR_002 | Missing required field | Provide all required fields |

---

## 15.5 API Quick Reference

### Authentication

```
POST /api/auth/register    - Register new user
POST /api/auth/login       - Login
POST /api/auth/logout      - Logout
GET  /api/auth/session     - Validate session
```

### Patient Data

```
GET  /api/phr/:userId              - Get PHR
POST /api/phr/:userId              - Update PHR
POST /api/phr/:userId/vitals       - Add vital signs
POST /api/phr/:userId/documents    - Upload document
```

### Appointments

```
GET  /api/appointments              - List appointments
POST /api/appointments              - Create appointment
GET  /api/appointments/:id          - Get single
PUT  /api/appointments/:id          - Update
DELETE /api/appointments/:id        - Cancel
```

### PDPA

```
GET  /api/pdpa/:userId/consent            - Get consents
POST /api/pdpa/:userId/consent            - Submit consent
GET  /api/pdpa/:userId/living-will        - Get living will
POST /api/pdpa/:userId/living-will        - Create/update
GET  /api/pdpa/:userId/living-will/history - Version history
POST /api/pdpa/:userId/living-will/rollback - Rollback version
```

### AI

```
POST /api/ai/chat    - Send message to AI
```

### Google Services

```
GET  /api/doctors/:doctorId/availability  - Calendar slots
POST /api/appointments/:id/google-meet    - Create Meet link
POST /api/appointments/:id/calendar       - Add to calendar
```

---

## 15.6 File Naming Conventions

### Backend Files

```
server/
├── routes/
│   └── {feature}.ts          # Route handlers
├── middleware/
│   └── {function}.ts         # Middleware
└── utils/
    └── {utility}.ts          # Helper functions
```

### Frontend Files

```
src/
├── pages/
│   └── {feature}/
│       └── {Feature}Page.tsx    # Page components
├── components/
│   ├── ui/
│   │   └── {Component}.tsx      # UI components (PascalCase)
│   └── {domain}/
│       └── {Component}.tsx      # Domain components
├── contexts/
│   └── {Name}Context.tsx        # Context providers
└── lib/
    └── {function}.ts            # Utilities (camelCase)
```

### GCS File Structure

```
{bucket}/
└── {userId}/
    ├── profile.json
    ├── phr.json
    ├── appointments/
    │   └── {appointmentId}.json
    └── documents/
        └── {documentId}.{ext}
```

---

## 15.7 Data Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Profile image | 5 MB | JPEG, PNG, WebP |
| Medical document | 10 MB | PDF, JPEG, PNG |
| Audio recording | 10 MB | WebM, MP3 |
| Vital signs per request | 100 entries | Batch upload |
| Appointments per query | 100 | Paginated |
| AI message length | 4,000 chars | Per message |
| AI chat history | 50 messages | Sliding window |

---

## 15.8 Browser Support

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Limited Web Speech |
| Edge | 90+ | Full support |
| Mobile Safari | 14+ | iOS 14+ |
| Chrome Android | 90+ | Full support |

---

## 15.9 External Links

### Google Cloud

- [GCS Documentation](https://cloud.google.com/storage/docs)
- [Calendar API](https://developers.google.com/calendar)
- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Gemini API](https://ai.google.dev/docs)

### Development

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide)

### Thai Regulations

- [PDPA Thailand](https://www.pdpc.or.th)
- [MOPH Guidelines](https://www.moph.go.th)

---

## 15.10 Contact & Support

### Development Team

- **Repository**: GitHub (private)
- **Documentation**: This folder (`/doc`)
- **API Base URL**: `http://localhost:3004/api`

### Support Channels

- Technical Issues: GitHub Issues
- API Questions: API Documentation
- User Guide: User Manual (separate)

---

[← Previous: Frontend Components](./14-frontend-components.md) | [Back to README →](./README.md)
