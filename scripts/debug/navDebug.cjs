/**
 * Navigation Debug - Check what elements are actually on the dashboard
 */
const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runTest() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1920,1080');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    console.log('\n=== NAVIGATION DEBUG ===\n');
    
    // Login first
    await driver.get('http://localhost:3010/login');
    await driver.sleep(2000);
    
    await driver.findElement(By.css('input[type="email"]')).sendKeys('doctor.test@izara.com');
    await driver.findElement(By.css('input[type="password"]')).sendKeys('IzaraDoctor@2024');
    
    // Use the correct button
    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await submitBtn.click();
    
    await driver.sleep(5000);
    
    const url = await driver.getCurrentUrl();
    console.log('Current URL:', url);
    
    if (!url.includes('dashboard')) {
      console.log('LOGIN FAILED - not on dashboard');
      return;
    }
    
    console.log('\n=== Checking ASIDE elements ===');
    const asides = await driver.findElements(By.css('aside'));
    console.log('Number of aside elements:', asides.length);
    
    for (let i = 0; i < asides.length; i++) {
      const isDisplayed = await asides[i].isDisplayed();
      console.log(`  Aside ${i}: displayed=${isDisplayed}`);
      
      if (isDisplayed) {
        const buttons = await asides[i].findElements(By.css('button'));
        console.log(`  Aside ${i} has ${buttons.length} buttons`);
        
        for (let j = 0; j < buttons.length; j++) {
          const text = await buttons[j].getText();
          console.log(`    Button ${j}: "${text}"`);
        }
      }
    }
    
    console.log('\n=== Checking NAV elements ===');
    const navs = await driver.findElements(By.css('nav'));
    console.log('Number of nav elements:', navs.length);
    
    for (let i = 0; i < navs.length; i++) {
      const isDisplayed = await navs[i].isDisplayed();
      console.log(`  Nav ${i}: displayed=${isDisplayed}`);
      
      if (isDisplayed) {
        const buttons = await navs[i].findElements(By.css('button'));
        console.log(`  Nav ${i} has ${buttons.length} buttons`);
        
        for (let j = 0; j < Math.min(buttons.length, 15); j++) {
          const text = await buttons[j].getText();
          if (text.trim()) {
            console.log(`    Button ${j}: "${text}"`);
          }
        }
      }
    }
    
    console.log('\n=== Checking for Logout button ===');
    const logoutBtns = await driver.findElements(By.xpath("//button[contains(text(), 'Logout')]"));
    console.log('Logout buttons found:', logoutBtns.length);
    
    for (let i = 0; i < logoutBtns.length; i++) {
      const isDisplayed = await logoutBtns[i].isDisplayed();
      const text = await logoutBtns[i].getText();
      console.log(`  Logout ${i}: "${text}" displayed=${isDisplayed}`);
    }
    
    // Try specific xpath
    console.log('\n=== Testing specific XPaths ===');
    
    const testXPaths = [
      "//aside//button[contains(., 'Patients')]",
      "//aside//nav//button",
      "//aside/nav/button",
      "//button[.//span[text()='Patients']]",
      "//button/span[text()='Patients']",
      "//aside//button[.//span[text()='Patients']]"
    ];
    
    for (const xpath of testXPaths) {
      const els = await driver.findElements(By.xpath(xpath));
      console.log(`  "${xpath}": ${els.length} matches`);
    }
    
    console.log('\n=== TEST COMPLETE ===\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await driver.quit();
  }
}

runTest();
