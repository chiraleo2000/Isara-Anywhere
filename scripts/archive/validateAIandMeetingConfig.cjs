/**
 * Validation Test Script for AI and Meeting Configuration
 * 
 * Tests:
 * 1. Gemini API connectivity
 * 2. Meeting link generation
 * 3. Environment variable configuration
 * 
 * Usage: node scripts/tests/validateAIandMeetingConfig.cjs
 */

// Load dotenv if available, otherwise proceed without
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, that's okay - we'll read .env files manually
}

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Read .env file manually as fallback
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
  }
  return env;
}

// Load both portal env files
const doctorEnv = loadEnvFile(path.join(__dirname, '..', '..', 'Isara-doctor-portal', '.env'));
const patientEnv = loadEnvFile(path.join(__dirname, '..', '..', 'Isara-patient-portal', '.env'));

// Merge with process.env (env file values as defaults)
Object.assign(process.env, { ...doctorEnv, ...patientEnv });

// ============================================================================
// CONSOLE FORMATTING
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

// ============================================================================
// CONFIGURATION CHECK
// ============================================================================

async function checkEnvironmentConfig() {
  log.header('Environment Configuration Check');
  
  const requiredEnvVars = {
    'VITE_GEMINI_API_KEY': process.env.VITE_GEMINI_API_KEY,
    'VITE_GEMINI_MODEL': process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite',
    'JITSI_DOMAIN': process.env.JITSI_DOMAIN || process.env.VITE_JITSI_DOMAIN || 'meet.jit.si',
    'VITE_GOOGLE_SPEECH_API_KEY': process.env.VITE_GOOGLE_SPEECH_API_KEY
  };
  
  let allConfigured = true;
  
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (value && value.length > 10) {
      // Mask sensitive values
      const masked = value.substring(0, 10) + '...' + value.substring(value.length - 5);
      log.success(`${key}: ${masked}`);
    } else if (value) {
      log.success(`${key}: ${value}`);
    } else {
      log.error(`${key}: NOT CONFIGURED`);
      allConfigured = false;
    }
  }
  
  return allConfigured;
}

// ============================================================================
// GEMINI API TEST
// ============================================================================

