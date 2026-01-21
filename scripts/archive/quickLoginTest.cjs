const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

(async () => {
  const options = new chrome.Options();
  options.addArguments('--window-size=1920,1080');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    console.log('1. Loading doctor portal...');
    await driver.get('http://localhost:3010');
    await driver.sleep(3000);
    
    console.log('2. Filling email...');
    await driver.findElement(By.css('input[type="email"]')).sendKeys('admin.test@izara.com');
    
    console.log('3. Filling password...');
    await driver.findElement(By.css('input[type="password"]')).sendKeys('IzaraAdmin@2024');
    
    console.log('4. Clicking Sign In...');
    const btn = await driver.findElement(By.xpath("//button[contains(text(),'Sign In')]"));
    await btn.click();
    
    console.log('5. Waiting for redirect...');
    await driver.sleep(10000);
    
    const url = await driver.getCurrentUrl();
    console.log('Final URL:', url);
    
    if (url.includes('dashboard')) {
      console.log('SUCCESS: Redirected to dashboard!');
    } else {
      console.log('STILL ON:', url);
      
      // Check for errors
      try {
        const pageSource = await driver.getPageSource();
        if (pageSource.includes('Invalid') || pageSource.includes('error')) {
          console.log('Found error on page');
        }
      } catch (e) {}
    }
    
  } finally {
    await driver.quit();
  }
})();
