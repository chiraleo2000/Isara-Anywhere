/**
 * Check what's on the dashboard page
 */
const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

async function runTest() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1920,1080');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    console.log('\n=== DASHBOARD PAGE DEBUG ===\n');
    
    // Login
    await driver.get('http://localhost:3010/login');
    await driver.sleep(2000);
    
    await driver.findElement(By.css('input[type="email"]')).sendKeys('doctor.test@izara.com');
    await driver.findElement(By.css('input[type="password"]')).sendKeys('IzaraDoctor@2024');
    await driver.findElement(By.css('button[type="submit"]')).click();
    
    await driver.sleep(5000);
    
    const url = await driver.getCurrentUrl();
    console.log('URL:', url);
    
    // Get window size
    const size = await driver.manage().window().getRect();
    console.log('Window size:', size.width, 'x', size.height);
    
    // Get HTML structure
    const html = await driver.executeScript('return document.body.innerHTML');
    console.log('\nPage HTML length:', html.length);
    
    // Save HTML for inspection
    fs.writeFileSync('dashboard_debug.html', html);
    console.log('Saved to dashboard_debug.html');
    
    // Check what major elements exist
    console.log('\n=== Major Elements ===');
    
    const elements = [
      { name: 'aside', selector: 'aside' },
      { name: 'nav', selector: 'nav' },
      { name: 'header', selector: 'header' },
      { name: 'main', selector: 'main' },
      { name: 'div.lg\\:flex', selector: 'div.lg\\:flex' },
      { name: 'buttons total', selector: 'button' },
      { name: 'hidden lg:flex', selector: '.hidden.lg\\:flex' },
      { name: 'lg:hidden', selector: '.lg\\:hidden' },
    ];
    
    for (const { name, selector } of elements) {
      const els = await driver.findElements(By.css(selector));
      const visibleCount = await Promise.all(
        els.map(async el => {
          try {
            return await el.isDisplayed();
          } catch {
            return false;
          }
        })
      ).then(arr => arr.filter(Boolean).length);
      console.log(`  ${name}: ${els.length} found, ${visibleCount} visible`);
    }
    
    // Check for text content
    console.log('\n=== Text Content Check ===');
    const bodyText = await driver.findElement(By.css('body')).getText();
    const keywords = ['Dashboard', 'Patients', 'Schedule', 'Logout', 'ยินดีต้อนรับ', 'แดชบอร์ด'];
    for (const kw of keywords) {
      console.log(`  "${kw}": ${bodyText.includes(kw) ? 'FOUND' : 'NOT FOUND'}`);
    }
    
    // Get all buttons text
    console.log('\n=== All Button Texts ===');
    const buttons = await driver.findElements(By.css('button'));
    for (let i = 0; i < Math.min(buttons.length, 20); i++) {
      try {
        const text = await buttons[i].getText();
        const displayed = await buttons[i].isDisplayed();
        if (text.trim()) {
          console.log(`  Button ${i}: "${text.trim().substring(0, 50)}" visible=${displayed}`);
        }
      } catch (e) {
        // ignore stale elements
      }
    }
    
    console.log('\n=== TEST COMPLETE ===\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await driver.quit();
  }
}

runTest();
