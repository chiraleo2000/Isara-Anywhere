# Living Will — Patient Portal

> **SSOT source:** `Processes/Living_Will_Processes.md §4`
> **Synced:** 2025-06-25
> **Portal:** Patient (`Isara-patient-portal`)
> **Use:** Workflow excerpt — edit canonical copy in platform `Processes/`; refresh via `npm run docs:sync-to-apps`.

---
## 4. Patient Portal Workflow


### 4.1. Page & Navigation


- **Page:** `frontend/pages/health/PHRPage.tsx`


- **Tab:** "Living Will" / "พินัยกรรมชีวิต"


- **Component:** `frontend/components/health/LivingWillForm.tsx`


### 4.2. Step-by-Step Process


#### Step 1: Access Living Will Tab

1. Patient logs into Patient Portal
2. Navigates to **Health Studio** → **PHR** → **Living Will** tab
3. If no Living Will exists, shows "Create Living Will" button
4. If Living Will exists, shows current document with Edit/Revoke options


#### Step 2: Create/Edit Living Will

1. Patient clicks "Create Living Will" or "Edit"
2. Form displays with sections:
   - **Statement of Wishes** (free text)
   - **Treatment Preferences** (checkboxes with notes)
   - **Legal Representative** (contact details)
   - **Alternative Representative** (optional)


#### Step 3: PDPA Consent & Sharing Settings

1. Patient must accept PDPA consent checkbox
2. Patient chooses sharing preference:
   - **🔒 Keep Private** - Only patient can view
   - **🌐 Share with Doctors** - All authorized doctors & admins can view
3. System explains: "If you share, ALL doctors who have treated you and hospital administrators will be able to see your Living Will"


#### Step 4: Digital Signature

1. Patient signs digitally (canvas signature)
2. Optional: Witness signature
3. System records timestamp and IP


#### Step 5: Save & Confirm

1. Patient reviews summary
2. Clicks "Save Living Will"
3. System stores to GCS: `patients/{patientId}/living-will.json`
4. Confirmation message with share status displayed


### 4.3. UI Mockup (Patient Portal)

```text
┌──────────────────────────────────────────────────────────────────────┐
│  📋 PHR  │  💊 Medications  │  🩺 Vitals  │  📜 Living Will          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📜 พินัยกรรมชีวิต (Living Will)                                     │
│  ─────────────────────────────────────────────────                   │
│                                                                      │
│  Status: ● ACTIVE                    Effective: 12/12/2025           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ คำแถลงความประสงค์:                                              │ │
│  │ ข้าพเจ้าประสงค์ที่จะไม่รับการรักษาที่ยืดชีวิต...                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  การรักษาที่ไม่ประสงค์:                                              │
│  ❌ CPR / การกู้ชีพ                                                  │
│  ❌ เครื่องช่วยหายใจ                                                 │
│  ❌ ให้อาหารทางสาย                                                   │
│  ❌ ฟอกไต                                                           │
│  ✅ ยาปฏิชีวนะ (เพื่อความสบาย)                                       │
│  ✅ การจัดการความเจ็บปวด                                             │
│                                                                      │
│  ผู้แทนทางกฎหมาย: นางสาวสมหญิง ใจดี (คู่สมรส)                         │
│  โทร: 081-234-5678                                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 🔐 PDPA Sharing Settings                                        │ │
│  │                                                                 │ │
│  │ ◉ Share with Doctors - แพทย์และผู้ดูแลระบบสามารถดูได้           │ │
│  │ ○ Keep Private - เฉพาะคุณเท่านั้นที่เห็น                        │ │
│  │                                                                 │ │
│  │ ℹ️ หากแชร์ แพทย์ทุกคนที่เคยรักษาคุณและผู้ดูแลระบบจะเห็น          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [✏️ Edit]  [🗑️ Revoke]  [📤 Share Settings]                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```