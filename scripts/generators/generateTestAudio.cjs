/**
 * Audio File Generator for Testing
 * 
 * Generates test audio files with medical consultation dialogue
 * for testing Speech-to-Text transcription workflows.
 * 
 * Uses Google Cloud Text-to-Speech API or generates reference files
 * for manual testing.
 * 
 * @module generateTestAudio
 */

const fs = require('node:fs');
const path = require('node:path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'test-audio');
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY || 
                           process.env.VITE_GOOGLE_SPEECH_API_KEY ||
                           '';

// ============================================================================
// TEST MEDICAL CONSULTATION SCRIPTS
// ============================================================================

const MEDICAL_SCRIPTS = {
  // Thai headache consultation
  thaiHeadache: {
    language: 'th-TH',
    name: 'thai-headache-consultation',
    duration: 120, // estimated seconds
    dialogue: [
      { speaker: 'doctor', text: 'สวัสดีครับ คุณมีอาการอย่างไรบ้างครับ' },
      { speaker: 'patient', text: 'สวัสดีค่ะหมอ หนูปวดหัวมาสองวันแล้วค่ะ' },
      { speaker: 'doctor', text: 'ปวดตรงไหนครับ และปวดแบบไหน' },
      { speaker: 'patient', text: 'ปวดตรงหน้าผากและขมับค่ะ ปวดตื้อๆ เป็นพักๆ' },
      { speaker: 'doctor', text: 'มีอาการอื่นร่วมด้วยไหมครับ เช่น คลื่นไส้ ตาพร่ามัว' },
      { speaker: 'patient', text: 'มีคลื่นไส้เล็กน้อยค่ะ แต่ไม่มีตาพร่ามัว' },
      { speaker: 'doctor', text: 'ได้ทานยาอะไรมาบ้างไหมครับ' },
      { speaker: 'patient', text: 'ทานพาราเซตามอลไปสองเม็ดค่ะ แต่ดีขึ้นแค่ชั่วคราว' },
      { speaker: 'doctor', text: 'นอนพักผ่อนเป็นอย่างไรครับ ได้นอนกี่ชั่วโมง' },
      { speaker: 'patient', text: 'นอนวันละประมาณ 5-6 ชั่วโมงค่ะ ทำงานเครียดมาก' },
      { speaker: 'doctor', text: 'จากอาการที่คุณบอกมา น่าจะเป็น tension headache ครับ ซึ่งเกิดจากความเครียดและการพักผ่อนไม่เพียงพอ' },
      { speaker: 'doctor', text: 'ผมจะสั่งยาแก้ปวดให้และแนะนำให้พักผ่อนให้เพียงพอ อย่างน้อย 7-8 ชั่วโมงต่อคืน' },
      { speaker: 'patient', text: 'ขอบคุณค่ะหมอ แล้วถ้าอาการไม่ดีขึ้นล่ะคะ' },
      { speaker: 'doctor', text: 'ถ้าอาการไม่ดีขึ้นใน 1 สัปดาห์ หรือมีอาการรุนแรงขึ้น ให้กลับมาพบอีกครั้งนะครับ' }
    ]
  },
  
  // Thai fever consultation
  thaiFever: {
    language: 'th-TH',
    name: 'thai-fever-consultation',
    duration: 90,
    dialogue: [
      { speaker: 'doctor', text: 'สวัสดีครับ มีอะไรให้ช่วยครับ' },
      { speaker: 'patient', text: 'มีไข้มาสามวันแล้วครับ ตัวร้อนมาก' },
      { speaker: 'doctor', text: 'วัดไข้ได้เท่าไหร่ครับ' },
      { speaker: 'patient', text: 'ประมาณ 38.5 องศาครับ' },
      { speaker: 'doctor', text: 'มีอาการอื่นร่วมด้วยไหมครับ เช่น ไอ น้ำมูก เจ็บคอ' },
      { speaker: 'patient', text: 'มีเจ็บคอนิดหน่อยครับ กลืนน้ำลายแล้วเจ็บ' },
      { speaker: 'doctor', text: 'ขอดูคอหน่อยนะครับ' },
      { speaker: 'doctor', text: 'คอแดงเล็กน้อย น่าจะเป็นไข้หวัดทั่วไปครับ' },
      { speaker: 'doctor', text: 'ผมจะสั่งยาลดไข้และยาแก้อักเสบให้ ทานยาตามที่สั่ง ดื่มน้ำมากๆ และพักผ่อนให้เพียงพอนะครับ' },
      { speaker: 'patient', text: 'ครับ ขอบคุณครับหมอ' }
    ]
  },
  
  // English consultation for multilingual testing
  englishGeneral: {
    language: 'en-US',
    name: 'english-general-consultation',
    duration: 60,
    dialogue: [
      { speaker: 'doctor', text: 'Good morning. How can I help you today?' },
      { speaker: 'patient', text: 'Good morning doctor. I have been experiencing some stomach pain for the past few days.' },
      { speaker: 'doctor', text: 'Can you describe the pain? Where exactly is it located?' },
      { speaker: 'patient', text: 'It is in my upper abdomen, more on the right side. It gets worse after eating.' },
      { speaker: 'doctor', text: 'Do you have any other symptoms like nausea or vomiting?' },
      { speaker: 'patient', text: 'Yes, I feel nauseous sometimes, especially after meals.' },
      { speaker: 'doctor', text: 'Based on your symptoms, this could be gastritis. I will prescribe some medication and recommend avoiding spicy and fatty foods.' },
      { speaker: 'patient', text: 'Thank you doctor. How long should I take the medication?' },
      { speaker: 'doctor', text: 'Take the medication for one week. If symptoms persist, please come back for a follow-up.' }
    ]
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }
}

/**
 * Format dialogue as transcript text
 */
function formatTranscript(script) {
  const lines = script.dialogue.map(entry => {
    const speakerLabel = entry.speaker === 'doctor' ? 'หมอ' : 'ผู้ป่วย';
    return `${speakerLabel}: ${entry.text}`;
  });
  return lines.join('\n\n');
}

/**
 * Generate transcript text file
 */
function generateTranscriptFile(script) {
  const filename = `${script.name}-transcript.txt`;
  const filepath = path.join(OUTPUT_DIR, filename);
  const content = formatTranscript(script);
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`📄 Generated transcript: ${filename}`);
  
  return filepath;
}

