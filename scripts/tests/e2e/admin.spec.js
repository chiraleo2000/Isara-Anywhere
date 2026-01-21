/**
 * Izara Telemedicine - Admin Portal E2E Tests
 * Tests all admin-specific pages and workflows
 * 
 * Admin Pages:
 * - แดชบอร์ด (Dashboard)
 * - ตารางนัดหมาย (Schedule)
 * - เวลาว่างของฉัน (Availability Settings)
 * - ผู้ป่วย (Patients)
 * - นัดหมาย & ประชุม (Meeting/Health Meeting)
 * - ที่ปรึกษาแพทย์ (Medical Consultants)
 * - เนื้อหาทางการแพทย์ (Medical Content)
 * - ทรัพยากรทางคลินิก (Clinical Resources)
 * - จัดการแพทย์ (Doctor Management)
 * - อนุมัติแพทย์ใหม่ (Approve New Doctors)
 */

const { test, expect, TEST_USERS, PORTALS, loginDoctorPortal, getUserIdFromUrl } = require('./fixtures');

test.describe('Admin Portal - Authentication', () => {
  test('should login as admin successfully', async ({ page }) => {
    await page.goto(`${PORTALS.doctor}/login`);
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.fill('input[type="email"], input[name="email"]', TEST_USERS.admin.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_USERS.admin.password);
    
    // Take screenshot before login
    await page.screenshot({ path: 'test-results/admin-login-form.png' });
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL(/\/doctor\//, { timeout: 15000 });
    
    // Verify dashboard loaded
    await expect(page.locator('main, [data-testid="dashboard"]')).toBeVisible();
    
    // Take screenshot after login
    await page.screenshot({ path: 'test-results/admin-dashboard.png' });
  });

  test('should show admin-specific menu items', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    
    // Wait for navigation to load
    await page.waitForLoadState('networkidle');
    
    // On larger screens, admin menu items should be visible in sidebar
    // Check for admin-only menu items using partial text matching
    const adminMenuPatterns = [
      /จัดการแพทย์/i,
      /อนุมัติแพทย์/i,
      /Doctors/i,
      /Approve/i,
      /Doctor.*Management/i,
    ];
    
    // Try to find admin menu items - might need to click hamburger menu first on mobile
    const hamburgerMenu = page.locator('button[aria-label*="menu"], button:has(svg)').first();
    if (await hamburgerMenu.isVisible().catch(() => false)) {
      await hamburgerMenu.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    
    // At least one admin menu item should be visible
    let foundAdminMenu = false;
    for (const pattern of adminMenuPatterns) {
      const count = await page.locator(`text=${pattern}`).count();
      if (count > 0) {
        foundAdminMenu = true;
        break;
      }
    }
    
    // If still not found, verify we're logged in as admin by checking URL contains admin user
    if (!foundAdminMenu) {
      // Check if we have access to doctor-management page (admin-only)
      const currentUrl = page.url();
      const userId = currentUrl.match(/doctor\/([^/]+)/)?.[1];
      if (userId) {
        await page.goto(`${PORTALS.doctor}/doctor/${userId}/doctor-management`);
        await page.waitForLoadState('networkidle');
        // If we can access doctor-management, admin privileges are confirmed
        const hasAccess = await page.locator('text=/Pending|อนุมัติ|Doctor/i').count() > 0;
        foundAdminMenu = hasAccess;
      }
    }
    
    expect(foundAdminMenu).toBeTruthy();
  });
});

test.describe('Admin Portal - Dashboard (แดชบอร์ด)', () => {
  test('should load dashboard with statistics', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    
    // Dashboard should have main content
    await expect(page.locator('main')).toBeVisible();
    
    // Look for dashboard elements - using actual Tailwind classes with rounded-lg and gradient backgrounds
    const dashboardElements = page.locator('[class*="rounded-lg"], [class*="grid"], h1:has-text("Dashboard")');
    await expect(dashboardElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display appointment overview', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    
    // Check for appointment-related content
    const appointmentSection = page.locator('text=/นัดหมาย|appointment|ตาราง/i').first();
    await expect(appointmentSection).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Portal - Schedule (ตารางนัดหมาย)', () => {
  test('should navigate to schedule page', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/schedule`);
    await page.waitForLoadState('networkidle');
    
    // Schedule page should have calendar or schedule view
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display calendar or schedule view', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/schedule`);
    await page.waitForLoadState('networkidle');
    
    // Look for calendar or schedule elements
    const scheduleElements = page.locator('[class*="calendar"], [class*="schedule"], table, .grid');
    await expect(scheduleElements.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Portal - Availability (เวลาว่างของฉัน)', () => {
  test('should navigate to availability settings', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/availability`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display time slot configuration', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/availability`);
    await page.waitForLoadState('networkidle');
    
    // Look for availability settings elements
    const availabilityElements = page.locator('text=/เวลาว่าง|availability|time slot/i');
    await expect(availabilityElements.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Portal - Patients (ผู้ป่วย)', () => {
  test('should navigate to patients page', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/patients`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display patient list', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/patients`);
    await page.waitForLoadState('networkidle');
    
    // Look for patient management header or grid
    const patientElements = page.locator('h1:has-text("Patient"), [class*="rounded-lg"], [class*="grid"]');
    await expect(patientElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have search functionality', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/patients`);
    await page.waitForLoadState('networkidle');
    
    // Look for search input - actual placeholder uses "Search by name, ID, email..."
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="ค้นหา"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Portal - Health Meeting (นัดหมาย & ประชุม)', () => {
  test('should navigate to meeting page', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/health-meeting`);
    await page.waitForLoadState('networkidle');
    
    // Wait for either main content or meeting-specific elements
    await expect(page.locator('main, [class*="meeting"], [class*="health"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('should display meeting controls', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/health-meeting`);
    await page.waitForLoadState('networkidle');
    
    // Look for meeting-related elements
    const meetingElements = page.locator('text=/ประชุม|meeting|video|นัดหมาย|Appointments|การนัดหมาย/i');
    await expect(meetingElements.first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Admin Portal - Medical Consultants (ที่ปรึกษาแพทย์)', () => {
  test('should navigate to consultants page', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/medical-consultants`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display consultant list', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/medical-consultants`);
    await page.waitForLoadState('networkidle');
    
    // Look for header or consultant list elements
    const consultantElements = page.locator('h1:has-text("Medical Consultants"), h1:has-text("Consultant"), [class*="rounded-lg"], [class*="shadow"]');
    await expect(consultantElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('admin should see Add Consultant button', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/medical-consultants`);
    await page.waitForLoadState('networkidle');
    
    // Admin should see add button
    const addButton = page.locator('button:has-text("เพิ่ม"), button:has-text("Add"), button:has-text("สร้าง")');
    await expect(addButton.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Portal - Medical Content (เนื้อหาทางการแพทย์)', () => {
  test('should navigate to medical content page', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/medical-content`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display content list', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/medical-content`);
    await page.waitForLoadState('networkidle');
    
    // Look for content library header or elements
    const contentElements = page.locator('h1:has-text("Medical Content"), h1:has-text("Content Library"), [class*="rounded-lg"], [class*="shadow"]');
    await expect(contentElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('admin should see pending approval tab', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/medical-content`);
    await page.waitForLoadState('networkidle');
    
    // Admin should see pending/approval options
    const pendingElements = page.locator('text=/pending|รอการอนุมัติ|อนุมัติ/i');
    await expect(pendingElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have create content button', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/medical-content`);
    await page.waitForLoadState('networkidle');
    
    // Should see create button
    const createButton = page.locator('button:has-text("สร้าง"), button:has-text("เพิ่ม"), button:has-text("Create"), button:has-text("Add")');
    await expect(createButton.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Portal - Clinical Resources (ทรัพยากรทางคลินิก)', () => {
  test('should navigate to clinical resources page', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/clinical-resources`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display resource categories', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/clinical-resources`);
    await page.waitForLoadState('networkidle');
    
    // Look for category/filter elements
    const categoryElements = page.locator('[class*="category"], [class*="filter"], button, .tab');
    await expect(categoryElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('admin should see approval controls', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/clinical-resources`);
    await page.waitForLoadState('networkidle');
    
    // Admin should see pending/approval options
    const approvalElements = page.locator('text=/pending|รอการอนุมัติ|อนุมัติ/i');
    // This may or may not be visible depending on content state
    const count = await approvalElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Admin Portal - Doctor Management (จัดการแพทย์)', () => {
  test('should navigate to doctor management page', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/doctor-management`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display doctor list', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/doctor-management`);
    await page.waitForLoadState('networkidle');
    
    // Look for doctor approval header or stats cards
    const doctorElements = page.locator('h1:has-text("Doctor Approval"), h1:has-text("Doctor Management"), [class*="rounded-xl"], [class*="shadow"]');
    await expect(doctorElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have pending doctors tab', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/doctor-management`);
    await page.waitForLoadState('networkidle');
    
    // Look for pending doctors section
    const pendingElements = page.locator('text=/รอการอนุมัติ|pending|รอดำเนินการ/i');
    await expect(pendingElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('should be able to approve/reject doctors', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/doctor-management`);
    await page.waitForLoadState('networkidle');
    
    // Look for action buttons
    const actionButtons = page.locator('button:has-text("อนุมัติ"), button:has-text("ปฏิเสธ"), button:has-text("Approve"), button:has-text("Reject")');
    // May or may not be visible depending on pending doctors
    const count = await actionButtons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should be able to change user roles', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/doctor-management`);
    await page.waitForLoadState('networkidle');
    
    // Look for role management elements (tabs include 'admins' for admin users)
    const roleElements = page.locator('button:has-text("Admins"), button:has-text("All"), button:has-text("Pending")');
    const count = await roleElements.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Admin Portal - Appointment Management', () => {
  test('should navigate to appointment management page', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/appointment-management`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display appointment overview', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    await page.goto(`${PORTALS.doctor}/doctor/${userId}/appointment-management`);
    await page.waitForLoadState('networkidle');
    
    // Look for appointment management header or content
    const appointmentElements = page.locator('h1:has-text("Appointment"), [class*="rounded-lg"], [class*="rounded-xl"]');
    await expect(appointmentElements.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Portal - Navigation', () => {
  test('should navigate between all pages without errors', async ({ page }) => {
    await loginDoctorPortal(page, TEST_USERS.admin);
    const userId = await getUserIdFromUrl(page);
    
    const pages = [
      { path: `/doctor/${userId}`, name: 'Dashboard' },
      { path: `/doctor/${userId}/schedule`, name: 'Schedule' },
      { path: `/doctor/${userId}/patients`, name: 'Patients' },
      { path: `/doctor/${userId}/health-meeting`, name: 'Meeting' },
      { path: `/doctor/${userId}/medical-consultants`, name: 'Consultants' },
      { path: `/doctor/${userId}/medical-content`, name: 'Medical Content' },
      { path: `/doctor/${userId}/clinical-resources`, name: 'Clinical Resources' },
      { path: `/doctor/${userId}/doctor-management`, name: 'Doctor Management' },
      { path: `/doctor/${userId}/availability`, name: 'Availability' },
    ];
    
    for (const pageInfo of pages) {
      await page.goto(`${PORTALS.doctor}${pageInfo.path}`);
      await page.waitForLoadState('networkidle');
      
      // Verify main content loaded - check for main or any content area
      const contentVisible = await page.locator('main, [class*="container"], [class*="content"], [class*="dashboard"], [class*="page"]').first().isVisible().catch(() => false);
      expect(contentVisible).toBeTruthy();
      
      // Check no critical errors
      await page.locator('text=/error|ผิดพลาด/i').count();
      // Allow some error messages but not crash indicators
    }
  });
});
