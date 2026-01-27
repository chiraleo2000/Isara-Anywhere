/**
 * Medicine Content (Health Articles) Workflow Test  
 * Based on: Processes/Medicine_Content_Processes.md
 * 
 * Tests:
 * - Doctor creates health article (draft)
 * - Thai-first content policy
 * - Image support
 * - Doctor submits for approval
 * - Admin approves/rejects
 * - Patient views published articles
 * - Category filtering
 */

import { test, expect, Page } from '@playwright/test';

const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL || 'http://localhost:3005';
const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';

const TEST_USERS = {
  patient: {
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd'
  },
  doctor: {
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024'
  },
  admin: {
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024'
  }
};

async function loginPatient(page: Page) {
  await page.goto(`${PATIENT_PORTAL_URL}/auth/login`);
  await page.fill('input[type="email"]', TEST_USERS.patient.email);
  await page.fill('input[type="password"]', TEST_USERS.patient.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${PATIENT_PORTAL_URL}/**`);
}

async function loginDoctor(page: Page) {
  await page.goto(`${DOCTOR_PORTAL_URL}/auth/login`);
  await page.fill('input[type="email"]', TEST_USERS.doctor.email);
  await page.fill('input[type="password"]', TEST_USERS.doctor.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DOCTOR_PORTAL_URL}/**`);
}

async function loginAdmin(page: Page) {
  await page.goto(`${DOCTOR_PORTAL_URL}/auth/login`);
  await page.fill('input[type="email"]', TEST_USERS.admin.email);
  await page.fill('input[type="password"]', TEST_USERS.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DOCTOR_PORTAL_URL}/**`);
}

test.describe('Medicine Content Workflow', () => {
  
  test('Doctor creates health article with Thai-first content', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/medical-content`);
    
    await page.click('button:has-text("สร้างเนื้อหา")');
    
    // Thai content (required, shown first)
    await page.fill('input[name="titleThai"]', 'วิธีการดูแลสุขภาพหัวใจ');
    await page.fill('textarea[name="contentThai"]', `
# วิธีการดูแลสุขภาพหัวใจ

## บทนำ
หัวใจเป็นอวัยวะสำคัญที่ต้องดูแลเป็นพิเศษ

## การออกกำลังกาย
- เดินเร็ว 30 นาที วันละ 5 ครั้งต่อสัปดาห์
- ว่ายน้ำ
- ปั่นจักรยาน

[image:https://storage.googleapis.com/izara-meta-data/images/heart-exercise.jpg:การออกกำลังกายเพื่อหัวใจ]

## การรับประทานอาหาร
- ผัก ผลไม้
- ลดไขมัน ลดเกลือ
- ดื่มน้ำเพียงพอ

## การตรวจสุขภาพ
ตรวจสุขภาพประจำปี เพื่อคัดกรองโรคหัวใจ
    `);
    
    // English content (optional)
    await page.fill('input[name="titleEnglish"]', 'Heart Health Care Guide');
    await page.fill('textarea[name="contentEnglish"]', `
# Heart Health Care Guide

## Introduction
The heart is a vital organ requiring special care

## Exercise
- Brisk walk 30 min, 5 days/week
- Swimming
- Cycling

## Diet
- Vegetables, fruits
- Low fat, low salt
- Adequate water

## Health screening
Annual checkup for heart disease screening
    `);
    
    // Select category
    await page.selectOption('select[name="category"]', 'preventive-care');
    
    // Add tags
    await page.fill('input[name="tags"]', 'หัวใจ, heart, cardiovascular, prevention');
    
    // Save as draft
    await page.click('button:has-text("บันทึกร่าง")');
    await page.waitForSelector('text=บันทึกสำเร็จ');
    
    console.log('✅ Doctor created health article draft');
  });
  
  test('Doctor submits article for approval', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/medical-content`);
    
    // View own drafts
    await page.click('button:has-text("ร่างของฉัน")');
    await page.click('text=วิธีการดูแลสุขภาพหัวใจ');
    
    // Submit for approval
    await page.click('button:has-text("ส่งขออนุมัติ")');
    await page.click('button:has-text("ยืนยัน")');
    
    await page.waitForSelector('text=ส่งขออนุมัติสำเร็จ');
    
    console.log('✅ Doctor submitted article');
  });
  
  test('Admin sees pending approval notification', async ({ page }) => {
    await loginAdmin(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/dashboard`);
    
    // Check pending badge
    const badge = await page.locator('[data-testid="pending-content-badge"]');
    await expect(badge).toBeVisible();
    
    const count = await badge.textContent();
    expect(parseInt(count || '0')).toBeGreaterThan(0);
    
    console.log('✅ Admin sees pending content');
  });
  
  test('Admin reviews and approves article', async ({ page }) => {
    await loginAdmin(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/medical-content`);
    
    // View pending articles
    await page.click('button:has-text("รออนุมัติ")');
    await page.click('text=วิธีการดูแลสุขภาพหัวใจ');
    
    // Verify Thai content is primary
    await expect(page.locator('h1:has-text("วิธีการดูแลสุขภาพหัวใจ")')).toBeVisible();
    
    // Verify image rendering
    await expect(page.locator('img[alt*="การออกกำลังกาย"]')).toBeVisible();
    
    // Add approval comment
    await page.fill('textarea[name="reviewComment"]', 'เนื้อหาถูกต้อง ครบถ้วน อนุมัติ');
    
    await page.click('button:has-text("อนุมัติ")');
    await page.waitForSelector('text=อนุมัติสำเร็จ');
    
    console.log('✅ Admin approved article');
  });
  
  test('Patient views published article in health library', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/health-library`);
    
    // Verify article appears
    await expect(page.locator('text=วิธีการดูแลสุขภาพหัวใจ')).toBeVisible();
    
    // Click to read
    await page.click('text=วิธีการดูแลสุขภาพหัวใจ');
    
    // Verify full content
    await expect(page.locator('text=การออกกำลังกาย')).toBeVisible();
    await expect(page.locator('text=การรับประทานอาหาร')).toBeVisible();
    
    // Verify image
    await expect(page.locator('img[alt*="การออกกำลังกาย"]')).toBeVisible();
    
    console.log('✅ Patient viewed published article');
  });
  
  test('Patient filters articles by category', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/health-library`);
    
    // Filter by preventive care
    await page.selectOption('select[name="category"]', 'preventive-care');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="article-card"]')).toHaveCount({ minimum: 1 });
    
    // Filter by chronic disease
    await page.selectOption('select[name="category"]', 'chronic-disease');
    
    console.log('✅ Patient filtered articles');
  });
  
  test('Patient searches articles', async ({ page }) => {
    await loginPatient(page);
    
    await page.goto(`${PATIENT_PORTAL_URL}/health-library`);
    
    // Search Thai
    await page.fill('input[name="search"]', 'หัวใจ');
    await expect(page.locator('text=วิธีการดูแลสุขภาพหัวใจ')).toBeVisible();
    
    // Search English
    await page.fill('input[name="search"]', 'heart');
    await expect(page.locator('text=วิธีการดูแลสุขภาพหัวใจ')).toBeVisible();
    
    console.log('✅ Patient searched articles');
  });
  
  test('Admin rejects article with feedback', async ({ page }) => {
    await loginAdmin(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/medical-content`);
    await page.click('button:has-text("รออนุมัติ")');
    
    // Assuming there's another pending article
    const pendingArticles = await page.locator('[data-testid="pending-article"]').count();
    
    if (pendingArticles > 0) {
      await page.locator('[data-testid="pending-article"]').first().click();
      
      await page.fill('textarea[name="reviewComment"]', 'กรุณาเพิ่มข้อมูลอ้างอิงและแหล่งที่มา');
      await page.click('button:has-text("ปฏิเสธ")');
      
      await page.waitForSelector('text=ปฏิเสธสำเร็จ');
      
      console.log('✅ Admin rejected article');
    }
  });
  
});