/**
 * Generate metadata JSON file
 */
function generateMetadataFile(script) {
  const filename = `${script.name}-metadata.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  const metadata = {
    name: script.name,
    language: script.language,
    estimatedDuration: script.duration,
    dialogueCount: script.dialogue.length,
    speakers: [...new Set(script.dialogue.map(d => d.speaker))],
    generatedAt: new Date().toISOString(),
    purpose: 'Testing Speech-to-Text transcription',
    format: 'Reference transcript for comparison'
  };
  
  fs.writeFileSync(filepath, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`📋 Generated metadata: ${filename}`);
  
  return filepath;
}

/**
 * Generate SSML for Google Text-to-Speech
 */
function generateSSML(script) {
  let ssml = '<speak>\n';
  
  script.dialogue.forEach((entry, index) => {
    // Add pause between speakers
    if (index > 0) {
      ssml += '  <break time="1s"/>\n';
    }
    
    // Different voice for doctor vs patient
    const voice = entry.speaker === 'doctor' 
      ? (script.language === 'th-TH' ? 'th-TH-Standard-A' : 'en-US-Standard-B')
      : (script.language === 'th-TH' ? 'th-TH-Standard-C' : 'en-US-Standard-C');
    
    ssml += `  <voice name="${voice}">\n`;
    ssml += `    ${entry.text}\n`;
    ssml += `  </voice>\n`;
  });
  
  ssml += '</speak>';
  return ssml;
}

/**
 * Generate SSML file for Google TTS API
 */
function generateSSMLFile(script) {
  const filename = `${script.name}-ssml.xml`;
  const filepath = path.join(OUTPUT_DIR, filename);
  const ssml = generateSSML(script);
  
  fs.writeFileSync(filepath, ssml, 'utf8');
  console.log(`🎤 Generated SSML: ${filename}`);
  
  return filepath;
}

/**
 * Call Google Text-to-Speech API to generate audio
 * Note: Requires valid API key with TTS API enabled
 */
async function generateAudioWithTTS(script) {
  const filename = `${script.name}.mp3`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  // Check if TTS is available
  if (!GOOGLE_TTS_API_KEY || GOOGLE_TTS_API_KEY === 'YOUR_API_KEY') {
    console.log(`⚠️  Skipping TTS audio generation (no API key)`);
    console.log(`   To generate audio, set GOOGLE_TTS_API_KEY environment variable`);
    return null;
  }
  
  try {
    // Generate full text for TTS
    const fullText = script.dialogue.map(d => d.text).join('. ');
    
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: fullText },
          voice: {
            languageCode: script.language,
            name: script.language === 'th-TH' ? 'th-TH-Standard-A' : 'en-US-Standard-A'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.9,
            pitch: 0
          }
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.audioContent) {
      const audioBuffer = Buffer.from(data.audioContent, 'base64');
      fs.writeFileSync(filepath, audioBuffer);
      console.log(`🔊 Generated audio: ${filename}`);
      return filepath;
    }
  } catch (error) {
    console.log(`⚠️  TTS generation failed: ${error.message}`);
    console.log(`   Manual audio recording may be needed for testing`);
  }
  
  return null;
}

/**
 * Generate test audio instructions file
 */
function generateInstructionsFile() {
  const filepath = path.join(OUTPUT_DIR, 'README.md');
  
  const content = `# Test Audio Files for Speech-to-Text Testing

## Purpose
These files are used to test the Speech-to-Text transcription workflow in the Izara Telemedicine platform.

## Files Generated
- \`*-transcript.txt\` - Expected transcript text for comparison
- \`*-metadata.json\` - Metadata about the test script
- \`*-ssml.xml\` - SSML format for Google Text-to-Speech API
- \`*.mp3\` - Generated audio file (if TTS API is available)

## How to Use

### For Automated Testing
1. Run the Selenium tests: \`npm run test:e2e:meeting\`
2. Tests will use transcript files as reference

### For Manual Testing
1. Use the SSML files with Google Cloud Console TTS
2. Or record audio manually reading the transcripts
3. Upload to the video meeting end endpoint

### API Testing
\`\`\`bash
# Test transcription with generated audio
curl -X POST http://localhost:3009/api/video-meeting/test-123/transcribe-audio \\
  -H "Content-Type: application/json" \\
  -d '{"audioBase64": "<base64-audio>", "encoding": "MP3", "languageCode": "th-TH"}'
\`\`\`

## Scripts Available
- Thai Headache Consultation (\`thai-headache-consultation\`)
- Thai Fever Consultation (\`thai-fever-consultation\`)
- English General Consultation (\`english-general-consultation\`)

## Requirements for Audio Generation
- Google Cloud Text-to-Speech API enabled
- API key with TTS permissions
- Set \`GOOGLE_TTS_API_KEY\` environment variable

## Last Generated
${new Date().toISOString()}
`;
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`📖 Generated instructions: README.md`);
}

