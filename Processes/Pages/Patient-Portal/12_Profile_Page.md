# 👤 Patient Portal — Profile Page

**Route:** `/profile`  
**Component:** `src/pages/profile/ProfilePage.tsx`  
**Access:** 🔒 Authenticated patients  
**Thai Title:** โปรไฟล์

---

## 1. Purpose

View and edit patient personal profile information including avatar, contact details, and emergency contact.

---

## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🌈 Gradient Header                                                  │
│  ┌──────┐                                                           │
│  │ 📷   │  นายสมชาย มั่นคง                                          │
│  │Avatar │  demo.test@gmail.com                                     │
│  │      │  [📷 เปลี่ยนรูป]                                          │
│  └──────┘                                                           │
│                                                                     │
│  [✏️ แก้ไข / 💾 บันทึก]                                              │
│                                                                     │
│  ┌── Personal Info ────────────────────────────────────────────┐   │
│  │  ชื่อ-นามสกุล: [นายสมชาย มั่นคง        ]                    │   │
│  │  เบอร์โทร:     [081-234-5678            ]                    │   │
│  │  อีเมล:        demo.test@gmail.com (read-only display)      │   │
│  │  วันเกิด:      [1990-01-15              ]                    │   │
│  │  กรุ๊ปเลือด:   [A+ ▼]                                       │   │
│  │  ที่อยู่:       [123 ถนนสุขุมวิท กรุงเทพ   ]                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌── Emergency Contact ────────────────────────────────────────┐   │
│  │  ชื่อผู้ติดต่อฉุกเฉิน: [คุณสมหญิง           ]                │   │
│  │  เบอร์โทร:          [082-345-6789       ]                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Features & Actions

| Feature | Description |
| ------- | ----------- |
| **View mode** | Read-only display of all profile fields |
| **Edit mode** | Toggleable edit mode for all editable fields |
| **Avatar upload** | JPG/PNG/WebP, max 5MB, converted to base64 |
| **Save profile** | Saves all changes to PostgreSQL |
| **Blood type selector** | Dropdown: A, B, AB, O variants |

---

## 4. Editable Fields

| Field | Editable | Type |
| ----- | -------- | ---- |
| Name | ✅ | Text |
| Phone | ✅ | Tel |
| Email | ❌ (display only) | — |
| Date of Birth | ✅ | Date |
| Blood Type | ✅ | Select (A+/A-/B+/B-/AB+/AB-/O+/O-) |
| Address | ✅ | Text |
| Emergency Contact Name | ✅ | Text |
| Emergency Contact Phone | ✅ | Tel |

---

## 5. Workflows

### Workflow 1: View Profile

```text
Step 1: Navigate to /profile
Step 2: Profile data loaded from AuthContext
Step 3: All fields displayed in read-only mode
```

### Workflow 2: Edit Profile

```text
Step 1: Click "แก้ไข" (Edit) button
Step 2: Fields become editable input fields
Step 3: Modify desired fields
Step 4: Click "บันทึก" (Save)
Step 5: PUT /api/auth/profile → Updates user record
Step 6: AuthContext.updateUser() refreshes local state
Step 7: Success notification shown
```

### Workflow 3: Change Avatar

```text
Step 1: Click "เปลี่ยนรูป" (Change Photo) button
Step 2: File picker opens (JPG/PNG/WebP only)
Step 3: Select image (max 5MB)
Step 4: Image converted to base64
Step 5: POST /api/phr/profile/{userId}/avatar
Step 6: Avatar updates in header and sidebar
```

---

## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/auth/profile` | Get profile data |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/phr/profile/{userId}/avatar` | Upload avatar image |

---

## 7. Connections to Other Pages

| From/To | Direction | Description |
| ------- | --------- | ----------- |
| Settings page | ↔ | Avatar change also accessible from Settings |
| Sidebar user info | ← | Shows profile name + avatar |
| Header avatar | ← | Shows profile avatar |
| PHR page | ↔ | Blood type + health info shared |

---

## 8. AI Agent Improvement Opportunities

- **Profile completeness**: AI score profile completion and suggest missing fields
- **Smart address**: AI auto-complete Thai addresses
- **Photo validation**: AI verify avatar is appropriate
- **Emergency contact verification**: AI verify emergency contact phone is reachable
