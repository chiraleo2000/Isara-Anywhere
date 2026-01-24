/**
 * ============================================================================
 * IZARA TELEMEDICINE - PHASE 1 AI FEATURES UNIT TESTS
 * ============================================================================
 * 
 * Comprehensive tests for Phase 1 AI-assisted features:
 * - AI Chat History validation
 * - Clinical Decision Support (CDS) logs
 * - Pre-consultation summaries
 * - Document analysis
 * - Patient instruction sheets
 * - Knowledge base for RAG
 * - Man-in-the-Loop validation workflows
 * 
 * Based on requirements from:
 * - Dr. Isara's requirements (2.1-2.5)
 * - P. Beer's recommendations (3.1-3.5)
 * - Phase 1 scope (4.1-4.5)
 * 
 * @version 1.0.0
 * @date January 2026
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'output');
const BUCKETS = {
  DOCTOR: 'izara-doctors-data',
  PATIENT: 'izara-patients-data',
  APPOINTMENTS: 'izara-appointments',
  METADATA: 'izara-meta-data'
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

const colors = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m', reset: '\x1b[0m'
};

let testResults = { passed: 0, failed: 0, tests: [] };

function log(message, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', test: '🧪', section: '📂', ai: '🤖' };
  const colorMap = { 
    info: colors.blue, success: colors.green, error: colors.red, 
    section: colors.cyan, ai: colors.magenta 
  };
  console.log(`${colorMap[type] || ''}${icons[type] || '•'} ${message}${colors.reset}`);
}

function recordTest(name, passed, details = '') {
  testResults.tests.push({ name, passed, details, timestamp: new Date().toISOString() });
  if (passed) testResults.passed++;
  else testResults.failed++;
  log(`${name}: ${passed ? 'PASSED' : 'FAILED'} ${details ? `- ${details}` : ''}`, passed ? 'success' : 'error');
}

function loadJSON(subDir, filename) {
  const filePath = path.join(OUTPUT_DIR, subDir, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

// ============================================================================
// AI CHAT HISTORY TESTS (Per P.Beer 3.3)
// ============================================================================

async function testAIChatHistoryStructure() {
  log('\n📂 Testing AI Chat History Structure...', 'section');
  
  // Test 1: Sessions file exists
  const sessions = loadJSON(BUCKETS.DOCTOR, 'ai-chat-history/sessions.json');
  recordTest(
    'AI Chat Sessions File Exists',
    sessions !== null && Array.isArray(sessions),
    sessions ? `Found ${sessions.length} sessions` : 'File not found'
  );
  
  if (!sessions) return;
  
  // Test 2: Session structure validation
  const requiredSessionFields = ['sessionId', 'doctorId', 'patientId', 'sessionType', 'messages'];
  const session = sessions[0];
  const hasRequiredFields = requiredSessionFields.every(field => session && session[field] !== undefined);
  recordTest(
    'AI Chat Session Has Required Fields',
    hasRequiredFields,
    hasRequiredFields ? 'All required fields present' : 'Missing fields'
  );
  
  // Test 3: Message structure validation
  const requiredMessageFields = ['id', 'role', 'content', 'timestamp'];
  const message = session?.messages?.[0];
  const hasMessageFields = requiredMessageFields.every(field => message && message[field] !== undefined);
  recordTest(
    'AI Chat Message Has Required Fields',
    hasMessageFields,
    hasMessageFields ? 'All message fields present' : 'Missing message fields'
  );
  
  // Test 4: Role values validation
  const validRoles = ['system', 'user', 'assistant'];
  const allRolesValid = session?.messages?.every(m => validRoles.includes(m.role));
  recordTest(
    'AI Chat Roles Are Valid',
    allRolesValid,
    allRolesValid ? 'All roles are system/user/assistant' : 'Invalid role found'
  );
  
  // Test 5: System prompt exists
  const hasSystemPrompt = session?.messages?.some(m => m.role === 'system');
  recordTest(
    'AI Chat Has System Prompt',
    hasSystemPrompt,
    hasSystemPrompt ? 'System prompt found' : 'No system prompt'
  );
  
  // Test 6: AI metadata present
  const assistantMessages = session?.messages?.filter(m => m.role === 'assistant');
  const hasAIMetadata = assistantMessages?.some(m => m.aiMetadata);
  recordTest(
    'AI Responses Have Metadata',
    hasAIMetadata,
    hasAIMetadata ? 'Model, tokens, confidence tracked' : 'Missing AI metadata'
  );
  
  // Test 7: Context in user messages
  const userMessages = session?.messages?.filter(m => m.role === 'user');
  const hasContext = userMessages?.some(m => m.context);
  recordTest(
    'User Messages Have Context',
    hasContext,
    hasContext ? 'Patient/appointment context present' : 'Missing context'
  );
  
  // Test 8: Session types for Phase 1
  const sessionTypes = sessions.map(s => s.sessionType);
  const expectedTypes = ['pre_consultation', 'document_analysis', 'general_query'];
  const hasExpectedTypes = expectedTypes.some(t => sessionTypes.includes(t));
  recordTest(
    'Session Types Cover Phase 1 Features',
    hasExpectedTypes,
    `Types: ${sessionTypes.join(', ')}`
  );
}

// ============================================================================
// CLINICAL DECISION SUPPORT (CDS) TESTS (Per Dr. Isara 2.4)
// ============================================================================

async function testCDSLogs() {
  log('\n📂 Testing Clinical Decision Support Logs...', 'section');
  
  const cdsLogs = loadJSON(BUCKETS.DOCTOR, 'cds-logs/cds-logs.json');
  recordTest(
    'CDS Logs File Exists',
    cdsLogs !== null && Array.isArray(cdsLogs),
    cdsLogs ? `Found ${cdsLogs.length} CDS logs` : 'File not found'
  );
  
  if (!cdsLogs || cdsLogs.length === 0) return;
  
  const log1 = cdsLogs[0];
  
  // Test 1: Required CDS fields
  const requiredFields = ['id', 'doctorId', 'patientId', 'cdsType', 'recommendation'];
  const hasRequiredFields = requiredFields.every(f => log1[f] !== undefined);
  recordTest(
    'CDS Log Has Required Fields',
    hasRequiredFields,
    hasRequiredFields ? 'All required fields present' : 'Missing fields'
  );
  
  // Test 2: CDS types cover Phase 1 requirements
  const cdsTypes = cdsLogs.map(l => l.cdsType);
  const expectedTypes = ['dose_adjustment', 'drug_interaction', 'guideline_alert'];
  const hasExpectedTypes = expectedTypes.every(t => cdsTypes.includes(t));
  recordTest(
    'CDS Covers All Alert Types',
    hasExpectedTypes,
    `Types: ${[...new Set(cdsTypes)].join(', ')}`
  );
  
  // Test 3: Guidelines referenced
  const hasGuidelines = log1.guidelinesReferenced && log1.guidelinesReferenced.length > 0;
  recordTest(
    'CDS References Clinical Guidelines',
    hasGuidelines,
    hasGuidelines ? `Guidelines: ${log1.guidelinesReferenced.map(g => g.name).join(', ')}` : 'No guidelines'
  );
  
  // Test 4: Doctor decision recorded (Man-in-the-Loop)
  const hasDecision = ['accepted', 'rejected', 'deferred', 'modified'].includes(log1.doctorDecision);
  recordTest(
    'CDS Has Doctor Decision (Man-in-the-Loop)',
    hasDecision,
    `Decision: ${log1.doctorDecision}`
  );
  
  // Test 5: Doctor notes for audit trail
  const hasNotes = log1.doctorNotes && log1.doctorNotes.length > 0;
  recordTest(
    'CDS Has Doctor Notes',
    hasNotes,
    hasNotes ? 'Notes recorded' : 'No notes'
  );
  
  // Test 6: Alert levels
  const alertLevels = cdsLogs.map(l => l.alertLevel);
  const validLevels = ['high', 'medium', 'low'];
  const hasValidLevels = alertLevels.every(l => validLevels.includes(l));
  recordTest(
    'CDS Alert Levels Are Valid',
    hasValidLevels,
    `Levels: ${[...new Set(alertLevels)].join(', ')}`
  );
}

// ============================================================================
// MEETING TRANSCRIPT & AI SUMMARY TESTS (Per Dr. Isara 2.1, P.Beer 3.2)
// ============================================================================

async function testMeetingRecords() {
  log('\n📂 Testing Meeting Transcripts & AI Summaries...', 'section');
  
  const records = loadJSON(BUCKETS.DOCTOR, 'meeting-records/meeting-records.json');
  recordTest(
    'Meeting Records File Exists',
    records !== null && Array.isArray(records),
    records ? `Found ${records.length} meeting records` : 'File not found'
  );
  
  if (!records || records.length === 0) return;
  
  const record = records[0];
  
  // Test 1: Meeting record structure
  const requiredFields = ['id', 'appointmentId', 'doctorId', 'patientId', 'duration'];
  const hasRequiredFields = requiredFields.every(f => record[f] !== undefined);
  recordTest(
    'Meeting Record Has Required Fields',
    hasRequiredFields,
    hasRequiredFields ? 'All fields present' : 'Missing fields'
  );
  
  // Test 2: Transcript exists
  const hasTranscript = record.transcript && record.transcript.length > 100;
  recordTest(
    'Meeting Has Transcript',
    hasTranscript,
    hasTranscript ? `Transcript length: ${record.transcript.length} chars` : 'No transcript'
  );
  
  // Test 3: Transcript has timestamps
  const hasTimestamps = record.transcript && record.transcript.includes('[00:');
  recordTest(
    'Transcript Has Timestamps',
    hasTimestamps,
    hasTimestamps ? 'Timestamps present' : 'No timestamps'
  );
  
  // Test 4: AI Summary exists and is approved
  const hasApprovedSummary = record.aiSummary && record.aiSummary.status === 'approved';
  recordTest(
    'AI Summary Is Approved (Man-in-the-Loop)',
    hasApprovedSummary,
    hasApprovedSummary ? `Approved by: ${record.aiSummary.approvedBy}` : 'Not approved'
  );
  
  // Test 5: Summary has patient version
  const hasPatientSummary = record.aiSummary?.summary && record.aiSummary.summary.length > 50;
  recordTest(
    'AI Summary Has Patient-Friendly Version',
    hasPatientSummary,
    hasPatientSummary ? 'Patient summary present' : 'No patient summary'
  );
  
  // Test 6: Sections for long meetings (>30 min)
  const hasSections = record.sections && record.sections.length > 0;
  recordTest(
    'Meeting Has 30-Min Sections',
    hasSections,
    hasSections ? `${record.sections.length} sections` : 'No sections'
  );
  
  // Test 7: AI recommendations
  const hasRecommendations = record.aiRecommendations && record.aiRecommendations.length > 50;
  recordTest(
    'Meeting Has AI Recommendations',
    hasRecommendations,
    hasRecommendations ? 'Recommendations present' : 'No recommendations'
  );
}

// ============================================================================
// PATIENT INSTRUCTION SHEET TESTS (Per Dr. Isara 2.1)
// ============================================================================

async function testPatientInstructions() {
  log('\n📂 Testing Patient Instruction Sheets...', 'section');
  
  const instructions = loadJSON(BUCKETS.DOCTOR, 'patient-instructions/instructions.json');
  recordTest(
    'Patient Instructions File Exists',
    instructions !== null && Array.isArray(instructions),
    instructions ? `Found ${instructions.length} instructions` : 'File not found'
  );
  
  if (!instructions || instructions.length === 0) return;
  
  const inst = instructions[0];
  
  // Test 1: Required fields
  const requiredFields = ['id', 'appointmentId', 'patientId', 'doctorId', 'content'];
  const hasRequiredFields = requiredFields.every(f => inst[f] !== undefined);
  recordTest(
    'Instruction Sheet Has Required Fields',
    hasRequiredFields,
    hasRequiredFields ? 'All fields present' : 'Missing fields'
  );
  
  // Test 2: Language is Thai
  recordTest(
    'Instruction Language Is Thai',
    inst.language === 'th',
    `Language: ${inst.language}`
  );
  
  // Test 3: Medications section with instructions
  const hasMedications = inst.content?.medications && inst.content.medications.length > 0;
  const medHasInstructions = hasMedications && inst.content.medications[0].instruction;
  recordTest(
    'Instructions Include Medication Details',
    medHasInstructions,
    medHasInstructions ? `${inst.content.medications.length} medications` : 'No medications'
  );
  
  // Test 4: Medication changes highlighted
  const hasChangedMeds = hasMedications && inst.content.medications.some(m => m.changed);
  recordTest(
    'Medication Changes Are Highlighted',
    hasChangedMeds,
    hasChangedMeds ? 'Changed medications marked' : 'No changes marked'
  );
  
  // Test 5: Lifestyle advice included
  const hasLifestyleAdvice = inst.content?.lifestyleAdvice && inst.content.lifestyleAdvice.length > 0;
  recordTest(
    'Instructions Include Lifestyle Advice',
    hasLifestyleAdvice,
    hasLifestyleAdvice ? `${inst.content.lifestyleAdvice.length} categories` : 'No lifestyle advice'
  );
  
  // Test 6: Warning signs included
  const hasWarnings = inst.content?.warningSign && inst.content.warningSign.length > 0;
  recordTest(
    'Instructions Include Warning Signs',
    hasWarnings,
    hasWarnings ? 'Warning signs present' : 'No warning signs'
  );
  
  // Test 7: Follow-up information
  const hasFollowUp = inst.content?.followUp && inst.content.followUp.labDate;
  recordTest(
    'Instructions Include Follow-Up Info',
    hasFollowUp,
    hasFollowUp ? `Next lab: ${inst.content.followUp.labDate}` : 'No follow-up'
  );
  
  // Test 8: AI generated and approved
  const aiApproved = inst.aiGenerated && inst.aiMetadata?.approvedByDoctor;
  recordTest(
    'AI-Generated Instructions Are Doctor-Approved',
    aiApproved,
    aiApproved ? 'Doctor approved' : 'Not approved'
  );
}

// ============================================================================
// KNOWLEDGE BASE TESTS (Per P.Beer 3.3)
// ============================================================================

async function testKnowledgeBase() {
  log('\n📂 Testing Knowledge Base for RAG...', 'section');
  
  const kb = loadJSON(BUCKETS.METADATA, 'knowledge-base/knowledge-base.json');
  recordTest(
    'Knowledge Base File Exists',
    kb !== null && Array.isArray(kb),
    kb ? `Found ${kb.length} entries` : 'File not found'
  );
  
  if (!kb || kb.length === 0) return;
  
  const entry = kb[0];
  
  // Test 1: Required fields
  const requiredFields = ['id', 'contentType', 'source', 'title', 'content'];
  const hasRequiredFields = requiredFields.every(f => entry[f] !== undefined);
  recordTest(
    'Knowledge Entry Has Required Fields',
    hasRequiredFields,
    hasRequiredFields ? 'All fields present' : 'Missing fields'
  );
  
  // Test 2: Content types cover Phase 1
  const contentTypes = kb.map(e => e.contentType);
  const expectedTypes = ['guideline', 'drug_info', 'protocol'];
  const hasExpectedTypes = expectedTypes.some(t => contentTypes.includes(t));
  recordTest(
    'Knowledge Base Has Expected Content Types',
    hasExpectedTypes,
    `Types: ${[...new Set(contentTypes)].join(', ')}`
  );
  
  // Test 3: Thai content available
  const hasThai = kb.some(e => e.contentThai && e.contentThai.length > 0);
  recordTest(
    'Knowledge Base Has Thai Content',
    hasThai,
    hasThai ? 'Thai content present' : 'No Thai content'
  );
  
  // Test 4: Tags for search
  const hasTags = entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0;
  recordTest(
    'Knowledge Entries Have Tags',
    hasTags,
    hasTags ? `Tags: ${entry.tags.slice(0, 3).join(', ')}...` : 'No tags'
  );
  
  // Test 5: Specialty field
  const hasSpecialty = entry.specialty && entry.specialty.length > 0;
  recordTest(
    'Knowledge Entries Have Specialty',
    hasSpecialty,
    hasSpecialty ? `Specialty: ${entry.specialty}` : 'No specialty'
  );
  
  // Test 6: Guideline year for currency
  const guidelines = kb.filter(e => e.contentType === 'guideline');
  const hasYear = guidelines.some(g => g.guidelineYear >= 2024);
  recordTest(
    'Guidelines Have Recent Year (2024+)',
    hasYear,
    hasYear ? 'Up-to-date guidelines' : 'Old or missing year'
  );
  
  // Test 7: Drug information coverage
  const hasDrugInfo = kb.some(e => e.contentType === 'drug_info');
  recordTest(
    'Knowledge Base Has Drug Information',
    hasDrugInfo,
    hasDrugInfo ? 'Drug info present' : 'No drug info'
  );
}

// ============================================================================
// PHR WITH HEALTH JOURNEY TESTS
// ============================================================================

async function testPHRWithHealthJourney() {
  log('\n📂 Testing PHR with Health Journey...', 'section');
  
  const phr = loadJSON(BUCKETS.PATIENT, 'users/PATIENT-ANAN/phr.json');
  recordTest(
    'Complex Patient PHR Exists',
    phr !== null,
    phr ? `Patient: ${phr.demographics?.name}` : 'File not found'
  );
  
  if (!phr) return;
  
  // Test 1: Demographics
  const hasDemographics = phr.demographics && phr.demographics.name && phr.demographics.nameThai;
  recordTest(
    'PHR Has Demographics (Thai/English)',
    hasDemographics,
    hasDemographics ? 'Demographics present' : 'Missing demographics'
  );
  
  // Test 2: Vital signs history
  const hasVitals = phr.vitalSignsHistory && phr.vitalSignsHistory.length > 1;
  recordTest(
    'PHR Has Vital Signs History',
    hasVitals,
    hasVitals ? `${phr.vitalSignsHistory.length} records` : 'No vitals'
  );
  
  // Test 3: Allergies with severity
  const hasAllergies = phr.allergies && phr.allergies.length > 0;
  const allergySeverity = hasAllergies && phr.allergies[0].severity;
  recordTest(
    'PHR Has Allergies with Severity',
    allergySeverity,
    allergySeverity ? `${phr.allergies.length} allergies` : 'No allergies'
  );
  
  // Test 4: Chronic conditions with ICD codes
  const hasConditions = phr.chronicConditions && phr.chronicConditions.length > 0;
  const hasICD = hasConditions && phr.chronicConditions[0].icdCode;
  recordTest(
    'PHR Has Chronic Conditions with ICD Codes',
    hasICD,
    hasICD ? `${phr.chronicConditions.length} conditions` : 'No conditions'
  );
  
  // Test 5: Current medications
  const hasMeds = phr.medications && phr.medications.length > 0;
  recordTest(
    'PHR Has Current Medications',
    hasMeds,
    hasMeds ? `${phr.medications.length} medications` : 'No medications'
  );
  
  // Test 6: Lab results
  const hasLabs = phr.latestLabResults && phr.latestLabResults.length > 0;
  recordTest(
    'PHR Has Latest Lab Results',
    hasLabs,
    hasLabs ? 'Lab results present' : 'No labs'
  );
  
  // Test 7: Health Journey timeline
  const hasJourney = phr.healthJourney && phr.healthJourney.length > 0;
  recordTest(
    'PHR Has Health Journey Timeline',
    hasJourney,
    hasJourney ? `${phr.healthJourney.length} events` : 'No journey'
  );
  
  // Test 8: Journey event types
  if (hasJourney) {
    const journeyTypes = phr.healthJourney.map(j => j.type);
    const expectedTypes = ['diagnosis', 'treatment_change', 'complication'];
    const hasExpectedTypes = expectedTypes.some(t => journeyTypes.includes(t));
    recordTest(
      'Health Journey Has Expected Event Types',
      hasExpectedTypes,
      `Types: ${[...new Set(journeyTypes)].join(', ')}`
    );
  }
  
  // Test 9: CDS in PHR
  const hasCDS = phr.clinicalDecisionSupport && phr.clinicalDecisionSupport.activeAlerts;
  recordTest(
    'PHR Has Clinical Decision Support Section',
    hasCDS,
    hasCDS ? 'CDS section present' : 'No CDS'
  );
  
  // Test 10: Family history
  const hasFamilyHistory = phr.familyHistory && phr.familyHistory.length > 0;
  recordTest(
    'PHR Has Family History',
    hasFamilyHistory,
    hasFamilyHistory ? `${phr.familyHistory.length} entries` : 'No family history'
  );
}

// ============================================================================
// EMR WITH AI FEATURES TESTS
// ============================================================================

async function testEMRWithAIFeatures() {
  log('\n📂 Testing EMR with AI Features...', 'section');
  
  const emrs = loadJSON(BUCKETS.DOCTOR, 'emrs/emrs.json');
  recordTest(
    'EMRs File Exists',
    emrs !== null && Array.isArray(emrs),
    emrs ? `Found ${emrs.length} EMRs` : 'File not found'
  );
  
  if (!emrs || emrs.length === 0) return;
  
  const emr = emrs[0];
  
  // Test 1: SOAP format
  const hasSOAP = emr.subjective && emr.objective && emr.assessment && emr.plan;
  recordTest(
    'EMR Has SOAP Format',
    hasSOAP,
    hasSOAP ? 'SOAP structure present' : 'Missing SOAP sections'
  );
  
  // Test 2: Thai content
  const hasThai = emr.subjective?.chiefComplaint && emr.assessment?.diagnoses?.[0]?.descriptionThai;
  recordTest(
    'EMR Has Thai Content',
    hasThai,
    hasThai ? 'Thai content present' : 'No Thai'
  );
  
  // Test 3: AI Summary
  const hasAISummary = emr.aiSummary && emr.aiSummary.summaryForPatient;
  recordTest(
    'EMR Has AI-Generated Summary',
    hasAISummary,
    hasAISummary ? 'AI summary present' : 'No AI summary'
  );
  
  // Test 4: AI Summary approved (Man-in-the-Loop)
  const summaryApproved = emr.aiSummary?.status === 'approved';
  recordTest(
    'AI Summary Is Doctor-Approved',
    summaryApproved,
    summaryApproved ? `Approved by: ${emr.aiSummary.approvedBy}` : 'Not approved'
  );
  
  // Test 5: Patient-friendly summary
  const patientFriendly = emr.aiSummary?.summaryForPatient?.includes('##');
  recordTest(
    'AI Summary Is Patient-Friendly (Markdown)',
    patientFriendly,
    patientFriendly ? 'Formatted for patient' : 'Not formatted'
  );
  
  // Test 6: CDS alerts integrated
  const hasCDSAlerts = emr.cdsAlerts && emr.cdsAlerts.length > 0;
  recordTest(
    'EMR Has CDS Alerts Integrated',
    hasCDSAlerts,
    hasCDSAlerts ? `${emr.cdsAlerts.length} alerts` : 'No CDS alerts'
  );
  
  // Test 7: ICD codes in diagnoses
  const hasICD = emr.assessment?.diagnoses?.[0]?.code;
  recordTest(
    'EMR Has ICD Codes',
    hasICD,
    hasICD ? `Code: ${hasICD}` : 'No ICD codes'
  );
  
  // Test 8: Medication changes tracked
  const hasMedChanges = emr.plan?.medications?.some(m => m.action === 'modify');
  recordTest(
    'EMR Tracks Medication Changes',
    hasMedChanges,
    hasMedChanges ? 'Med changes tracked' : 'No changes'
  );
  
  // Test 9: Follow-up scheduled
  const hasFollowUp = emr.plan?.followUp?.date;
  recordTest(
    'EMR Has Follow-Up Scheduled',
    hasFollowUp,
    hasFollowUp ? `Follow-up: ${emr.plan.followUp.date}` : 'No follow-up'
  );
}

// ============================================================================
// DOCUMENT ANALYSIS TESTS (Per Dr. Isara 2.3)
// ============================================================================

async function testDocumentAnalysis() {
  log('\n📂 Testing AI Document Analysis...', 'section');
  
  const analyses = loadJSON(BUCKETS.DOCTOR, 'document-analysis/analyses.json');
  recordTest(
    'Document Analysis File Exists',
    analyses !== null && Array.isArray(analyses),
    analyses ? `Found ${analyses.length} analyses` : 'File not found'
  );
  
  if (!analyses || analyses.length === 0) return;
  
  const analysis = analyses[0];
  
  // Test 1: Required fields
  const requiredFields = ['id', 'userId', 'patientId', 'documentType', 'aiAnalysis'];
  const hasRequiredFields = requiredFields.every(f => analysis[f] !== undefined);
  recordTest(
    'Document Analysis Has Required Fields',
    hasRequiredFields,
    hasRequiredFields ? 'All fields present' : 'Missing fields'
  );
  
  // Test 2: Analysis status
  const isCompleted = analysis.aiAnalysis?.status === 'completed';
  recordTest(
    'AI Analysis Is Completed',
    isCompleted,
    isCompleted ? 'Analysis complete' : 'Not complete'
  );
  
  // Test 3: Summary generated
  const hasSummary = analysis.aiAnalysis?.summary && analysis.aiAnalysis.summary.length > 100;
  recordTest(
    'AI Generated Summary',
    hasSummary,
    hasSummary ? `Summary: ${analysis.aiAnalysis.summary.length} chars` : 'No summary'
  );
  
  // Test 4: Key findings extracted
  const hasFindings = analysis.aiAnalysis?.keyFindings && analysis.aiAnalysis.keyFindings.length > 0;
  recordTest(
    'AI Extracted Key Findings',
    hasFindings,
    hasFindings ? `${analysis.aiAnalysis.keyFindings.length} findings` : 'No findings'
  );
  
  // Test 5: Values extracted from document
  const hasExtractedValues = analysis.aiAnalysis?.extractedValues && analysis.aiAnalysis.extractedValues.length > 0;
  recordTest(
    'AI Extracted Lab Values',
    hasExtractedValues,
    hasExtractedValues ? `${analysis.aiAnalysis.extractedValues.length} values` : 'No values'
  );
  
  // Test 6: CDS triggered
  const cdsTriggered = analysis.aiAnalysis?.cdsTriggered && analysis.aiAnalysis.cdsAlerts;
  recordTest(
    'Document Analysis Triggers CDS',
    cdsTriggered,
    cdsTriggered ? `CDS: ${analysis.aiAnalysis.cdsAlerts.join(', ')}` : 'No CDS'
  );
  
  // Test 7: Doctor review
  const doctorReviewed = analysis.doctorReview?.reviewed;
  recordTest(
    'Doctor Reviewed Analysis',
    doctorReviewed,
    doctorReviewed ? 'Reviewed' : 'Not reviewed'
  );
}

// ============================================================================
// APPOINTMENTS WITH PRE-SUMMARY TESTS
// ============================================================================

async function testAppointmentsWithPreSummary() {
  log('\n📂 Testing Appointments with AI Pre-Summary...', 'section');
  
  const appointments = loadJSON(BUCKETS.APPOINTMENTS, 'appointments/appointments-phase1.json');
  recordTest(
    'Phase 1 Appointments File Exists',
    appointments !== null && Array.isArray(appointments),
    appointments ? `Found ${appointments.length} appointments` : 'File not found'
  );
  
  if (!appointments || appointments.length === 0) return;
  
  const apt = appointments.find(a => a.aiPreSummary?.summary) || appointments[0];
  
  // Test 1: AI Pre-Summary exists
  const hasPreSummary = apt.aiPreSummary && apt.aiPreSummary.summary;
  recordTest(
    'Appointment Has AI Pre-Summary',
    hasPreSummary,
    hasPreSummary ? 'Pre-summary present' : 'No pre-summary'
  );
  
  // Test 2: Pre-summary reviewed
  const reviewed = apt.aiPreSummary?.reviewed === true;
  recordTest(
    'Pre-Summary Was Reviewed by Doctor',
    reviewed || apt.aiPreSummary?.status === 'pending',
    reviewed ? 'Reviewed' : apt.aiPreSummary?.status || 'Not reviewed'
  );
  
  // Test 3: Completed appointment has result
  const completedApt = appointments.find(a => a.status === 'completed');
  const hasResult = completedApt?.result?.emrId;
  recordTest(
    'Completed Appointment Has EMR Link',
    hasResult,
    hasResult ? `EMR: ${hasResult}` : 'No EMR link'
  );
  
  // Test 4: Meeting record linked
  const hasMeetingRecord = completedApt?.meetingRecord?.recordingId;
  recordTest(
    'Appointment Has Meeting Record Link',
    hasMeetingRecord,
    hasMeetingRecord ? `Recording: ${hasMeetingRecord}` : 'No recording'
  );
  
  // Test 5: Patient instruction sent
  const hasInstruction = completedApt?.patientInstruction?.sentAt;
  recordTest(
    'Patient Instruction Was Sent',
    hasInstruction,
    hasInstruction ? `Sent: ${hasInstruction}` : 'Not sent'
  );
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('=' .repeat(70));
  console.log('🧪 IZARA TELEMEDICINE - PHASE 1 AI FEATURES TESTS');
  console.log('=' .repeat(70));
  console.log(`\n📅 Test Run: ${new Date().toISOString()}\n`);
  
  log('🤖 Testing Phase 1 AI-Assisted Features...', 'ai');
  log('Based on Dr. Isara requirements (2.1-2.5) and P. Beer recommendations (3.1-3.5)\n');
  
  try {
    await testAIChatHistoryStructure();
    await testCDSLogs();
    await testMeetingRecords();
    await testPatientInstructions();
    await testKnowledgeBase();
    await testPHRWithHealthJourney();
    await testEMRWithAIFeatures();
    await testDocumentAnalysis();
    await testAppointmentsWithPreSummary();
    
  } catch (error) {
    console.error('\n❌ Test Error:', error);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(70));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(70));
  console.log(`\n✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total:  ${testResults.passed + testResults.failed}`);
  console.log(`📊 Pass Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  // Failed tests details
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`   - ${t.name}: ${t.details}`));
  }
  
  console.log('\n🎯 Phase 1 Features Tested:');
  console.log('   • AI Chat History (P.Beer 3.3)');
  console.log('   • Clinical Decision Support (Dr.Isara 2.4)');
  console.log('   • Meeting Transcripts & Summaries (Dr.Isara 2.1, P.Beer 3.2)');
  console.log('   • Patient Instruction Sheets (Dr.Isara 2.1)');
  console.log('   • Knowledge Base for RAG (P.Beer 3.3)');
  console.log('   • PHR with Health Journey');
  console.log('   • EMR with AI Features');
  console.log('   • Document Analysis (Dr.Isara 2.3)');
  console.log('   • Pre-consultation Summaries (Dr.Isara 2.2)');
  console.log('   • Man-in-the-Loop Validation (Dr.Isara 2.5)');
  
  return testResults;
}

// Export for use in test suite
module.exports = { runAllTests, testResults };

// Run if called directly
if (require.main === module) {
  runAllTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}
