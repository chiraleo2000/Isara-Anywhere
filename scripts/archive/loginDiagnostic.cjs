/**
 * Detailed Login Diagnostic Test
 * Captures browser console and network errors
 */
const { Builder, By, until, logging } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runTest() {
  const prefs = new logging.Preferences();
  prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
  prefs.setLevel(logging.Type.PERFORMANCE, logging.Level.ALL);
  
  const options = new chrome.Options();
  options.addArguments('--window-size=1920,1080');
  options.setLoggingPrefs(prefs);
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    console.log('\n=== DETAILED LOGIN TEST ===\n');
    
    // 1. Load page
    console.log('1. Loading http://localhost:3010/login...');
    await driver.get('http://localhost:3010/login');
    await driver.sleep(3000);
    
    const pageTitle = await driver.getTitle();
    console.log('   Page title:', pageTitle);
    
    // 2. Get browser console logs BEFORE login
    console.log('\n2. Browser console BEFORE login:');
    let logs = await driver.manage().logs().get(logging.Type.BROWSER);
    logs.forEach(log => {
      if (log.level.name !== 'WARNING') {
        console.log(`   [${log.level.name}] ${log.message.substring(0, 200)}`);
      }
    });
    
    // 3. Fill form
    console.log('\n3. Filling form...');
    const emailInput = await driver.findElement(By.css('input[type="email"]'));
    await emailInput.clear();
    await emailInput.sendKeys('admin.test@izara.com');
    
    const passwordInput = await driver.findElement(By.css('input[type="password"]'));
    await passwordInput.clear();
    await passwordInput.sendKeys('IzaraAdmin@2024');
    
    // 4. Click button
    console.log('4. Clicking Sign In button...');
    const signInButton = await driver.findElement(By.xpath("//button[contains(text(),'Sign In') or contains(text(),'เข้าสู่ระบบ')]"));
    
    // Check if button is enabled
    const isEnabled = await signInButton.isEnabled();
    console.log('   Button enabled:', isEnabled);
    
    await signInButton.click();
    
    // 5. Wait and check
    console.log('5. Waiting 8 seconds...');
    await driver.sleep(8000);
    
    // 6. Get browser console logs AFTER login
    console.log('\n6. Browser console AFTER login:');
    logs = await driver.manage().logs().get(logging.Type.BROWSER);
    logs.forEach(log => {
      console.log(`   [${log.level.name}] ${log.message.substring(0, 300)}`);
    });
    
    // 7. Check URL
    const finalUrl = await driver.getCurrentUrl();
    console.log('\n7. Final URL:', finalUrl);
    
    // 8. Check for error messages
    console.log('\n8. Checking for errors on page...');
    try {
      const errorElements = await driver.findElements(By.css('.text-red-500, .text-red-600, .error-message, [role="alert"]'));
      for (const el of errorElements) {
        const text = await el.getText();
        if (text.trim()) {
          console.log('   ERROR FOUND:', text);
        }
      }
    } catch (e) {
      console.log('   No error elements found');
    }
    
    // 9. Get page content summary
    console.log('\n9. Page content check:');
    const bodyText = await driver.findElement(By.css('body')).getText();
    
    // Check for key indicators
    if (bodyText.includes('Dashboard') || bodyText.includes('แดชบอร์ด')) {
      console.log('   ✅ Dashboard text found - LOGIN SUCCEEDED');
    } else if (bodyText.includes('Sign In') || bodyText.includes('เข้าสู่ระบบ')) {
      console.log('   ❌ Still on login page');
      
      // Check what else is on the page
      if (bodyText.includes('Invalid')) console.log('   -> Found "Invalid" text');
      if (bodyText.includes('error')) console.log('   -> Found "error" text');
      if (bodyText.includes('pending')) console.log('   -> Found "pending" text');
      if (bodyText.includes('approval')) console.log('   -> Found "approval" text');
    }
    
    // 10. Check localStorage
    console.log('\n10. Checking localStorage...');
    const localStorageData = await driver.executeScript(`
      return {
        user: localStorage.getItem('izara_current_user'),
        token: localStorage.getItem('izara_auth_token'),
        expiry: localStorage.getItem('izara_session_expiry')
      };
    `);
    console.log('   User:', localStorageData.user ? 'SET' : 'NOT SET');
    console.log('   Token:', localStorageData.token ? 'SET' : 'NOT SET');
    console.log('   Expiry:', localStorageData.expiry ? 'SET' : 'NOT SET');
    
    if (localStorageData.user) {
      console.log('   User data:', localStorageData.user.substring(0, 100) + '...');
    }
    
    console.log('\n=== TEST COMPLETE ===\n');
    
  } catch (error) {
    console.error('Test error:', error.message);
    
    // Get final console logs on error
    try {
      const logs = await driver.manage().logs().get(logging.Type.BROWSER);
      console.log('\nBrowser console on error:');
      logs.forEach(log => {
        console.log(`   [${log.level.name}] ${log.message}`);
      });
    } catch (e) {}
    
  } finally {
    await driver.quit();
  }
}

runTest();
