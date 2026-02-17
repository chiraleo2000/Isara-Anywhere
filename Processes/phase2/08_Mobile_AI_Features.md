# 🤖 Mobile AI Features — Izara Dr. Anywhere

**Version:** 2.0.0  
**Date:** February 2026  
**AI Backend:** Gemini 2.0 Flash + pgvector RAG

---

## 1. AI Features Overview

### 1.1 Phase 1 vs Phase 2 Comparison

| Feature | Web (Phase 1) | Mobile (Phase 2) |
|---------|:-------------:|:----------------:|
| AI Health Chat | ✅ Text | ✅ Text + 🎤 Voice |
| Symptom Checker | ✅ | ✅ + Camera scan |
| Health Risk Assessment | ✅ | ✅ + Wearable data |
| Document OCR + Analysis | ✅ Upload | ✅ Camera scan |
| CDS (Clinical Decision Support) | ✅ | ✅ |
| Drug Interaction Check | ✅ | ✅ |
| Pre-Consultation Summary | ✅ | ✅ |
| EMR Auto-Draft | ✅ | ✅ |
| Meeting Summary | ✅ | ✅ |
| Patient Instructions Gen | ✅ | ✅ |
| AI Validation (Man-in-Loop) | ✅ | ✅ |
| Voice-to-Text AI Input | ❌ | ✅ NEW |
| Photo-based Symptom Check | ❌ | ✅ NEW |
| Wearable Anomaly Detection | ❌ | ✅ NEW |
| Offline AI Responses | ❌ | ✅ NEW (cached) |

---

## 2. Patient AI Chat (Mobile)

### 2.1 Chat Interface

```
AI Tab (🤖) → Chat
         │
         ▼
┌─────────────────────────────┐
│  🤖 Dr. Izara AI            │
│  ผู้ช่วยด้านสุขภาพ AI       │
│                             │
│  ┌──────────────────────┐   │
│  │ 🤖 สวัสดีค่ะ!          │   │
│  │ มีอะไรให้ช่วยเรื่อง     │   │
│  │ สุขภาพไหมคะ?          │   │
│  └──────────────────────┘   │
│                             │
│  ┌──────────────────────┐   │
│  │ 👤 ปวดหัวมา 3 วันแล้ว │   │
│  │ ครับ กินยามาก็ไม่หาย  │   │
│  └──────────────────────┘   │
│                             │
│  ┌──────────────────────┐   │
│  │ 🤖 ขอทราบรายละเอียด   │   │
│  │ เพิ่มเติมค่ะ:          │   │
│  │                      │   │
│  │ 1. ปวดบริเวณไหน?      │   │
│  │ 2. ปวดแบบไหน?        │   │
│  │ 3. มีอาการอื่นร่วม?   │   │
│  │ 4. ทานยาอะไรบ้าง?     │   │
│  │                      │   │
│  │ ⚠️ ข้อมูลนี้เป็นเพียง  │   │
│  │ คำแนะนำเบื้องต้น      │   │
│  │ ไม่ใช่การวินิจฉัยโรค   │   │
│  └──────────────────────┘   │
│                             │
│  Quick Actions:             │
│  [🩺 ตรวจอาการ]            │
│  [📊 วิเคราะห์ความเสี่ยง]  │
│  [📅 นัดหมายแพทย์]         │
│                             │
│  ┌──────────────────────┐   │
│  │ 💬 พิมพ์ข้อความ...    │   │
│  │          🎤  📷  📎  │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

### 2.2 Voice Input Implementation

```typescript
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recording = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    recording.current = rec;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording.current) return '';
    
    await recording.current.stopAndUnloadAsync();
    const uri = recording.current.getURI();
    setIsRecording(false);
    
    // Send audio to Whisper/Gemini for transcription
    const formData = new FormData();
    formData.append('audio', { uri, type: 'audio/m4a', name: 'voice.m4a' } as any);
    formData.append('language', 'th');
    
    const response = await apiClient.post('/api/ai/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    setTranscript(response.data.text);
    return response.data.text;
  }, []);

  return { isRecording, transcript, startRecording, stopRecording };
}
```

### 2.3 Photo-Based Symptom Input

```typescript
// Take photo of skin condition, wound, etc.
import * as ImagePicker from 'expo-image-picker';

