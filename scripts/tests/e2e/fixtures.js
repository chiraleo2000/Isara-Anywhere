/**
 * Izara Telemedicine - Playwright Test Fixtures
 * Shared test data, utilities, and authentication helpers
 */

const { test: base, expect } = require('@playwright/test');

// ============================================================================
// TEST USERS
// ============================================================================
const TEST_USERS = {
  admin: {
    email: 'admin.test@izara.com',
    password: 'IzaraAdmin@2024',
    name: 'Admin User',
    role: 'admin',
  },
  doctor: {
    email: 'doctor.test@izara.com',
    password: 'IzaraDoctor@2024',
    name: 'Doctor Test',
    role: 'doctor',
  },
  patient: {
    email: 'demo.test@gmail.com',
    password: 'P@ssw0rd',
    name: 'Demo Patient',
    role: 'patient',
  },
  patientSomchai: {
    email: 'Somchai.Mankong@gmail.com',
    password: 'P@ssw0rd',
    name: 'Somchai Mankong',
    role: 'patient',
  },
};

// ============================================================================
// PORTAL URLS
// ============================================================================
const PORTALS = {
  doctor: 'http://localhost:3010',
  patient: 'http://localhost:3005',
};

// ============================================================================
// PAGE ROUTES
// ============================================================================
const DOCTOR_ROUTES = {
  login: '/login',
  dashboard: '/doctor/{userId}',
  schedule: '/doctor/{userId}/schedule',
  availability: '/doctor/{userId}/availability',
  patients: '/doctor/{userId}/patients',
  meeting: '/doctor/{userId}/meeting',
  consultants: '/doctor/{userId}/medical-consultants',
  medicalContent: '/doctor/{userId}/medical-content',
  clinicalResources: '/doctor/{userId}/clinical-resources',
  doctorManagement: '/doctor/{userId}/doctor-management', // Admin only
  appointmentManagement: '/doctor/{userId}/appointment-management', // Admin only
};

const PATIENT_ROUTES = {
  login: '/login',
  dashboard: '/',
  appointments: '/appointments',
  aiDoctor: '/ai-doctor',
  healthLibrary: '/health-studio',
  phr: '/phr',
  timeline: '/timeline',
  pdpa: '/pdpa',
  livingWill: '/living-will',
  map: '/map',
  settings: '/settings',
  profile: '/profile',
};

// ============================================================================
// EXTEND BASE TEST WITH CUSTOM FIXTURES
// ============================================================================
const test = base.extend({
  // Logged in admin page
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginDoctorPortal(page, TEST_USERS.admin);
    await use(page);
    await context.close();
  },

  // Logged in doctor page
  doctorPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginDoctorPortal(page, TEST_USERS.doctor);
    await use(page);
    await context.close();
  },

  // Logged in patient page
  patientPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginPatientPortal(page, TEST_USERS.patient);
    await use(page);
    await context.close();
  },
});

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Login to Doctor Portal with retry mechanism for transient failures
 */
async function loginDoctorPortal(page, user, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Check if page context is still open before proceeding
      if (page.isClosed()) {
        throw new Error('Page context was closed');
      }
      
      await page.goto(`${PORTALS.doctor}/login`, { timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      
      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', user.email);
      await page.fill('input[type="password"], input[name="password"]', user.password);
      
      // Click login button
      await page.click('button[type="submit"]');
      
      // Wait for navigation to dashboard
      await page.waitForURL(/\/doctor\//, { timeout: 25000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      return page;
    } catch (error) {
      // If page is closed, don't retry - just throw
      if (page.isClosed()) {
        throw new Error('Page context was closed during login');
      }
      if (attempt < retries) {
        console.log(`Login attempt ${attempt + 1} failed, retrying...`);
        try {
          await page.waitForTimeout(1500); // Brief pause before retry
        } catch (e) {
          // Page might be closed, throw original error
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
}

/**
 * Login to Patient Portal with retry mechanism for transient failures
 */
async function loginPatientPortal(page, user, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(`${PORTALS.patient}/login`);
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', user.email);
      await page.fill('input[type="password"], input[name="password"]', user.password);
      
      // Click login button
      await page.click('button[type="submit"]');
      
      // Wait for navigation away from login page (to dashboard or main page)
      await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 20000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      return page;
    } catch (error) {
      if (attempt < retries) {
        console.log(`Patient login attempt ${attempt + 1} failed, retrying...`);
        await page.waitForTimeout(1000);
      } else {
        throw error;
      }
    }
  }
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================
async function navigateToPatientPage(page, route) {
  await page.goto(`${PORTALS.patient}${route}`);
  await page.waitForLoadState('networkidle');
}

async function navigateToDoctorPage(page, route, userId) {
  const fullRoute = route.replace('{userId}', userId);
  await page.goto(`${PORTALS.doctor}${fullRoute}`);
  await page.waitForLoadState('networkidle');
}

async function getUserIdFromUrl(page) {
  const url = page.url();
  const match = url.match(/doctor\/([^/]+)/);
  return match ? match[1] : null;
}

// ============================================================================
// UI INTERACTION HELPERS
// ============================================================================
async function clickButton(page, buttonText) {
  await page.click(`button:has-text("${buttonText}")`);
}

async function clickLink(page, linkText) {
  await page.click(`a:has-text("${linkText}")`);
}

async function waitForToast(page, message) {
  await page.waitForSelector(`text="${message}"`, { timeout: 5000 });
}

async function waitForModal(page, title) {
  await page.waitForSelector(`[role="dialog"]:has-text("${title}")`, { timeout: 5000 });
}

async function closeModal(page) {
  await page.click('[role="dialog"] button:has-text("ปิด"), [role="dialog"] button:has-text("Close"), [role="dialog"] [aria-label="close"]');
}

async function fillForm(page, formData) {
  for (const [name, value] of Object.entries(formData)) {
    const input = page.locator(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`);
    if (await input.count() > 0) {
      const tagName = await input.evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await input.selectOption(value);
      } else {
        await input.fill(value);
      }
    }
  }
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================
async function expectPageTitle(page, title) {
  await expect(page.locator('h1, h2').first()).toContainText(title, { timeout: 5000 });
}

async function expectElementVisible(page, selector) {
  await expect(page.locator(selector)).toBeVisible({ timeout: 5000 });
}

async function expectNoErrors(page) {
  // Check for common error indicators
  const errorIndicators = [
    '.error-message',
    '[role="alert"]:has-text("error")',
    'text="Something went wrong"',
    'text="ไม่สามารถ"',
    'text="เกิดข้อผิดพลาด"',
  ];
  
  for (const indicator of errorIndicators) {
    const count = await page.locator(indicator).count();
    if (count > 0) {
      // Only fail if it's a real error, not just an error state indicator
      const isVisible = await page.locator(indicator).first().isVisible();
      if (isVisible) {
        throw new Error(`Error found on page: ${indicator}`);
      }
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  test,
  expect,
  TEST_USERS,
  PORTALS,
  DOCTOR_ROUTES,
  PATIENT_ROUTES,
  loginDoctorPortal,
  loginPatientPortal,
  navigateToPatientPage,
  navigateToDoctorPage,
  getUserIdFromUrl,
  clickButton,
  clickLink,
  waitForToast,
  waitForModal,
  closeModal,
  fillForm,
  expectPageTitle,
  expectElementVisible,
  expectNoErrors,
};
