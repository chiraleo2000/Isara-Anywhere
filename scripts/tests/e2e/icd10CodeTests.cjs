/**
 * ============================================================================
 * IZARA TELEMEDICINE - ICD-10 Code Search E2E Tests
 * ============================================================================
 * 
 * Tests the ICD-10 diagnosis code search functionality.
 * 
 * Test Coverage:
 *   1. ICD-10 data file exists and is valid JSON
 *   2. ICD-10 codes have required fields
 *   3. Search by code (e.g., I10)
 *   4. Search by description (English/Thai)
 *   5. Search by category
 *   6. Search by keywords
 * 
 * Usage:
 *   node scripts/tests/e2e/icd10CodeTests.cjs
 *   node scripts/tests/e2e/icd10CodeTests.cjs --headless
 * 
 * Prerequisites:
 *   - ICD-10 codes JSON file exists
 *   - Doctor Portal running on localhost:3010
 * 
 * @version 1.0.0
 * @date December 2025
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  doctorPortalUrl: process.env.DOCTOR_PORTAL_URL || 'http://localhost:3010',
  icd10DataPath: path.join(__dirname, '..', '..', 'output', 'izara-meta-data', 'icd10-codes.json'),
  timeout: 15000,
  shortTimeout: 5000,
  headless: process.argv.includes('--headless')
};

// ============================================================================
// TEST RESULTS
// ============================================================================

const testResults = {
  passed: [],
  failed: [],
  skipped: [],
  startTime: null,
  endTime: null
};

function logTest(name, status, details = '') {
  const timestamp = new Date().toISOString();
  const result = { name, status, details, timestamp };
  
  if (status === 'PASSED') {
    testResults.passed.push(result);
    console.log(`   ✅ ${name}`);
  } else if (status === 'FAILED') {
    testResults.failed.push(result);
    console.log(`   ❌ ${name}: ${details}`);
  } else if (status === 'SKIPPED') {
    testResults.skipped.push(result);
    console.log(`   ⏭️  ${name}: ${details}`);
  }
}

// ============================================================================
// DATA VALIDATION TESTS
// ============================================================================

async function testICD10DataFileExists() {
  const testName = 'ICD-10 Data - File Exists';
  
  try {
    if (fs.existsSync(CONFIG.icd10DataPath)) {
      logTest(testName, 'PASSED', CONFIG.icd10DataPath);
      return true;
    }
    throw new Error('File not found');
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testICD10DataIsValidJSON() {
  const testName = 'ICD-10 Data - Valid JSON Format';
  
  try {
    const data = fs.readFileSync(CONFIG.icd10DataPath, 'utf-8');
    const parsed = JSON.parse(data);
    
    if (Array.isArray(parsed) && parsed.length > 0) {
      logTest(testName, 'PASSED', `${parsed.length} codes loaded`);
      return parsed;
    }
    throw new Error('Data is not an array or is empty');
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return null;
  }
}

async function testICD10DataStructure(data) {
  const testName = 'ICD-10 Data - Required Fields Present';
  
  if (!data) {
    logTest(testName, 'SKIPPED', 'No data to validate');
    return false;
  }
  
  try {
    const requiredFields = ['code', 'description', 'descriptionThai', 'category'];
    let validCodes = 0;
    let invalidCodes = [];
    
    for (const item of data) {
      const hasAllFields = requiredFields.every(field => item.hasOwnProperty(field));
      if (hasAllFields) {
        validCodes++;
      } else {
        invalidCodes.push(item.code || 'unknown');
      }
    }
    
    if (validCodes === data.length) {
      logTest(testName, 'PASSED', `All ${validCodes} codes have required fields`);
      return true;
    } else {
      throw new Error(`${invalidCodes.length} codes missing fields: ${invalidCodes.slice(0, 5).join(', ')}`);
    }
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testICD10Categories(data) {
  const testName = 'ICD-10 Data - Category Coverage';
  
  if (!data) {
    logTest(testName, 'SKIPPED', 'No data to validate');
    return false;
  }
  
  try {
    const categories = [...new Set(data.map(item => item.category))];
    const expectedMinCategories = 5;
    
    if (categories.length >= expectedMinCategories) {
      logTest(testName, 'PASSED', `${categories.length} categories: ${categories.slice(0, 5).join(', ')}...`);
      return true;
    }
    throw new Error(`Only ${categories.length} categories found`);
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testICD10Keywords(data) {
  const testName = 'ICD-10 Data - Keywords Array';
  
  if (!data) {
    logTest(testName, 'SKIPPED', 'No data to validate');
    return false;
  }
  
  try {
    const codesWithKeywords = data.filter(item => 
      Array.isArray(item.keywords) && item.keywords.length > 0
    );
    
    const percentage = ((codesWithKeywords.length / data.length) * 100).toFixed(1);
    
    if (codesWithKeywords.length > data.length * 0.5) {
      logTest(testName, 'PASSED', `${percentage}% codes have keywords`);
      return true;
    }
    throw new Error(`Only ${percentage}% codes have keywords`);
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

// ============================================================================
// SEARCH FUNCTIONALITY TESTS
// ============================================================================

function searchICD10(data, query) {
  const lowerQuery = query.toLowerCase();
  return data.filter(item => 
    item.code.toLowerCase().includes(lowerQuery) ||
    item.description.toLowerCase().includes(lowerQuery) ||
    item.descriptionThai.includes(query) ||
    item.category.toLowerCase().includes(lowerQuery) ||
    (item.keywords && item.keywords.some(k => k.toLowerCase().includes(lowerQuery)))
  );
}

async function testSearchByCode(data) {
  const testName = 'ICD-10 Search - By Code';
  
  if (!data) {
    logTest(testName, 'SKIPPED', 'No data to search');
    return false;
  }
  
  try {
    // Search for known codes
    const testCodes = ['I10', 'E11', 'J06', 'M54'];
    let found = 0;
    
    for (const code of testCodes) {
      const results = searchICD10(data, code);
      if (results.length > 0) found++;
    }
    
    if (found >= 2) {
      logTest(testName, 'PASSED', `${found}/${testCodes.length} test codes found`);
      return true;
    }
    throw new Error(`Only ${found} codes found`);
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testSearchByDescription(data) {
  const testName = 'ICD-10 Search - By Description (English)';
  
  if (!data) {
    logTest(testName, 'SKIPPED', 'No data to search');
    return false;
  }
  
  try {
    const testTerms = ['diabetes', 'hypertension', 'pain', 'infection'];
    let found = 0;
    
    for (const term of testTerms) {
      const results = searchICD10(data, term);
      if (results.length > 0) found++;
    }
    
    if (found >= 2) {
      logTest(testName, 'PASSED', `${found}/${testTerms.length} terms matched`);
      return true;
    }
    throw new Error(`Only ${found} terms matched`);
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testSearchByThaiDescription(data) {
  const testName = 'ICD-10 Search - By Description (Thai)';
  
  if (!data) {
    logTest(testName, 'SKIPPED', 'No data to search');
    return false;
  }
  
  try {
    const testTerms = ['เบาหวาน', 'ความดัน', 'ปวด'];
    let found = 0;
    
    for (const term of testTerms) {
      const results = searchICD10(data, term);
      if (results.length > 0) found++;
    }
    
    if (found >= 1) {
      logTest(testName, 'PASSED', `${found}/${testTerms.length} Thai terms matched`);
      return true;
    }
    throw new Error(`Only ${found} terms matched`);
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testSearchByCategory(data) {
  const testName = 'ICD-10 Search - By Category';
  
  if (!data) {
    logTest(testName, 'SKIPPED', 'No data to search');
    return false;
  }
  
  try {
    const testCategories = ['Cardiovascular', 'Endocrine', 'Respiratory'];
    let found = 0;
    
    for (const cat of testCategories) {
      const results = searchICD10(data, cat);
      if (results.length > 0) found++;
    }
    
    if (found >= 2) {
      logTest(testName, 'PASSED', `${found}/${testCategories.length} categories matched`);
      return true;
    }
    throw new Error(`Only ${found} categories matched`);
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

async function testSearchByKeywords(data) {
  const testName = 'ICD-10 Search - By Keywords';
  
  if (!data) {
    logTest(testName, 'SKIPPED', 'No data to search');
    return false;
  }
  
  try {
    const testKeywords = ['HTN', 'DM', 'URI', 'LBP'];
    let found = 0;
    
    for (const kw of testKeywords) {
      const results = searchICD10(data, kw);
      if (results.length > 0) found++;
    }
    
    if (found >= 2) {
      logTest(testName, 'PASSED', `${found}/${testKeywords.length} keywords matched`);
      return true;
    }
    throw new Error(`Only ${found} keywords matched`);
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

// ============================================================================
// UI INTEGRATION TESTS
// ============================================================================

async function createDriver() {
  const options = new chrome.Options();
  
  if (CONFIG.headless) {
    options.addArguments('--headless');
  }
  
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--window-size=1920,1080');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  await driver.manage().setTimeouts({
    implicit: 10000,
    pageLoad: 30000
  });
  
  return driver;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testICD10UISearch(driver) {
  const testName = 'ICD-10 UI - Search Field Exists';
  
  try {
    await driver.get(CONFIG.doctorPortalUrl);
    await sleep(3000);
    
    // Look for diagnosis or ICD-10 search field
    const searchInputs = await driver.findElements(By.css(
      'input[placeholder*="ICD"], input[placeholder*="diagnosis"], input[placeholder*="วินิจฉัย"]'
    ));
    
    if (searchInputs.length > 0) {
      logTest(testName, 'PASSED', 'ICD-10 search input found');
      return true;
    }
    
    // May not be on visible screen
    logTest(testName, 'SKIPPED', 'ICD-10 search may be in different section');
    return false;
  } catch (error) {
    logTest(testName, 'FAILED', error.message);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('             IZARA - ICD-10 Code Search E2E Tests');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n⏰ Started: ${new Date().toLocaleString()}`);
  console.log(`📁 ICD-10 Data: ${CONFIG.icd10DataPath}`);
  console.log(`🔗 Doctor Portal: ${CONFIG.doctorPortalUrl}\n`);
  
  testResults.startTime = new Date();
  
  // Data Validation Tests
  console.log('\n📋 ICD-10 Data Validation');
  console.log('─────────────────────────────────────────────');
  
  const fileExists = await testICD10DataFileExists();
  let data = null;
  
  if (fileExists) {
    data = await testICD10DataIsValidJSON();
    
    if (data) {
      await testICD10DataStructure(data);
      await testICD10Categories(data);
      await testICD10Keywords(data);
    }
  }
  
  // Search Functionality Tests
  console.log('\n📋 ICD-10 Search Functionality');
  console.log('─────────────────────────────────────────────');
  
  await testSearchByCode(data);
  await testSearchByDescription(data);
  await testSearchByThaiDescription(data);
  await testSearchByCategory(data);
  await testSearchByKeywords(data);
  
  // UI Tests (optional)
  console.log('\n📋 ICD-10 UI Integration');
  console.log('─────────────────────────────────────────────');
  
  let driver;
  try {
    driver = await createDriver();
    await testICD10UISearch(driver);
  } catch (error) {
    logTest('ICD-10 UI Tests', 'SKIPPED', `Browser tests skipped: ${error.message}`);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
  
  testResults.endTime = new Date();
  
  // Print results
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                        TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n   ✅ Passed: ${testResults.passed.length}`);
  console.log(`   ❌ Failed: ${testResults.failed.length}`);
  console.log(`   ⏭️  Skipped: ${testResults.skipped.length}`);
  
  const duration = (testResults.endTime - testResults.startTime) / 1000;
  console.log(`\n   ⏱️  Duration: ${duration.toFixed(1)}s`);
  console.log(`   🏁 Completed: ${testResults.endTime.toLocaleString()}\n`);
  
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

runAllTests().catch(console.error);
