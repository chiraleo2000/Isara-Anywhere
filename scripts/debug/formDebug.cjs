/**
 * Form Interaction Debug - Check what happens when clicking the button
 */
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runTest() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1920,1080');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    console.log('\n=== FORM DEBUG ===\n');
    
    // Load page
    await driver.get('http://localhost:3010/login');
    await driver.sleep(3000);
    
    // Find all buttons
    const allButtons = await driver.findElements(By.css('button'));
    console.log('All buttons on page:', allButtons.length);
    
    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].getText();
      const type = await allButtons[i].getAttribute('type');
      const onclick = await allButtons[i].getAttribute('onclick');
      console.log(`  Button ${i}: "${text}" type="${type}" onclick="${onclick}"`);
    }
    
    // Fill form
    console.log('\nFilling form...');
    const email = await driver.findElement(By.css('input[type="email"]'));
    const password = await driver.findElement(By.css('input[type="password"]'));
    
    await email.sendKeys('admin.test@izara.com');
    await password.sendKeys('IzaraAdmin@2024');
    
    // Try different click methods
    console.log('\nTrying different submission methods...');
    
    // Method 1: Find submit button
    try {
      const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
      const btnText = await submitBtn.getText();
      console.log('Found submit button:', btnText);
      
      // Check form
      const form = await driver.findElement(By.css('form'));
      const formAction = await form.getAttribute('action');
      console.log('Form action:', formAction);
      
      // Inject listener to capture submit
      await driver.executeScript(`
        const form = document.querySelector('form');
        if (form) {
          form.addEventListener('submit', (e) => {
            console.log('🚀 FORM SUBMIT EVENT TRIGGERED');
            window.formSubmitTriggered = true;
          });
        }
        
        document.querySelectorAll('button').forEach((btn, i) => {
          btn.addEventListener('click', (e) => {
            console.log('🔘 BUTTON CLICKED:', i, btn.textContent);
            window.buttonClicked = i;
          });
        });
      `);
      
      // Click it
      console.log('\nClicking submit button...');
      await submitBtn.click();
      
      await driver.sleep(3000);
      
      // Check if events fired
      const formSubmitted = await driver.executeScript('return window.formSubmitTriggered');
      const buttonClicked = await driver.executeScript('return window.buttonClicked');
      
      console.log('Form submit triggered:', formSubmitted);
      console.log('Button clicked:', buttonClicked);
      
    } catch (e) {
      console.log('No submit button found:', e.message);
    }
    
    // Check current URL
    const url = await driver.getCurrentUrl();
    console.log('\nCurrent URL:', url);
    
    // Get React state
    console.log('\nChecking React state...');
    const reactState = await driver.executeScript(`
      // Try to find React fiber
      const root = document.getElementById('root');
      if (root && root._reactRootContainer) {
        return 'React root found';
      }
      return 'No React root';
    `);
    console.log('React:', reactState);
    
    // Check if there's any loading state
    const loadingElements = await driver.findElements(By.css('.animate-spin, .loading, [data-loading="true"]'));
    console.log('Loading indicators found:', loadingElements.length);
    
    // Check for disabled buttons
    const disabledBtns = await driver.findElements(By.css('button:disabled'));
    console.log('Disabled buttons:', disabledBtns.length);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await driver.quit();
  }
}

runTest();
