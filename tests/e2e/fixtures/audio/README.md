# Test Audio Files for Speech-to-Text Testing

## Purpose
These files are used to test the Speech-to-Text transcription workflow in the Izara Telemedicine platform.

## Files Generated
- `*-transcript.txt` - Expected transcript text for comparison
- `*-metadata.json` - Metadata about the test script
- `*-ssml.xml` - SSML format for Google Text-to-Speech API
- `*.mp3` - Generated audio file (if TTS API is available)

## How to Use

### For Automated Testing
1. Run the Selenium tests: `npm run test:e2e:meeting`
2. Tests will use transcript files as reference

### For Manual Testing
1. Use the SSML files with Google Cloud Console TTS
2. Or record audio manually reading the transcripts
3. Upload to the video meeting end endpoint

### API Testing
```bash
# Test transcription with generated audio
curl -X POST http://localhost:3009/api/video-meeting/test-123/transcribe-audio \
  -H "Content-Type: application/json" \
  -d '{"audioBase64": "<base64-audio>", "encoding": "MP3", "languageCode": "th-TH"}'
```

## Scripts Available
- Thai Headache Consultation (`thai-headache-consultation`)
- Thai Fever Consultation (`thai-fever-consultation`)
- English General Consultation (`english-general-consultation`)

## Requirements for Audio Generation
- Google Cloud Text-to-Speech API enabled
- API key with TTS permissions
- Set `GOOGLE_TTS_API_KEY` environment variable

## Last Generated
2025-12-15T04:11:08.090Z
