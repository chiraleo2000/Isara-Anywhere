/**
 * Check React mounting and console errors
 */
const { Builder, By, logging } = require('selenium-webdriver');
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
    console.log('\n=== REACT MOUNTING DEBUG ===\n');
    
    // Login
    console.log('1. Loading login page...');
    await driver.get('http://localhost:3010/login');
    await driver.sleep(5000);
    
    // Get console logs
    console.log('\n2. Console logs on login page:');
    let logs = await driver.manage().logs().get(logging.Type.BROWSER);
    logs.forEach(log => {
      if (log.level.name === 'SEVERE' || log.message.includes('error') || log.message.includes('Error')) {
        console.log(`  [${log.level.name}] ${log.message}`);
      }
    });
    
    // Check if React root is mounted
    const rootContent = await driver.executeScript(`
      const root = document.getElementById('root');
      return {
        exists: !!root,
        innerHTML: root ? root.innerHTML.substring(0, 500) : 'no root',
        childCount: root ? root.childElementCount : 0
      };
    `);
    console.log('\n3. React root on login:', rootContent);
    
    // Fill and submit login
    console.log('\n4. Filling login form...');
    await driver.findElement(By.css('input[type="email"]')).sendKeys('doctor.test@izara.com');
    await driver.findElement(By.css('input[type="password"]')).sendKeys('IzaraDoctor@2024');
    await driver.findElement(By.css('button[type="submit"]')).click();
    
    console.log('5. Waiting 10 seconds for navigation...');
    await driver.sleep(10000);
    
    const url = await driver.getCurrentUrl();
    console.log('6. Current URL:', url);
    
    // Get console logs after login
    console.log('\n7. Console logs after login:');
    logs = await driver.manage().logs().get(logging.Type.BROWSER);
    logs.forEach(log => {
      console.log(`  [${log.level.name}] ${log.message.substring(0, 200)}`);
    });
    
    // Check React root again
    const rootContentAfter = await driver.executeScript(`
      const root = document.getElementById('root');
      return {
        exists: !!root,
        innerHTML: root ? root.innerHTML.substring(0, 1000) : 'no root',
        childCount: root ? root.childElementCount : 0
      };
    `);
    console.log('\n8. React root after login:');
    console.log('   Exists:', rootContentAfter.exists);
    console.log('   Child count:', rootContentAfter.childCount);
    console.log('   Inner HTML:', rootContentAfter.innerHTML);
    
    console.log('\n=== TEST COMPLETE ===\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await driver.quit();
  }
}

runTest();
