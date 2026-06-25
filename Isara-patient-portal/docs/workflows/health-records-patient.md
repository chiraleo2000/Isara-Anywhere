# Health Records — Patient PHR

> **SSOT source:** `Processes/Health_Records_Processes.md §0–1.1`
> **Synced:** 2025-06-25
> **Portal:** Patient (`Isara-patient-portal`)
> **Use:** Workflow excerpt — edit canonical copy in platform `Processes/`; refresh via `npm run docs:sync-to-apps`.

---
## 0. Login & Authentication


- **Patient**
  - Logs in via Patient Portal (`LoginPage.tsx`) using their own patient account (patientId)
  - Accesses dashboard, health logs (PHR), appointment and lab results associated with their own account
  - **Credentials stored**: PostgreSQL `users` table with bcrypt hashed password


- **Doctor/Admin**
  - Logs in via Doctor Portal (`DoctorDashboard.tsx`) using their own doctor account (doctorId)
  - Can view and edit full EMR, see patient PHR, and manage lab results for patients under their care
  - **Credentials stored**: PostgreSQL `users` table with bcrypt hashed password

---


## 1. Health Record Creation & Data Sources


### 1.1 Patient Self-Entered PHR Data


- **Patient Portal PHR Page (`PHRPage.tsx`)**
  - Patient enters vital signs, medications, allergies, and chronic conditions
  - Data is saved to PostgreSQL: `phr` and `vital_signs` tables
  - All data includes `patient_id` and `recorded_at` timestamp
  - Data is immediately available to authorized doctors


- **Supported PHR Data Types:**
  - Vital Signs (blood pressure, heart rate, temperature, weight, oxygen saturation, blood glucose)
  - Current Medications (name, dosage, frequency, purpose, status)
  - Allergies (allergen name, type, severity)
  - Chronic Conditions (condition name, diagnosed date, status)
  - **Lifestyle Data (editable by patient):**
    - Diet (regular, vegetarian, vegan, keto, low-carb, other)
    - Exercise frequency (none, light, moderate, active)
    - Sleep hours (5-9+ hours/night)
    - Smoking status (never, former, current)
    - Alcohol consumption (never, occasional, moderate, frequent)
    - Supplements usage (free text)
    - Other treatments (free text for alternative medicine, massage, etc.)
  - Vaccinations
  - Medical Documents (uploaded files)
