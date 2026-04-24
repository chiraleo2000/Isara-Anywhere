# ⚙️ Patient Portal — Settings Page

**Route:** `/settings`
**Component:** `src/pages/settings/SettingsPage.tsx`
**Access:** 🔒 Authenticated patients
**Thai Title:** ตั้งค่า / Settings

---


## 1. Purpose

Application settings management: profile image, notification preferences, language/display options, security (password change), and logout.

---


## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ⚙️ ตั้งค่า (Settings)                                               │
│                                                                     │
│  ┌── Profile Section ──────────────────────────────────────────┐   │
│  │  [Avatar] นายสมชาย มั่นคง                                    │   │
│  │  demo.test@gmail.com                                        │   │
│  │  [📷 เปลี่ยนรูปโปรไฟล์]                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌── Notifications ────────────────────────────────────────────┐   │
│  │  🔔 แจ้งเตือนนัดหมาย                            [Toggle ✅] │   │
│  │  💊 แจ้งเตือนยา                                  [Toggle ✅] │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌── Language & Display ───────────────────────────────────────┐   │
│  │  🌐 ภาษา (Language)                    [ไทย ▼ / English ▼] │   │
│  │  🌙 โหมดมืด (Dark Mode)                          [Toggle] │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌── Security ─────────────────────────────────────────────────┐   │
│  │  🔑 เปลี่ยนรหัสผ่าน                                    [>] │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌── Logout ───────────────────────────────────────────────────┐   │
│  │  [🚪 ออกจากระบบ (Logout)]                                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📱 Version: 3.2.0                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. Features & Actions


### 3.1 Profile Section

| Action | Description |
| ------ | ----------- |
| Change Avatar | Opens ProfileImageModal for image upload |


### 3.2 Notification Preferences

| Toggle | Storage | Description |
| ------ | ------- | ----------- |
| Appointment reminders | localStorage | Enable/disable appointment alerts |
| Medication reminders | localStorage | Enable/disable medication alerts |


### 3.3 Language & Display

| Setting | Options | Storage |
| ------- | ------- | ------- |
| Language | Thai (ไทย) / English | SettingsContext |
| Dark Mode | On / Off | SettingsContext |


### 3.4 Security

| Action | Description |
| ------ | ----------- |
| Change password | Opens PasswordChangeModal |

---


## 4. Modals


### PasswordChangeModal

```text
┌── Change Password ──────────────────────┐
│  รหัสผ่านปัจจุบัน: [________________]     │
│  รหัสผ่านใหม่:     [________________]     │
│  ยืนยันรหัสผ่าน:   [________________]     │
│                                          │
│  [ยกเลิก]              [เปลี่ยนรหัสผ่าน]  │
└──────────────────────────────────────────┘
```


### ProfileImageModal

```text
┌── Change Profile Image ─────────────────┐
│  [📁 Choose File]                        │
│                                          │
│  [Preview of selected image]             │
│                                          │
│  [ยกเลิก]                    [อัปโหลด]   │
└──────────────────────────────────────────┘
```

---


## 5. Workflows


### Workflow 1: Change Password

```text
Step 1: Click "เปลี่ยนรหัสผ่าน" row
Step 2: PasswordChangeModal opens
Step 3: Enter current password
Step 4: Enter new password + confirm
Step 5: Click "เปลี่ยนรหัสผ่าน"
Step 6: POST /api/auth/change-password
Step 7: Success → Modal closes + success toast
Step 8: Failure → Error message in modal
```


### Workflow 2: Change Profile Image

```text
Step 1: Click "เปลี่ยนรูปโปรไฟล์"
Step 2: ProfileImageModal opens
Step 3: Select file (JPG/PNG/WebP, max 5MB)
Step 4: Preview shown
Step 5: Click "อัปโหลด"
Step 6: POST /api/phr/profile/{userId}/avatar
Step 7: Avatar updates across all pages
```


### Workflow 3: Toggle Settings

```text
Step 1: Toggle any switch (notifications, dark mode, language)
Step 2: Setting saved immediately (localStorage or Context)
Step 3: UI updates in real-time
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/phr/profile/{userId}/avatar` | Upload avatar |

---


## 7. Connections to Other Pages

| From/To | Direction | Description |
| ------- | --------- | ----------- |
| Profile page | ↔ | Avatar shared between Profile and Settings |
| All pages | ← | Dark mode and language affect entire portal |
| Login page | ← | Logout redirects to login |

---


## 8. AI Agent Improvement Opportunities


- **Smart notifications**: AI learn preferred notification timing


- **Accessibility settings**: AI auto-adjust for user capabilities


- **Data export**: AI generate complete data export (PDPA right)


- **Account insights**: AI show account activity summary

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| users | SELECT / UPDATE | Preferences (JSONB), notification_settings (JSONB) |
| push_subscriptions | INSERT / SELECT / DELETE | Web push notification subscription endpoints |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| /api/settings | GET | SELECT users (preferences, notification_settings) |
| /api/settings | PUT | UPDATE users (preferences, notification_settings) |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