export async function captureSymptomPhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
    allowsEditing: true,
    aspect: [4, 3],
  });

  if (result.canceled) return null;
  return result.assets[0].base64;
}

// Send photo to AI for analysis
export async function analyzeSymptomPhoto(base64Image: string): Promise<AISymptomAnalysis> {
  const response = await apiClient.post('/api/ai/analyze-symptom-image', {
    image: base64Image,
    language: 'th',
  });
  
  return response.data;
  // Returns: { description, possibleConditions, severity, recommendation }
}
```

---

## 3. Doctor AI Copilot (Mobile)

### 3.1 During Video Meeting

```
Meeting Screen → AI Side Panel
         │
         ▼
┌─────────────────────────────┐
│  🤖 AI Clinical Copilot     │
│                             │
│  ── Real-time CDS ──        │
│  ⚠️ Drug Interaction:       │
│  Amitriptyline + SSRI       │
│  Risk: Serotonin syndrome   │
│  [ดูรายละเอียด]            │
│                             │
│  ── Live Transcription ──   │
│  D: อาการเป็นมานานแค่ไหน? │
│  P: ประมาณ 3 วันครับ       │
│  D: ปวดบริเวณไหน?          │
│  P: ขมับทั้ง 2 ข้าง        │
│                             │
│  ── Suggested Diagnosis ──  │
│  1. G44.2 Tension HA 85%   │
│  2. G43 Migraine    10%    │
│  3. G44.0 Cluster   5%     │
│                             │
│  ── Suggested Orders ──     │
│  💊 Paracetamol 500mg      │
│     q6h prn × 7 days       │
│  💊 Amitriptyline 10mg     │
│     hs × 30 days           │
│  🧪 CBC if persistent      │
│                             │
│  [📋 Draft EMR from This]  │
└─────────────────────────────┘
```

### 3.2 Pre-Consultation AI Summary

```typescript
// Doctor taps patient card before meeting
// GET /api/ai/pre-summary/:patientId
interface PreConsultationSummary {
  patient_summary: string;           // Overall health summary
  recent_visits: VisitSummary[];     // Last 3 visits
  current_medications: Medication[]; // Active medications
  allergies: Allergy[];              // ⚠️ Critical info
  vital_trends: VitalTrend[];        // Trend analysis
  risk_factors: string[];            // AI-identified risks
  suggested_questions: string[];     // Questions to ask
  relevant_guidelines: string[];     // Clinical guidelines
}
```

### 3.3 EMR Auto-Draft from Meeting

```
Meeting Ends → AI Processing
         │
         ▼
┌─────────────────────────────┐
│  🤖 AI กำลังวิเคราะห์...    │
│                             │
│  ✅ Transcript processed    │
│  ✅ Key symptoms extracted  │
│  ✅ Diagnosis suggested     │
│  ⏳ Generating EMR draft... │
│  ⏳ Generating instructions │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  📋 EMR Draft (AI-Generated)│
│                             │
│  ⚠️ กรุณาตรวจสอบและแก้ไข   │
│  ก่อนลงนาม                  │
│                             │
│  CC: [AI-filled] ✏️         │
│  HPI: [AI-filled] ✏️        │
│  PE: [AI-filled] ✏️         │
│  Dx: [AI-suggested] ✏️      │
│  Plan: [AI-suggested] ✏️    │
│                             │
│  Man-in-Loop Actions:       │
│  ✅ ยอมรับ AI output        │
│  ✏️ แก้ไข                   │
│  ❌ ปฏิเสธ (เขียนเอง)       │
│                             │
│  [ตรวจสอบ & ลงนาม]          │
└─────────────────────────────┘
```

---

## 4. Wearable Anomaly Detection (NEW)

### 4.1 Flow

```
Background: Wearable data synced
         │
         ▼
