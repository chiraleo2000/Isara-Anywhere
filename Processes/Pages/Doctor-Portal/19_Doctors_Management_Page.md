# 👨‍⚕️ Doctor Portal — Doctors Management Page

**Route:** `/doctors`  
**Component:** `src/pages/DoctorsManagement.tsx`  
**Access:** 🔒 Doctor / Admin  
**Thai Title:** จัดการแพทย์ / Doctors Management

---

## 1. Purpose

Operational doctor directory for viewing doctor profiles, verification status, and availability. Different from Admin Doctor Management (which handles registration approval).

---

## 2. Features

| Feature | Description |
| ------- | ----------- |
| Search | Name, specialty, email |
| Department filter | 8 departments |
| Status filter | Active / Inactive / On-leave |
| Add Doctor | Admin only - quick add form |
| Verify Doctor | Admin only - verify credentials |
| Toggle Status | Admin only - active/inactive toggle |

---

## 3. Department List

| Department | Thai |
| ---------- | ---- |
| Internal Medicine | อายุรกรรม |
| Surgery | ศัลยกรรม |
| Pediatrics | กุมารเวชศาสตร์ |
| OB-GYN | สูติ-นรีเวชวิทยา |
| Orthopedics | กระดูกและข้อ |
| Cardiology | หัวใจ |
| Neurology | ระบบประสาท |
| Emergency | เวชศาสตร์ฉุกเฉิน |

---

## 4. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/doctors` | List all doctors |
| POST | `/api/doctors` | Add doctor (admin) |
| PATCH | `/api/doctors/:id/verify` | Verify doctor |
| PATCH | `/api/doctors/:id/status` | Toggle status |
