# Demo Meeting Audio Simulation Data
# This file contains sample audio transcription data for meeting simulation

## Overview
This directory contains demo meeting data for E2E testing of the video consultation workflow.

## Files

### demo-meeting-data.json
Full meeting data including:
- Participant information (Patient, Doctor, Guest/Relative)
- Transcript with timestamps and speakers
- Chat messages
- AI-generated summary

### Usage in Tests

```typescript
import demoMeeting from '../fixtures/demo-meeting-data.json';

// Use transcript data
const transcript = demoMeeting.transcript;

// Use AI summary
const summary = demoMeeting.ai_summary;
```

## Simulating Meeting Audio

For real audio simulation in tests, you can use the following approach:

```typescript
// Simulate audio stream with Web Audio API
async function simulateAudio(page: Page) {
  await page.evaluate(() => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.value = 440; // A4 note
    oscillator.connect(audioContext.destination);
    oscillator.start();
    setTimeout(() => oscillator.stop(), 1000);
  });
}
```

## Thai Speech Simulation

The demo data includes Thai language conversation between:
- **Doctor** (นพ.วิชัย รักษาดี) - Host
- **Patient** (คุณสมชาย ดีมาก)
- **Relative** (คุณแม่ผู้ป่วย) - Guest

### Key Conversation Topics
1. Chief complaint: Headache and low-grade fever
2. Duration: 2 days
3. Additional symptoms: Runny nose, poor sleep
4. Diagnosis: Common cold
5. Treatment: Rest, fluids, fever reducer
6. Follow-up: If symptoms persist after 3-4 days

## Testing Notes

- The meeting duration is 15 minutes (900 seconds)
- All timestamps are in MM:SS format
- AI summary is pre-generated for testing EMR creation workflow
