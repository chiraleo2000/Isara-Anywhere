const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Going to login...');
  await page.goto('http://localhost:3010/login', { timeout: 10000 });
  console.log('Login page loaded');
  
  await page.fill('input[type="email"]', 'doctor.test@izara.com');
  await page.fill('input[type="password"]', 'IzaraDoctor@2024');
  await page.click('button[type="submit"]');
  console.log('Submitted login');
  
  await page.waitForTimeout(2000);
  console.log('Going to consultants...');
  
  const start = Date.now();
  const response = await page.goto('http://localhost:3010/doctor/DOC-TEST-001/consultants', { 
    waitUntil: 'domcontentloaded',
    timeout: 10000 
  });
  console.log('Consultants page loaded in', Date.now() - start, 'ms');
  console.log('Status:', response.status());
  
  const content = await page.textContent('body', { timeout: 3000 }).catch(() => 'failed to get content');
  console.log('Content length:', content.length);
  console.log('Has consultants:', content.includes('Consultant') || content.includes('ที่ปรึกษา'));
  
  await browser.close();
  console.log('Done!');
})();
