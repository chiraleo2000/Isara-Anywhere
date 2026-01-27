/**
 * Clinical Resources & Medical Library Workflows Test
 * Based on: Processes/Clinical_Resources_&_Medical_Library_Workflows.md
 * 
 * Tests:
 * - Doctor creates clinical resource (draft)
 * - Doctor submits for approval
 * - Admin reviews and approves/rejects
 * - Published resources appear in library
 * - Thai-first content policy
 * - Image support in content
 * - RAG knowledge base indexing
 */

import { test, expect, Page } from '@playwright/test';

const DOCTOR_PORTAL_URL = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010';

const TEST_USERS = {
  doctor: {
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024'
  },
  admin: {
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024'
  }
};

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

test.describe('Clinical Resources Workflow', () => {
  
  let resourceId: string;
  
  test('Doctor creates clinical resource draft', async ({ page }) => {
    await loginDoctor(page);
    
    // Navigate to Clinical Resources
    await page.goto(`${DOCTOR_PORTAL_URL}/clinical-resources`);
    
    // Click Create New Resource
    await page.click('button:has-text("เพิ่มทรัพยากร")');
    
    // Fill Thai content (required, shown first)
    await page.fill('input[name="titleThai"]', 'แนวทางการรักษาความดันโลหิตสูง 2026');
    await page.fill('textarea[name="contentThai"]', `
# แนวทางการรักษาความดันโลหิตสูง 2026

## บทนำ
ความดันโลหิตสูงเป็นปัญหาสุขภาพที่พบบ่อยในประเทศไทย

## การวินิจฉัย
- วัดความดัน >= 140/90 mmHg ในการตรวจ 2-3 ครั้ง
- ตรวจเลือดประเมินการทำงานของไต

[image:https://storage.googleapis.com/izara-meta-data/images/bp-chart.jpg:แผนภูมิความดันโลหิต]

## การรักษา
1. ปรับเปลี่ยนพฤติกรรม
2. ใช้ยาลดความดัน
3. ติดตามผลอย่างสม่ำเสมอ
    `);
    
    // Fill English content (optional)
    await page.fill('input[name="titleEnglish"]', 'Hypertension Management Guidelines 2026');
    await page.fill('textarea[name="contentEnglish"]', `
# Hypertension Management Guidelines 2026

## Introduction
Hypertension is a common health problem in Thailand.

## Diagnosis
- Blood pressure >= 140/90 mmHg in 2-3 measurements
- Blood tests to assess kidney function

## Treatment
1. Lifestyle modifications
2. Antihypertensive medications
3. Regular follow-up
    `);
    
    // Select category
    await page.selectOption('select[name="category"]', 'clinical-guidelines');
    
    // Add tags
    await page.fill('input[name="tags"]', 'ความดันโลหิตสูง, hypertension, cardiovascular');
    
    // Save as draft
    await page.click('button:has-text("บันทึกร่าง")');
    
    // Verify success
    await page.waitForSelector('text=บันทึกสำเร็จ');
    
    // Get resource ID
    const url = page.url();
    resourceId = url.match(/resources\/([A-Z0-9-]+)/)?.[1] || '';
    expect(resourceId).toBeTruthy();
    
    console.log('✅ Doctor created draft resource:', resourceId);
  });
  
  test('Doctor submits resource for admin approval', async ({ page }) => {
    await loginDoctor(page);
    
    // Navigate to own resources
    await page.goto(`${DOCTOR_PORTAL_URL}/clinical-resources`);
    
    // Find draft resource
    await page.click('button:has-text("ร่างของฉัน")');
    await page.click(`text=แนวทางการรักษาความดันโลหิตสูง`);
    
    // Submit for approval
    await page.click('button:has-text("ส่งขออนุมัติ")');
    
    // Confirm
    await page.click('button:has-text("ยืนยัน")');
    
    // Verify status changed
    await page.waitForSelector('text=รออนุมัติ');
    
    console.log('✅ Doctor submitted resource for approval');
  });
  
  test('Admin sees pending approval notification', async ({ page }) => {
    await loginAdmin(page);
    
    // Navigate to dashboard
    await page.goto(`${DOCTOR_PORTAL_URL}/dashboard`);
    
    // Check pending badge
    const pendingBadge = await page.locator('[data-testid="pending-content-badge"]');
    const count = await pendingBadge.textContent();
    
    expect(parseInt(count || '0')).toBeGreaterThan(0);
    
    console.log('✅ Admin sees pending content:', count);
  });
  
  test('Admin reviews and approves resource', async ({ page }) => {
    await loginAdmin(page);
    
    // Navigate to Clinical Resources
    await page.goto(`${DOCTOR_PORTAL_URL}/clinical-resources`);
    
    // View pending approvals
    await page.click('button:has-text("รออนุมัติ")');
    
    // Find the resource
    await page.click('text=แนวทางการรักษาความดันโลหิตสูง');
    
    // Verify Thai content is primary
    const thaiTitle = await page.locator('h1:has-text("แนวทางการรักษาความดันโลหิตสูง")');
    await expect(thaiTitle).toBeVisible();
    
    // Verify image rendering
    const image = await page.locator('img[alt*="แผนภูมิความดันโลหิต"]');
    await expect(image).toBeVisible();
    
    // Add review comment
    await page.fill('textarea[name="reviewComment"]', 'เนื้อหาครบถ้วน ตรงตามมาตรฐาน อนุมัติ');
    
    // Approve
    await page.click('button:has-text("อนุมัติ")');
    
    // Verify success
    await page.waitForSelector('text=อนุมัติสำเร็จ');
    
    console.log('✅ Admin approved resource');
  });
  
  test('Published resource appears in library', async ({ page }) => {
    await loginDoctor(page);
    
    // Navigate to Clinical Resources
    await page.goto(`${DOCTOR_PORTAL_URL}/clinical-resources`);
    
    // Search for the resource
    await page.fill('input[name="search"]', 'ความดันโลหิตสูง');
    
    // Verify resource appears
    await page.waitForSelector('text=แนวทางการรักษาความดันโลหิตสูง');
    
    // Verify status is published
    const statusBadge = await page.locator('span:has-text("เผยแพร่แล้ว")');
    await expect(statusBadge).toBeVisible();
    
    console.log('✅ Published resource visible in library');
  });
  
  test('AI can query published resource', async ({ page }) => {
    await loginDoctor(page);
    
    // Navigate to AI Chat
    await page.goto(`${DOCTOR_PORTAL_URL}/ai-chat`);
    
    // Ask question about the resource
    await page.fill('textarea[name="message"]', 'แนวทางการรักษาความดันโลหิตสูงล่าสุดคืออะไร');
    await page.click('button:has-text("ส่ง")');
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="ai-response"]', { timeout: 15000 });
    
    // Verify response mentions the guideline
    const response = await page.locator('[data-testid="ai-response"]').last().textContent();
    expect(response).toContain('ความดันโลหิต');
    
    // Verify source citation
    const citation = await page.locator('text=แหล่งอ้างอิง');
    await expect(citation).toBeVisible();
    
    console.log('✅ AI successfully queried published resource');
  });
  
  test('Doctor can edit own published resource (triggers re-approval)', async ({ page }) => {
    await loginDoctor(page);
    
    // Navigate to resource
    await page.goto(`${DOCTOR_PORTAL_URL}/clinical-resources`);
    await page.click('text=แนวทางการรักษาความดันโลหิตสูง');
    
    // Edit content
    await page.click('button:has-text("แก้ไข")');
    await page.fill('textarea[name="contentThai"]', 'Updated content...');
    await page.click('button:has-text("บันทึก")');
    
    // Verify status changed to pending
    await page.waitForSelector('text=รออนุมัติ');
    
    console.log('✅ Edit triggered re-approval');
  });
  
  test('Admin rejects resource with feedback', async ({ page }) => {
    await loginAdmin(page);
    
    // Navigate to pending resources
    await page.goto(`${DOCTOR_PORTAL_URL}/clinical-resources`);
    await page.click('button:has-text("รออนุมัติ")');
    await page.click('text=แนวทางการรักษาความดันโลหิตสูง');
    
    // Reject with comment
    await page.fill('textarea[name="reviewComment"]', 'กรุณาเพิ่มข้อมูลอ้างอิงจากแหล่งที่มาที่เชื่อถือได้');
    await page.click('button:has-text("ปฏิเสธ")');
    
    // Verify success
    await page.waitForSelector('text=ปฏิเสธสำเร็จ');
    
    console.log('✅ Admin rejected with feedback');
  });
  
  test('Doctor receives rejection notification', async ({ page }) => {
    await loginDoctor(page);
    
    await page.goto(`${DOCTOR_PORTAL_URL}/dashboard`);
    
    // Check notifications
    await page.click('[data-testid="notification-bell"]');
    
    // Verify rejection notification
    const notification = await page.locator('text=เนื้อหาของคุณถูกปฏิเสธ');
    await expect(notification).toBeVisible();
    
    // Click to view feedback
    await notification.click();
    
    // Verify feedback message
    const feedback = await page.locator('text=กรุณาเพิ่มข้อมูลอ้างอิง');
    await expect(feedback).toBeVisible();
    
    console.log('✅ Doctor received rejection notification');
  });
  
});