┌─────────────────────────────┐
│  AI Anomaly Detection       │
│                             │
│  Input: Last 7 days vitals  │
│  - Heart rate pattern       │
│  - Blood pressure trend     │
│  - SpO2 levels              │
│  - Sleep quality            │
│                             │
│  Analysis: Compare against  │
│  - Personal baseline        │
│  - Age/gender norms         │
│  - Medical condition risks  │
└──────────┬──────────────────┘
           │ Anomaly detected
           ▼
┌─────────────────────────────┐
│  Push Notification:          │
│                             │
│  "⚠️ ตรวจพบความผิดปกติ:     │
│   อัตราการเต้นหัวใจสูง      │
│   กว่าปกติในช่วง 3 วัน      │
│   ที่ผ่านมา                  │
│   กดเพื่อดูรายละเอียด"      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Anomaly Detail Screen       │
│                             │
│  📊 Heart Rate Trend         │
│  ┌───────────────────┐      │
│  │ 95 ───────╱────── │      │
│  │ 75 ──────╱─────── │      │
│  │ 65 ─────╱──────── │      │
│  │    Mon Tue Wed Thu │      │
│  └───────────────────┘      │
│                             │
│  🤖 AI Analysis:             │
│  "อัตราการเต้นหัวใจสูงขึ้น  │
│   15% จากค่าเฉลี่ยปกติ      │
│   อาจเกิดจากความเครียด      │
│   หรือการออกกำลังกายที่      │
│   เปลี่ยนแปลง"              │
│                             │
│  Recommendation:             │
│  ○ 👨‍⚕️ นัดหมายแพทย์        │
│  ○ 📊 ติดตามต่อ            │
│  ○ ℹ️ อ่านเพิ่มเติม        │
│                             │
│  [📅 นัดหมายแพทย์]          │
│  [OK เข้าใจแล้ว]             │
└─────────────────────────────┘
```

---

## 5. Offline AI Responses (Cached)

### 5.1 Strategy

```typescript
// Cache common AI responses for offline use
const CACHED_AI_RESPONSES = {
  first_aid: 'cached_first_aid_guide.json',      // 50 common first aid tips
  drug_info: 'cached_drug_database.json',         // Top 200 medications
  symptom_triage: 'cached_triage_rules.json',     // Basic symptom triage
  health_tips: 'cached_health_tips.json',         // General health tips
};

// When offline, provide basic responses
async function handleOfflineAIChat(message: string): Promise<string> {
  // 1. Check if matches cached FAQ
  const cachedMatch = await searchCachedResponses(message);
  if (cachedMatch) return cachedMatch;

  // 2. Basic symptom keyword matching
  const symptoms = extractKeywords(message);
  const triageResult = await offlineTriage(symptoms);
  if (triageResult) return triageResult;

  // 3. Fallback
  return 'ขณะนี้ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่เมื่อมีอินเทอร์เน็ต หากมีอาการรุนแรง กรุณาโทร 1669';
}
```

---

## 6. AI Safety & Disclaimers

### 6.1 Medical Disclaimer (Mandatory)

```
Every AI response MUST include:

"⚠️ ข้อมูลนี้เป็นเพียงคำแนะนำเบื้องต้นจาก AI ไม่ใช่การวินิจฉัยทางการแพทย์
กรุณาปรึกษาแพทย์เพื่อรับคำแนะนำที่เหมาะสม
หากมีอาการฉุกเฉิน โทร 1669 ทันที"
```

### 6.2 Man-in-the-Loop Validation

All AI-generated clinical content (EMR drafts, CDS alerts, instructions) must be:
1. ✅ Reviewed by a licensed physician
2. ✅ Explicitly approved or edited
3. ✅ Logged with validation decision
4. ❌ Never auto-applied without doctor review

---

### End of Mobile AI Features — February 2026