/**
 * Generate base64 sample for API testing
 */
function generateBase64Sample(script) {
  const filename = `${script.name}-base64-sample.txt`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  // Generate a minimal valid audio header (silence)
  // This is a placeholder - actual audio would be larger
  const silenceWav = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
  
  const content = `# Base64 Audio Sample for Testing
# Script: ${script.name}
# Language: ${script.language}

## Sample (minimal valid audio):
${silenceWav}

## Usage:
POST /api/video-meeting/:appointmentId/transcribe-audio
{
  "audioBase64": "<paste-base64-here>",
  "encoding": "LINEAR16",
  "languageCode": "${script.language}"
}

## Expected Transcript:
${formatTranscript(script)}
`;
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`🔤 Generated base64 sample: ${filename}`);
  
  return filepath;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

async function generateAllTestFiles() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║     IZARA TELEMEDICINE - TEST AUDIO GENERATOR                        ║');
  console.log('║     Generating files for Speech-to-Text testing                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  ensureOutputDir();
  
  const generatedFiles = [];
  
  // Generate files for each script
  for (const [key, script] of Object.entries(MEDICAL_SCRIPTS)) {
    console.log(`\n📝 Processing: ${script.name}`);
    console.log(`   Language: ${script.language}`);
    console.log(`   Dialogue entries: ${script.dialogue.length}`);
    console.log(`   Est. duration: ${script.duration}s`);
    
    // Generate text files
    generatedFiles.push(generateTranscriptFile(script));
    generatedFiles.push(generateMetadataFile(script));
    generatedFiles.push(generateSSMLFile(script));
    generatedFiles.push(generateBase64Sample(script));
    
    // Try to generate audio (may fail without API key)
    const audioFile = await generateAudioWithTTS(script);
    if (audioFile) {
      generatedFiles.push(audioFile);
    }
  }
  
  // Generate instructions
  generateInstructionsFile();
  
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`✅ Generated ${generatedFiles.length} test files`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('\n');
  
  // List all generated files
  const files = fs.readdirSync(OUTPUT_DIR);
  console.log('Generated files:');
  files.forEach(f => console.log(`  - ${f}`));
}

// ============================================================================
// RUN
// ============================================================================

generateAllTestFiles().catch(err => {
  console.error('Error generating test files:', err);
  process.exit(1);
});
