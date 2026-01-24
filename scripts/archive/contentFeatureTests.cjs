/**
 * Medical Content Feature Tests
 * Tests the complete content workflow from doctor portal to patient portal
 * Validates data sync, API endpoints, and content management features
 */

const fetch = require('node-fetch');

// Configuration
const CONFIG = {
  local: {
    patientApi: 'http://localhost:3004',
    patientFrontend: 'http://localhost:3005',
    doctorMainApi: 'http://localhost:3009',
    doctorGcsApi: 'http://localhost:3012',
    doctorFrontend: 'http://localhost:3010',
  },
  cloud: {
    patientPortal: 'https://izara-patient-portal-724889190329.asia-southeast1.run.app',
    doctorPortal: 'https://izara-doctor-portal-724889190329.asia-southeast1.run.app',
  }
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helpers
function log(msg, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' };
  console.log(`${icons[type] || ''} ${msg}`);
}

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function runTest(name, testFn) {
  process.stdout.write(`  Testing: ${name}... `);
  try {
    const result = await testFn();
    if (result.success) {
      console.log('PASSED', result.details ? `(${result.details})` : '');
      results.passed++;
      results.tests.push({ name, status: 'passed', details: result.details });
    } else {
      console.log('FAILED:', result.error);
      results.failed++;
      results.tests.push({ name, status: 'failed', error: result.error });
    }
  } catch (error) {
    console.log('ERROR:', error.message);
    results.failed++;
    results.tests.push({ name, status: 'error', error: error.message });
  }
}

// ============================================================================
// LOCAL TESTS - API Endpoints
// ============================================================================

async function testLocalPatientContentApi() {
  const response = await fetchWithTimeout(`${CONFIG.local.patientApi}/api/content/medical`);
  const data = await response.json();
  
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  
  if (!Array.isArray(data.articles)) {
    return { success: false, error: 'Invalid response structure' };
  }
  
  // Verify all returned articles are published
  const nonPublished = data.articles.filter(a => a.status !== 'published');
  if (nonPublished.length > 0) {
    return { success: false, error: 'Non-published articles returned to patient' };
  }
  
  return { success: true, details: `${data.articles.length} published articles` };
}

async function testLocalPatientTagsApi() {
  const response = await fetchWithTimeout(`${CONFIG.local.patientApi}/api/content/tags/medical`);
  const data = await response.json();
  
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  
  if (!Array.isArray(data.tags)) {
    return { success: false, error: 'Invalid response structure' };
  }
  
  return { success: true, details: `${data.tags.length} tags` };
}

async function testLocalDoctorContentApi() {
  const response = await fetchWithTimeout(`${CONFIG.local.doctorGcsApi}/api/content/medical`);
  const data = await response.json();
  
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  
  if (!Array.isArray(data.articles)) {
    return { success: false, error: 'Invalid response structure' };
  }
  
  return { success: true, details: `${data.articles.length} total articles` };
}

async function testLocalDoctorTagsApi() {
  const response = await fetchWithTimeout(`${CONFIG.local.doctorGcsApi}/api/content/tags/medical`);
  const data = await response.json();
  
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  
  if (!Array.isArray(data.tags)) {
    return { success: false, error: 'Invalid response structure' };
  }
  
  return { success: true, details: `${data.tags.length} tags` };
}

async function testLocalDoctorClinicalResourcesApi() {
  const response = await fetchWithTimeout(`${CONFIG.local.doctorGcsApi}/api/content/clinical`);
  const data = await response.json();
  
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  
  return { success: true, details: `${data.resources?.length || 0} clinical resources` };
}

async function testLocalDataSync() {
  // Fetch from both portals
  const [patientRes, doctorRes] = await Promise.all([
    fetchWithTimeout(`${CONFIG.local.patientApi}/api/content/medical`),
    fetchWithTimeout(`${CONFIG.local.doctorGcsApi}/api/content/medical`)
  ]);
  
  const patientData = await patientRes.json();
  const doctorData = await doctorRes.json();
  
  const patientArticles = patientData.articles || [];
  const doctorArticles = doctorData.articles || [];
  const publishedDoctorArticles = doctorArticles.filter(a => a.status === 'published');
  
  // Patient should see same published articles as doctor
  if (patientArticles.length !== publishedDoctorArticles.length) {
    return { 
      success: false, 
      error: `Sync mismatch: Patient sees ${patientArticles.length}, Doctor has ${publishedDoctorArticles.length} published` 
    };
  }
  
  // Check article IDs match
  const patientIds = new Set(patientArticles.map(a => a.id));
  const doctorPublishedIds = new Set(publishedDoctorArticles.map(a => a.id));
  
  for (const id of doctorPublishedIds) {
    if (!patientIds.has(id)) {
      return { success: false, error: `Article ${id} missing from patient view` };
    }
  }
  
  return { success: true, details: `${patientArticles.length} articles synced` };
}

async function testArticleViewTracking() {
  // Get an article ID
  const listRes = await fetchWithTimeout(`${CONFIG.local.patientApi}/api/content/medical`);
  const listData = await listRes.json();
  
  if (!listData.articles || listData.articles.length === 0) {
    return { success: true, details: 'No articles to test view tracking' };
  }
  
  const articleId = listData.articles[0].id;
  
  // Track a view
  const trackRes = await fetchWithTimeout(
    `${CONFIG.local.patientApi}/api/content/medical/${articleId}/view`,
    { method: 'POST' }
  );
  
  if (!trackRes.ok) {
    return { success: false, error: `View tracking failed: HTTP ${trackRes.status}` };
  }
  
  const trackData = await trackRes.json();
  return { success: true, details: `View tracked, count: ${trackData.views}` };
}

// ============================================================================
// CLOUD TESTS - Production Endpoints
// ============================================================================

async function testCloudPatientContentApi() {
  const response = await fetchWithTimeout(`${CONFIG.cloud.patientPortal}/api/content/medical`);
  const data = await response.json();
  
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  
  if (!Array.isArray(data.articles)) {
    return { success: false, error: 'Invalid response structure' };
  }
  
  // Verify all returned articles are published
  const nonPublished = data.articles.filter(a => a.status !== 'published');
  if (nonPublished.length > 0) {
    return { success: false, error: 'Non-published articles in cloud response' };
  }
  
  return { success: true, details: `${data.articles.length} published articles` };
}

async function testCloudDoctorContentApi() {
  const response = await fetchWithTimeout(`${CONFIG.cloud.doctorPortal}/api/content/medical`);
  const data = await response.json();
  
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  
  if (!Array.isArray(data.articles)) {
    return { success: false, error: 'Invalid response structure' };
  }
  
  return { success: true, details: `${data.articles.length} total articles` };
}

async function testCloudDataSync() {
  const [patientRes, doctorRes] = await Promise.all([
    fetchWithTimeout(`${CONFIG.cloud.patientPortal}/api/content/medical`),
    fetchWithTimeout(`${CONFIG.cloud.doctorPortal}/api/content/medical`)
  ]);
  
  const patientData = await patientRes.json();
  const doctorData = await doctorRes.json();
  
  const patientArticles = patientData.articles || [];
  const doctorArticles = doctorData.articles || [];
  const publishedDoctorArticles = doctorArticles.filter(a => a.status === 'published');
  
  if (patientArticles.length !== publishedDoctorArticles.length) {
    return { 
      success: false, 
      error: `Cloud sync mismatch: Patient ${patientArticles.length}, Doctor published ${publishedDoctorArticles.length}` 
    };
  }
  
  return { success: true, details: `${patientArticles.length} articles synced in cloud` };
}

async function testCloudClinicalResources() {
  const response = await fetchWithTimeout(`${CONFIG.cloud.doctorPortal}/api/content/clinical`);
  const data = await response.json();
  
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  
  return { success: true, details: `${data.resources?.length || 0} clinical resources` };
}

// ============================================================================
// CONTENT QUALITY TESTS
// ============================================================================

async function testContentStructure() {
  const response = await fetchWithTimeout(`${CONFIG.local.patientApi}/api/content/medical`);
  const data = await response.json();
  
  if (!data.articles || data.articles.length === 0) {
    return { success: true, details: 'No articles to validate' };
  }
  
  const article = data.articles[0];
  const requiredFields = ['id', 'title', 'content', 'category', 'status'];
  const missingFields = requiredFields.filter(f => !article[f]);
  
  if (missingFields.length > 0) {
    return { success: false, error: `Missing fields: ${missingFields.join(', ')}` };
  }
  
  return { success: true, details: 'All required fields present' };
}

async function testBilingualContent() {
  const response = await fetchWithTimeout(`${CONFIG.local.patientApi}/api/content/medical`);
  const data = await response.json();
  
  if (!data.articles || data.articles.length === 0) {
    return { success: true, details: 'No articles to validate' };
  }
  
  let bilingualCount = 0;
  for (const article of data.articles) {
    if (article.titleTh && article.contentTh) {
      bilingualCount++;
    }
  }
  
  const percentage = Math.round((bilingualCount / data.articles.length) * 100);
  return { success: true, details: `${bilingualCount}/${data.articles.length} bilingual (${percentage}%)` };
}

async function testCategoryDistribution() {
  const response = await fetchWithTimeout(`${CONFIG.local.patientApi}/api/content/medical`);
  const data = await response.json();
  
  if (!data.articles || data.articles.length === 0) {
    return { success: true, details: 'No articles to analyze' };
  }
  
  const categories = {};
  for (const article of data.articles) {
    categories[article.category] = (categories[article.category] || 0) + 1;
  }
  
  const catCount = Object.keys(categories).length;
  return { success: true, details: `${catCount} categories: ${Object.keys(categories).join(', ')}` };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('MEDICAL CONTENT FEATURE TESTS');
  console.log('='.repeat(70));
  console.log(`Started: ${new Date().toISOString()}\n`);
  
  // Check if local servers are running
  log('Checking local services...');
  
  let localAvailable = true;
  try {
    await fetchWithTimeout(`${CONFIG.local.patientApi}/health`, {}, 3000);
    log('Patient API (3004) - Available', 'success');
  } catch {
    log('Patient API (3004) - Not available', 'warn');
    localAvailable = false;
  }
  
  try {
    await fetchWithTimeout(`${CONFIG.local.doctorGcsApi}/api/health`, {}, 3000);
    log('Doctor GCS API (3012) - Available', 'success');
  } catch {
    log('Doctor GCS API (3012) - Not available', 'warn');
    localAvailable = false;
  }
  
  // Local Tests
  if (localAvailable) {
    console.log('\n--- LOCAL API TESTS ---\n');
    
    await runTest('Patient Portal - Medical Content API', testLocalPatientContentApi);
    await runTest('Patient Portal - Tags API', testLocalPatientTagsApi);
    await runTest('Doctor Portal - Medical Content API', testLocalDoctorContentApi);
    await runTest('Doctor Portal - Tags API', testLocalDoctorTagsApi);
    await runTest('Doctor Portal - Clinical Resources API', testLocalDoctorClinicalResourcesApi);
    await runTest('Cross-Portal Data Sync (Local)', testLocalDataSync);
    await runTest('Article View Tracking', testArticleViewTracking);
    
    console.log('\n--- CONTENT QUALITY TESTS ---\n');
    
    await runTest('Content Structure Validation', testContentStructure);
    await runTest('Bilingual Content Check', testBilingualContent);
    await runTest('Category Distribution', testCategoryDistribution);
  } else {
    console.log('\n⚠️  Skipping local tests - servers not available\n');
  }
  
  // Cloud Tests
  console.log('\n--- CLOUD API TESTS ---\n');
  
  await runTest('Cloud Patient - Medical Content API', testCloudPatientContentApi);
  await runTest('Cloud Doctor - Medical Content API', testCloudDoctorContentApi);
  await runTest('Cloud Cross-Portal Data Sync', testCloudDataSync);
  await runTest('Cloud Clinical Resources', testCloudClinicalResources);
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Pass Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests.filter(t => t.status !== 'passed').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (results.failed === 0) {
    console.log('🎉 ALL CONTENT TESTS PASSED! Data sync working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }
  
  console.log('='.repeat(70) + '\n');
  
  return results.failed === 0;
}

// Run tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
