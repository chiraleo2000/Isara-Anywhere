/**
 * Deep Login Debug Test - intercepts network and captures everything
 */
const { Builder, By, until, logging } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runTest() {
  const prefs = new logging.Preferences();
  prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
  
  const options = new chrome.Options();
  options.addArguments('--window-size=1920,1080');
  options.setLoggingPrefs(prefs);
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    console.log('\n=== DEEP LOGIN DEBUG ===\n');
    
    // 1. Load page
    console.log('1. Loading page...');
    await driver.get('http://localhost:3010/login');
    await driver.sleep(2000);
    
    // 2. Inject network interceptor BEFORE login
    console.log('2. Injecting network interceptor...');
    await driver.executeScript(`
      window.networkLogs = [];
      
      // Override fetch
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const url = args[0];
        const options = args[1] || {};
        
        console.log('📡 FETCH:', url, JSON.stringify(options));
        window.networkLogs.push({ type: 'FETCH_REQUEST', url, options: JSON.stringify(options) });
        
        try {
          const response = await originalFetch.apply(this, args);
          
          // Clone to read body
          const clone = response.clone();
          let body;
          try {
            body = await clone.text();
          } catch (e) {
            body = 'Could not read body';
          }
          
          console.log('📥 RESPONSE:', response.status, body.substring(0, 500));
          window.networkLogs.push({ 
            type: 'FETCH_RESPONSE', 
            url, 
            status: response.status, 
            body: body.substring(0, 1000) 
          });
          
          return response;
        } catch (error) {
          console.error('❌ FETCH ERROR:', error.message);
          window.networkLogs.push({ type: 'FETCH_ERROR', url, error: error.message });
          throw error;
        }
      };
    `);
    
    // 3. Fill form
    console.log('3. Filling login form...');
    await driver.findElement(By.css('input[type="email"]')).sendKeys('admin.test@izara.com');
    await driver.findElement(By.css('input[type="password"]')).sendKeys('IzaraAdmin@2024');
    
    // 4. Click login
    console.log('4. Clicking Sign In...');
    const button = await driver.findElement(By.xpath("//button[contains(text(),'Sign In') or contains(text(),'เข้าสู่ระบบ')]"));
    await button.click();
    
    // 5. Wait
    console.log('5. Waiting 10 seconds...');
    await driver.sleep(10000);
    
    // 6. Get network logs
    console.log('\n6. Network Logs:');
    const networkLogs = await driver.executeScript('return window.networkLogs || [];');
    networkLogs.forEach((log, i) => {
      console.log(`   [${i}] ${log.type}: ${log.url || ''}`);
      if (log.status) console.log(`       Status: ${log.status}`);
      if (log.body) console.log(`       Body: ${log.body.substring(0, 200)}`);
      if (log.error) console.log(`       Error: ${log.error}`);
    });
    
    // 7. Get browser console
    console.log('\n7. Browser Console:');
    const logs = await driver.manage().logs().get(logging.Type.BROWSER);
    logs.forEach(log => {
      if (log.message.includes('FETCH') || log.message.includes('RESPONSE') || 
          log.message.includes('LOGIN') || log.message.includes('ERROR') ||
          log.message.includes('error') || log.message.includes('❌')) {
        console.log(`   ${log.message.substring(0, 300)}`);
      }
    });
    
    // 8. Final state
    const url = await driver.getCurrentUrl();
    console.log('\n8. Final URL:', url);
    
    const storage = await driver.executeScript(`
      return {
        user: localStorage.getItem('izara_current_user'),
        token: localStorage.getItem('izara_auth_token')
      };
    `);
    console.log('9. localStorage:', storage.user ? 'HAS DATA' : 'EMPTY');
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await driver.quit();
  }
}

runTest();