async function testGeminiAPI() {
  log.header('Gemini API Test');
  
  const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const GEMINI_MODEL = process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash-lite';
  
  if (!GEMINI_API_KEY) {
    log.error('Gemini API key not found in environment');
    return false;
  }
  
  log.info(`Testing with model: ${GEMINI_MODEL}`);
  log.info(`API Key: ${GEMINI_API_KEY.substring(0, 15)}...`);
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Say "Hello from Izara Telemedicine!" in Thai language. Keep it very short.'
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 100,
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      log.error(`Gemini API HTTP Error: ${response.status}`);
      log.error(`Response: ${errorText.substring(0, 200)}`);
      return false;
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      log.success('Gemini API is working!');
      log.info(`Response: "${text.trim()}"`);
      return true;
    } else {
      log.error('Gemini API returned empty response');
      return false;
    }
    
  } catch (error) {
    log.error(`Gemini API Error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// MEETING LINK GENERATION TEST
// ============================================================================

function testMeetingLinkGeneration() {
  log.header('Meeting Link Generation Test');
  
  const JITSI_DOMAIN = process.env.JITSI_DOMAIN || process.env.VITE_JITSI_DOMAIN || 'meet.jit.si';
  
  try {
    // Generate test room name
    const crypto = require('crypto');
    const testAppointmentId = 'TEST-' + Date.now().toString(36);
    const hash = crypto.createHash('sha256')
      .update(testAppointmentId + Date.now().toString())
      .digest('hex')
      .substring(0, 8);
    
    const roomName = `Izara-${testAppointmentId.substring(0, 8)}-${hash}`;
    
    // Generate Jitsi URL with config
    const params = new URLSearchParams();
    params.set('config.prejoinPageEnabled', 'true');
    params.set('config.startWithAudioMuted', 'false');
    params.set('config.startWithVideoMuted', 'false');
    params.set('config.defaultLanguage', 'th');
    params.set('config.enableClosePage', 'true');
    params.set('interfaceConfig.APP_NAME', 'Izara Telemedicine');
    
    const meetingUrl = `https://${JITSI_DOMAIN}/${roomName}#${params.toString()}`;
    
    log.success(`Meeting link generated successfully`);
    log.info(`Jitsi Domain: ${JITSI_DOMAIN}`);
    log.info(`Room Name: ${roomName}`);
    log.info(`Full URL: ${meetingUrl.substring(0, 80)}...`);
    
    // Validate URL format
    try {
      const url = new URL(meetingUrl);
      if (url.hostname === JITSI_DOMAIN && url.pathname.includes('Izara-')) {
        log.success('Meeting URL format is valid');
        return true;
      }
    } catch {
      log.error('Invalid URL format');
      return false;
    }
    
    return true;
    
  } catch (error) {
    log.error(`Meeting link generation error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// PATIENT PORTAL AI SERVICE TEST
// ============================================================================

async function testPatientPortalAIConfig() {
  log.header('Patient Portal AI Configuration Test');
  
  // Read the patient portal .env file
  const patientEnvPath = path.join(__dirname, '..', '..', 'Isara-patient-portal', '.env');
  
  if (!fs.existsSync(patientEnvPath)) {
    log.warn('Patient portal .env file not found');
    return false;
  }
  
  const envContent = fs.readFileSync(patientEnvPath, 'utf-8');
  
  // Check for Gemini configuration
  const geminiKeyMatch = envContent.match(/VITE_GEMINI_API_KEY=(\S+)/);
  const geminiModelMatch = envContent.match(/VITE_GEMINI_MODEL=(\S+)/);
  const jitsiMatch = envContent.match(/JITSI_DOMAIN=(\S+)/);
  
  if (geminiKeyMatch && geminiKeyMatch[1].startsWith('AIza')) {
    log.success('Patient Portal: Gemini API key configured');
  } else {
    log.error('Patient Portal: Gemini API key not found or invalid');
    return false;
  }
  
  if (geminiModelMatch) {
    log.success(`Patient Portal: Gemini model set to ${geminiModelMatch[1]}`);
  }
  
  if (jitsiMatch) {
    log.success(`Patient Portal: Jitsi domain set to ${jitsiMatch[1]}`);
  } else {
    log.info('Patient Portal: Using default Jitsi domain (meet.jit.si)');
  }
  
  return true;
}

// ============================================================================
// DOCTOR PORTAL AI SERVICE TEST
// ============================================================================

async function testDoctorPortalAIConfig() {
  log.header('Doctor Portal AI Configuration Test');
  
  // Read the doctor portal .env file
  const doctorEnvPath = path.join(__dirname, '..', '..', 'Isara-doctor-portal', '.env');
  
  if (!fs.existsSync(doctorEnvPath)) {
    log.warn('Doctor portal .env file not found');
    return false;
  }
  
  const envContent = fs.readFileSync(doctorEnvPath, 'utf-8');
  
  // Check for Gemini configuration
  const geminiKeyMatch = envContent.match(/VITE_GEMINI_API_KEY=(\S+)/);
  const geminiModelMatch = envContent.match(/VITE_GEMINI_MODEL=(\S+)/);
  const jitsiMatch = envContent.match(/JITSI_DOMAIN=(\S+)/);
  
  if (geminiKeyMatch && geminiKeyMatch[1].startsWith('AIza')) {
    log.success('Doctor Portal: Gemini API key configured');
  } else {
    log.error('Doctor Portal: Gemini API key not found or invalid');
    return false;
  }
  
  if (geminiModelMatch) {
    log.success(`Doctor Portal: Gemini model set to ${geminiModelMatch[1]}`);
  }
  
  if (jitsiMatch) {
    log.success(`Doctor Portal: Jitsi domain set to ${jitsiMatch[1]}`);
  } else {
    log.info('Doctor Portal: Using default Jitsi domain (meet.jit.si)');
  }
  
  return true;
}

// ============================================================================
// DOCKERFILE CONFIGURATION CHECK
// ============================================================================

function checkDockerfileConfig() {
  log.header('Dockerfile Configuration Check');
  
  const dockerfiles = [
    path.join(__dirname, '..', '..', 'Isara-patient-portal', 'Dockerfile.unified'),
    path.join(__dirname, '..', '..', 'Isara-doctor-portal', 'Dockerfile.unified')
  ];
  
  let allValid = true;
  
  for (const dockerfilePath of dockerfiles) {
    const portalName = dockerfilePath.includes('patient') ? 'Patient' : 'Doctor';
    
    if (!fs.existsSync(dockerfilePath)) {
      log.warn(`${portalName} Portal: Dockerfile.unified not found`);
      continue;
    }
    
    const content = fs.readFileSync(dockerfilePath, 'utf-8');
    
    // Check for Gemini API key
    if (content.includes('GEMINI_API_KEY') && content.includes('AIzaSy')) {
      log.success(`${portalName} Portal Dockerfile: Gemini API key configured`);
    } else {
      log.warn(`${portalName} Portal Dockerfile: Gemini API key may need configuration`);
    }
    
    // Check for Jitsi domain
    if (content.includes('JITSI_DOMAIN') && content.includes('meet.jit.si')) {
      log.success(`${portalName} Portal Dockerfile: Jitsi domain configured`);
    } else {
      log.warn(`${portalName} Portal Dockerfile: Jitsi domain may need configuration`);
    }
  }
  
  return allValid;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bright}${colors.cyan}  IZARA TELEMEDICINE - AI & Meeting Configuration Validator${colors.reset}`);
  console.log('═'.repeat(60));
  console.log(`Started: ${new Date().toLocaleString('th-TH')}\n`);
  
  const results = {
    envConfig: false,
    geminiAPI: false,
    meetingLinks: false,
    patientPortal: false,
    doctorPortal: false,
    dockerfiles: false
  };
  
  // Run all tests
  results.envConfig = await checkEnvironmentConfig();
  results.geminiAPI = await testGeminiAPI();
  results.meetingLinks = testMeetingLinkGeneration();
  results.patientPortal = await testPatientPortalAIConfig();
  results.doctorPortal = await testDoctorPortalAIConfig();
  results.dockerfiles = checkDockerfileConfig();
  
  // Summary
  log.header('Test Summary');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  console.log(`\nResults: ${passed}/${total} tests passed\n`);
  
  for (const [test, result] of Object.entries(results)) {
    const status = result ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    console.log(`  ${status} - ${test}`);
  }
  
  console.log('\n' + '═'.repeat(60));
  
  if (passed === total) {
    log.success('All AI and Meeting configurations are valid!');
    log.success('Ready for deployment to Google Cloud Run.');
  } else {
    log.warn('Some configurations need attention.');
    log.info('Please review the errors above before deployment.');
  }
  
  console.log('═'.repeat(60) + '\n');
  
  return passed === total;
}

// Run tests
runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    log.error(`Test runner error: ${error.message}`);
    process.exit(1);
  });
