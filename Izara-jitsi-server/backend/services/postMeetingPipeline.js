/**
 * Post-meeting pipeline: recording storage → transcription → clinical AI summary → DB.
 *
 * Production (meet.jit.si): browser MediaRecorder → save-recording → this pipeline.
 * Self-hosted Jibri (optional): POST /api/webhooks/jibri-recording → ingestJibriRecording.
 *
 * Storage layout (HIPAA/PDPA isolation by doctor_id prefix):
 *   {RECORDINGS_DIR}/meetings/{doctorId}/{meetingId}/video.{ext}
 *   {RECORDINGS_DIR}/meetings/{doctorId}/{meetingId}/transcript.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decryptRecordingBuffer, encryptRecordingBuffer, isRecordingEncryptionEnabled } from '../recordingCrypto.js';
import { isTransientError, withRetry } from '../pipelineRetry.js';
import {
  CLINICAL_TEXT_LIMITS,
  clampText,
  prepareTranscriptForLlm,
  prepareSummaryForDb,
  buildChaoticTranscript2Hours,
} from '../clinicalTextLimits.js';
import {
  cleanupEphemeralRecordingAfterPersist,
  cleanupJibriSourceFile,
  sweepEmptyRecordingDirs,
} from '../recordingCleanup.js';
import {
  buildRecordingOnlySoapFallback,
  formatSoapMarkdownFromStructured,
} from '../clinicalFallback.js';
import { waitForStableFile } from '../jibriFileStable.js';
import { logPipelineMemory } from '../pipelineMemory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @typedef {'pending'|'storage'|'transcribing'|'summarizing'|'completed'|'failed'|'partial'} PipelineStage */

const pipelineJobs = new Map();

const MIN_RECORDING_BYTES = Number.parseInt(process.env.MIN_RECORDING_BYTES || '1024', 10);
const MAX_WHISPER_BYTES = 25 * 1024 * 1024;
const MAX_SYNC_STT_BYTES = 50 * 1024 * 1024;
const PIPELINE_TIMEOUT_MS = Number.parseInt(process.env.POST_MEETING_PIPELINE_TIMEOUT_MS || '900000', 10);

function mapSpeakerRole(speakerTag) {
  if (speakerTag === 1) return 'doctor';
  if (speakerTag === 2) return 'patient';
  return 'guest';
}

function mapSpeakerName(speakerTag) {
  if (speakerTag === 1) return 'แพทย์';
  if (speakerTag === 2) return 'ผู้ป่วย';
  return 'แขก';
}

function summaryOutputsMissing({ narrative, structured, clinicalJson }) {
  return !narrative && !structured && !clinicalJson;
}

const CLINICAL_SUMMARY_PROMPT = `You are a licensed clinical documentation assistant for telemedicine EMR prep.
Extract ONLY what is supported by the transcript. Do not invent diagnoses or medications.

Return valid JSON:
{
  "symptoms": ["chief complaints and reported symptoms"],
  "doctorNotes": ["objective findings and clinician statements attributed to doctor"],
  "patientStatements": ["relevant patient-reported history"],
  "assessment": "preliminary assessment in Thai",
  "planAndNextSteps": ["follow-up, meds, labs, referrals"],
  "redFlags": ["urgent warning signs if any"],
  "emrSoapDraft": {
    "subjective": "",
    "objective": "",
    "assessment": "",
    "plan": ""
  },
  "requiresPhysicianValidation": true
}

Transcript (speaker-labeled):
`;

function getPipelineStatus(meetingId) {
  return pipelineJobs.get(String(meetingId)) || { stage: 'pending', meetingId };
}

function readRecordingFileFromDisk(filePath) {
  const raw = fs.readFileSync(filePath);
  return decryptRecordingBuffer(raw);
}

async function transcribeWithWhisper(buffer, mimeType) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (buffer.length > MAX_WHISPER_BYTES) {
    console.warn('[PostMeeting] Whisper skipped — file exceeds 25MB API limit');
    return null;
  }

  const ext = mimeType?.includes('mp4') ? 'mp4' : 'webm';
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), `recording.${ext}`);
  form.append('model', process.env.WHISPER_MODEL || 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('language', 'th');

  const data = await withRetry(
    async () => {
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(Number.parseInt(process.env.WHISPER_TIMEOUT_MS || '300000', 10)),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Whisper API ${res.status}: ${errText.slice(0, 200)}`);
      }
      return res.json();
    },
    { label: 'whisper-transcribe', shouldRetry: isTransientError },
  );
  const segments = (data.segments || []).map((seg, idx) => ({
    content: (seg.text || '').trim(),
    confidence: 1,
    speakerTag: idx % 2 === 0 ? 1 : 2,
    speakerRole: idx % 2 === 0 ? 'doctor' : 'patient',
    speakerName: idx % 2 === 0 ? 'แพทย์' : 'ผู้ป่วย',
    startTimeSeconds: Math.floor(seg.start || 0),
    endTimeSeconds: Math.floor(seg.end || 0),
  }));
  if (!segments.length && data.text) {
    segments.push({
      content: data.text.trim(),
      confidence: 1,
      speakerTag: 1,
      speakerRole: 'doctor',
      speakerName: 'แพทย์',
    });
  }
  return segments;
}

async function saveTranscriptArtifact(paths, payload) {
  try {
    fs.writeFileSync(paths.transcriptPath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {
    console.warn('[PostMeeting] transcript.json write failed:', e.message);
  }
}

function pipelineUserMessage(stage, errorCode) {
  const map = {
    failed_transcription:
      'ไม่สามารถถอดเสียงจากการบันทึกได้ชั่วคราว — ระบบจะใช้บันทึกระหว่างประชุมแทน (ถ้ามี) หรือลองสรุปใหม่ภายหลัง',
    failed_summary:
      'บันทึกการประชุมพร้อมแล้ว แต่สรุป AI ยังไม่พร้อม — กรุณากดสร้างสรุปใหม่หรือรอสักครู่',
    failed_corrupt_recording:
      'ไฟล์บันทึกเสียหายหรืออัปโหลดไม่สมบูรณ์ — ใช้บันทึกระหว่างประชุมหรือบันทึกใหม่',
    partial_no_transcript:
      'มีไฟล์บันทึกแต่ยังไม่มีข้อความถอดเสียงเพียงพอ — แพทย์สามารถกดสร้างสรุปจาก transcript สดได้',
  };
  return map[errorCode] || 'การประมวลผลหลังประชุมไม่สำเร็จ — กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ';
}

/**
 * @param {object} deps
 */
export function createPostMeetingPipeline(deps) {
  const {
    safeQuery,
    genAI,
    geminiModel,
    recordingsDir,
    io,
    hasSttCredentials,
    createSpeechClient,
    generateStructuredSOAP,
    generateEmrNarrativeSummary,
  } = deps;

  function buildRecordingPaths(doctorId, meetingId, ext = 'webm') {
    const safeDoctor = sanitizePathSegment(doctorId || 'unknown-doctor');
    const safeMeeting = sanitizePathSegment(meetingId);
    const relativeDir = path.join('meetings', safeDoctor, safeMeeting);
    const dir = path.join(recordingsDir, relativeDir);
    const videoFilename = `video.${ext}`;
    const videoPath = path.join(dir, videoFilename);
    const transcriptPath = path.join(dir, 'transcript.json');
    const recordingUrl = `/api/recordings/meetings/${safeDoctor}/${safeMeeting}/${videoFilename}`;
    return { dir, videoPath, transcriptPath, recordingUrl, relativeDir, videoFilename };
  }

  function emitPipelineProgress(meetingId, meeting, patch) {
    const payload = {
      meetingId,
      appointmentId: meeting?.appointment_id || null,
      ...patch,
      timestamp: new Date().toISOString(),
    };
    io?.to(String(meetingId))?.emit?.('pipeline-progress', payload);
    if (meeting?.appointment_id) {
      io?.to(String(meeting.appointment_id))?.emit?.('pipeline-progress', payload);
    }
    io?.emit?.('meeting-pipeline-progress', payload);
  }

  function setPipelineStatus(meetingId, patch, meeting = null) {
    const key = String(meetingId);
    const prev = pipelineJobs.get(key) || { meetingId: key, stage: 'pending', startedAt: new Date().toISOString() };
    const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
    pipelineJobs.set(key, next);
    if (meeting || patch.stage) {
      emitPipelineProgress(key, meeting, next);
    }
    return next;
  }

  function parseMeetingConfig(meeting) {
    if (!meeting?.meeting_config) return {};
    if (typeof meeting.meeting_config === 'object') return meeting.meeting_config;
    try {
      return JSON.parse(meeting.meeting_config);
    } catch {
      return {};
    }
  }

  function resolveDoctorIdForRecording(meeting, options = {}) {
    if (meeting?.doctor_id) return meeting.doctor_id;
    const cfg = parseMeetingConfig(meeting);
    const fromCfg = cfg.organizerDoctorId || cfg.originalRefs?.doctorId;
    if (fromCfg) return fromCfg;
    if (options.doctorId) return options.doctorId;
    return 'unknown-doctor';
  }

  async function resolveMeetingContext(meetingKey) {
    const result = await safeQuery(
      `SELECT mr.*, u_pat.name_thai AS patient_name_thai, u_doc.name_thai AS doctor_name_thai
       FROM meeting_records mr
       LEFT JOIN users u_pat ON mr.patient_id = u_pat.id
       LEFT JOIN users u_doc ON mr.doctor_id = u_doc.id
       WHERE mr.id::text = $1
          OR mr.appointment_id = $1
          OR mr.meeting_config->'originalRefs'->>'appointmentId' = $1
       ORDER BY mr.recording_stopped_at DESC NULLS LAST, mr.created_at DESC
       LIMIT 1`,
      [meetingKey],
    );
    return result.rows[0] || null;
  }

  async function updateMeetingConfigPipeline(meetingId, pipelinePatch) {
    try {
      await safeQuery(
        `UPDATE meeting_records
         SET meeting_config = jsonb_set(
           COALESCE(meeting_config, '{}'::jsonb),
           '{postMeetingPipeline}',
           COALESCE(meeting_config->'postMeetingPipeline', '{}'::jsonb) || $2::jsonb,
           true
         )
         WHERE id::text = $1 OR appointment_id = $1`,
        [meetingId, JSON.stringify(pipelinePatch)],
      );
    } catch (e) {
      console.warn('[PostMeeting] meeting_config pipeline update skipped:', e.message);
    }
  }

  /**
   * Validate recording buffer (broken/interrupted uploads).
   */
  function validateRecordingBuffer(buffer, mimeType) {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < MIN_RECORDING_BYTES) {
      return { ok: false, reason: 'recording_too_small_or_empty' };
    }
    const mt = (mimeType || '').toLowerCase();
    if (mt.includes('webm') && buffer.length >= 4) {
      const sig = buffer.subarray(0, 4).toString('hex');
      if (sig !== '1a45dfa3') {
        return { ok: false, reason: 'invalid_webm_header' };
      }
    }
    if (mt.includes('mp4') && buffer.length >= 8) {
      const ftyp = buffer.subarray(4, 8).toString('ascii');
      if (ftyp !== 'ftyp') {
        return { ok: false, reason: 'invalid_mp4_header' };
      }
    }
    return { ok: true };
  }

  async function persistRecordingFromBuffer(meetingKey, buffer, mimeType, options = {}) {
    const meeting = options.meeting || (await resolveMeetingContext(meetingKey));
    const meetingId = meeting?.id || meetingKey;
    const doctorId = resolveDoctorIdForRecording(meeting, options);

    const validation = validateRecordingBuffer(buffer, mimeType);
    if (!validation.ok) {
      throw new Error(`Recording validation failed: ${validation.reason}`);
    }

    let ext = 'webm';
    if (mimeType?.includes('mp4')) ext = 'mp4';
    else if (mimeType?.includes('ogg')) ext = 'ogg';

    const paths = buildRecordingPaths(doctorId, meetingId, ext);
    fs.mkdirSync(paths.dir, { recursive: true });
    const { buffer: storedBytes, encrypted } = encryptRecordingBuffer(buffer);
    fs.writeFileSync(paths.videoPath, storedBytes);

    const legacyDir = path.join(recordingsDir, String(meetingKey));
    try {
      fs.mkdirSync(legacyDir, { recursive: true });
      const legacyName = `video.${ext}`;
      fs.writeFileSync(path.join(legacyDir, legacyName), storedBytes);
    } catch {
      /* legacy mirror optional */
    }

    const sizeBytes = buffer.length;
    let gcsUri = null;
    if (process.env.GCS_BUCKET) {
      gcsUri = await withRetry(
        () => uploadToGcs(paths.videoPath, `${paths.relativeDir}/${paths.videoFilename}`),
        { label: 'gcs-upload', shouldRetry: isTransientError },
      ).catch((e) => {
        console.warn('[PostMeeting] GCS upload failed after retries:', e.message);
        return null;
      });
    }

    const dbRecordingPayload = encrypted ? storedBytes : buffer;

    await safeQuery(
      `UPDATE meeting_records SET
         recording_url = $1,
         recording_filename = $2,
         recording_mimetype = $3,
         recording_size_bytes = $4,
         recording_data = $5,
         recording_stopped_at = NOW(),
         recording_started_at = COALESCE(recording_started_at, NOW()),
         status = CASE WHEN status = 'in_progress' THEN 'completed' ELSE status END
       WHERE id::text = $6 OR appointment_id = $6`,
      [paths.recordingUrl, paths.videoFilename, mimeType, sizeBytes, dbRecordingPayload, meetingId],
    );

    await updateMeetingConfigPipeline(meetingId, {
      storagePath: paths.relativeDir,
      gcsUri,
      sizeBytes,
      encryptedAtRest: encrypted || isRecordingEncryptionEnabled(),
      storedAt: new Date().toISOString(),
    });

    cleanupEphemeralRecordingAfterPersist({
      recordingsDir,
      paths,
      legacyMeetingKey: meetingKey === meetingId ? null : meetingKey,
      gcsUri,
      deleteTranscriptArtifact: false,
    });

    return { ...paths, meetingId, doctorId, sizeBytes, gcsUri, encryptedAtRest: encrypted };
  }

  async function ingestJibriRecording(payload) {
    const {
      meetingId,
      doctorId,
      localFilePath,
      videoBase64,
      mimeType = 'video/mp4',
    } = payload;

    let buffer = null;
    if (videoBase64) {
      buffer = Buffer.from(videoBase64, 'base64');
    } else if (localFilePath) {
      const settleMs = Number.parseInt(process.env.JIBRI_WEBHOOK_SETTLE_MS || '300', 10);
      if (settleMs > 0) {
        await new Promise((r) => setTimeout(r, settleMs));
      }
      await waitForStableFile(localFilePath, { minBytes: MIN_RECORDING_BYTES });
      buffer = fs.readFileSync(localFilePath);
    }
    if (!buffer?.length) {
      throw new Error('Jibri recording not found (provide localFilePath or videoBase64)');
    }
    const stored = await persistRecordingFromBuffer(meetingId, buffer, mimeType, { doctorId });
    if (localFilePath) {
      cleanupJibriSourceFile(localFilePath, stored.videoPath);
    }
    return stored;
  }

  /**
   * Cloud Run may retain a stale tiny file on ephemeral disk while BYTEA holds the real recording.
   * Prefer any candidate that passes validateRecordingBuffer; otherwise largest buffer.
   */
  function resolveRecordingForPlayback({ diskPath, byteaRaw, mimeType }) {
    const candidates = [];
    if (diskPath && fs.existsSync(diskPath)) {
      try {
        candidates.push(readRecordingFileFromDisk(diskPath));
      } catch (readErr) {
        console.warn('[PostMeeting] Disk playback read failed:', readErr.message);
      }
    }
    if (byteaRaw) {
      const raw = Buffer.isBuffer(byteaRaw) ? byteaRaw : Buffer.from(byteaRaw);
      try {
        candidates.push(decryptRecordingBuffer(raw));
      } catch (decErr) {
        console.warn('[PostMeeting] BYTEA decrypt failed:', decErr.message);
      }
    }
    const viable = candidates.filter((b) => validateRecordingBuffer(b, mimeType).ok);
    if (viable.length) {
      return viable.reduce((best, cur) => (cur.length > best.length ? cur : best), viable[0]);
    }
    return candidates.reduce((best, cur) => {
      if (!cur?.length) return best;
      if (!best?.length || cur.length > best.length) return cur;
      return best;
    }, null);
  }

  async function compileTranscriptFromDb(meetingId) {
    const rows = await safeQuery(
      `SELECT content, speaker_role, speaker_name, created_at
       FROM meeting_transcripts
       WHERE meeting_record_id::text = $1
       ORDER BY created_at ASC`,
      [meetingId],
    );
    if (!rows.rows.length) return '';
    return rows.rows
      .map((t) => {
        let roleLabel = 'ผู้เข้าร่วม';
        if (t.speaker_role === 'doctor') roleLabel = 'แพทย์';
        else if (t.speaker_role === 'patient') roleLabel = 'ผู้ป่วย';
        else if (t.speaker_role === 'guest') roleLabel = 'แขก';
        return `[${roleLabel}] ${t.speaker_name || 'Unknown'}: ${t.content}`;
      })
      .join('\n');
  }

  async function transcribeWithGoogleStt(buffer, mimeType) {
    if (!hasSttCredentials()) return null;
    const speechClient = await createSpeechClient();
    const audioBase64 = buffer.toString('base64');
    const encoding = mimeType?.includes('mp4') ? 'MP4' : 'WEBM_OPUS';
    const [response] = await speechClient.recognize({
      audio: { content: audioBase64 },
      config: {
        encoding,
        sampleRateHertz: 48000,
        languageCode: 'th-TH',
        enableAutomaticPunctuation: true,
        enableSpeakerDiarization: true,
        diarizationSpeakerCount: 3,
        model: 'latest_long',
        useEnhanced: true,
      },
    });

    const segments = [];
    for (const result of response.results || []) {
      const alt = result.alternatives?.[0];
      if (!alt?.transcript) continue;
      const speakerTag = alt.words?.[0]?.speakerTag || 1;
      segments.push({
        content: alt.transcript.trim(),
        confidence: alt.confidence || 0,
        speakerTag,
        speakerRole: mapSpeakerRole(speakerTag),
        speakerName: mapSpeakerName(speakerTag),
      });
    }
    return segments;
  }

  async function persistTranscriptSegments(meetingId, segments, source) {
    if (!segments?.length) return { fullText: '', count: 0, source };
    const capped = segments.slice(0, CLINICAL_TEXT_LIMITS.MAX_SEGMENTS_PER_MEETING).map((seg) => ({
      ...seg,
      content: clampText(seg.content, CLINICAL_TEXT_LIMITS.MAX_SEGMENT_CONTENT),
    }));
    const CHUNK = 50;
    for (let i = 0; i < capped.length; i += CHUNK) {
      const batch = capped.slice(i, i + CHUNK);
      for (const seg of batch) {
        await safeQuery(
          `INSERT INTO meeting_transcripts (meeting_record_id, speaker_role, speaker_name, content, language, confidence, start_time_seconds, end_time_seconds, created_at)
           VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            meetingId,
            seg.speakerRole || 'guest',
            seg.speakerName || seg.speakerRole,
            seg.content,
            'th-TH',
            seg.confidence || null,
            seg.startTimeSeconds ?? null,
            seg.endTimeSeconds ?? null,
          ],
        );
      }
    }
    const fullText = capped
      .map((s) => `[${s.speakerName || s.speakerRole}] ${s.content}`)
      .join('\n');
    return { fullText, count: capped.length, source };
  }

  async function generateClinicalSummary(fullTranscript, meeting, chatContext = '') {
    const llmTranscript = prepareTranscriptForLlm(fullTranscript || '');
    if (!genAI || !llmTranscript || llmTranscript.length < 20) {
      return { narrative: null, structured: null, clinicalJson: null, error: 'transcript_too_short' };
    }

    try {
    const model = genAI.getGenerativeModel({ model: geminiModel });
    const clinicalResult = await withRetry(
      () => model.generateContent(`${CLINICAL_SUMMARY_PROMPT}${llmTranscript}\n${chatContext}`),
      { label: 'gemini-clinical-json', shouldRetry: isTransientError },
    );
    const clinicalText = clinicalResult.response.text();
    let clinicalJson = null;
    try {
      const jsonMatch = /\{[\s\S]*\}/.exec(clinicalText);
      if (jsonMatch) clinicalJson = JSON.parse(jsonMatch[0]);
    } catch {
      /* narrative-only fallback */
    }

    let narrative = null;
    if (typeof generateEmrNarrativeSummary === 'function') {
      narrative = await generateEmrNarrativeSummary(llmTranscript, chatContext, meeting);
    } else {
      const soapPrompt = `สรุปการปรึกษาทางการแพทย์เป็น SOAP Note ภาษาไทย (ต้องให้แพทย์ตรวจสอบ):\n\n${llmTranscript}`;
      const soapResult = await model.generateContent(soapPrompt);
      narrative = soapResult.response.text();
    }

    let structured = null;
    if (generateStructuredSOAP) {
      structured = await generateStructuredSOAP(llmTranscript, chatContext, meeting, {});
    }

    return { narrative, structured, clinicalJson, error: null };
    } catch (err) {
      console.error('[PostMeeting] generateClinicalSummary failed:', err.message);
      const fallback = buildRecordingOnlySoapFallback(meeting);
      return {
        narrative: formatSoapMarkdownFromStructured(fallback),
        structured: fallback,
        clinicalJson: null,
        error: err.message,
        degraded: true,
        userMessage:
          'สรุปชั่วคราวจากบันทึกการประชุม — บริการ AI ไม่พร้อมหรือล้มเหลว กรุณาตรวจสอบก่อนอนุมัติ',
      };
    }
  }

  async function resolvePipelineRecording(meetingId, meeting, options) {
    let paths = null;
    let buffer = options.recordingBuffer || null;
    const mimeType = options.mimeType || meeting.recording_mimetype || 'video/webm';

    if (buffer) {
      paths = await persistRecordingFromBuffer(meetingId, buffer, mimeType, { meeting });
    } else if (meeting.recording_data) {
      buffer = decryptRecordingBuffer(
        Buffer.isBuffer(meeting.recording_data)
          ? meeting.recording_data
          : Buffer.from(meeting.recording_data),
      );
      paths = buildRecordingPaths(
        meeting.doctor_id || 'unknown-doctor',
        meetingId,
        (mimeType || '').includes('mp4') ? 'mp4' : 'webm',
      );
    } else {
      const doctorId = meeting.doctor_id || 'unknown-doctor';
      const ext = (meeting.recording_mimetype || '').includes('mp4') ? 'mp4' : 'webm';
      paths = buildRecordingPaths(doctorId, meetingId, ext);
      if (fs.existsSync(paths.videoPath)) {
        buffer = readRecordingFileFromDisk(paths.videoPath);
      }
    }

    return { paths, buffer, mimeType };
  }

  async function markPartialIfNoRecording(meetingId, meeting, buffer, paths) {
    if (buffer && paths) return;
    setPipelineStatus(meetingId, { stage: 'partial', error: 'no_recording_available' }, meeting);
    await updateMeetingConfigPipeline(meetingId, { stage: 'partial', error: 'no_recording_available' });
  }

  async function transcribeRecordingIfNeeded(meetingId, initialTranscript, buffer, mimeType, paths) {
    let fullTranscript = initialTranscript;
    let transcriptionMeta = { source: 'live_segments', segmentCount: 0 };
    if (fullTranscript?.length >= 20 || !buffer) {
      return { fullTranscript, transcriptionMeta };
    }

    let segments = null;
    if (buffer.length <= MAX_SYNC_STT_BYTES) {
      try {
        segments = await transcribeWithGoogleStt(buffer, mimeType);
        if (segments?.length) {
          transcriptionMeta = { source: 'google-cloud-stt', segmentCount: segments.length };
        }
      } catch (e) {
        console.warn('[PostMeeting] Google STT failed:', e.message);
      }
    }
    if (!segments?.length) {
      try {
        segments = await transcribeWithWhisper(buffer, mimeType);
        if (segments?.length) {
          transcriptionMeta = { source: 'whisper', segmentCount: segments.length };
        }
      } catch (e) {
        console.warn('[PostMeeting] Whisper failed:', e.message);
      }
    }
    if (!segments?.length) {
      return { fullTranscript, transcriptionMeta };
    }

    const persisted = await persistTranscriptSegments(meetingId, segments, transcriptionMeta.source);
    fullTranscript = persisted.fullText;
    transcriptionMeta.segmentCount = persisted.count;
    await saveTranscriptArtifact(paths, {
      segments,
      meta: transcriptionMeta,
      generatedAt: new Date().toISOString(),
    });
    return { fullTranscript, transcriptionMeta };
  }

  async function storeMeetingTranscript(meetingId, fullTranscript) {
    if (!fullTranscript) return;
    const storedTranscript = clampText(fullTranscript, CLINICAL_TEXT_LIMITS.MAX_TRANSCRIPT_STORE);
    await safeQuery(
      `UPDATE meeting_records SET transcript = $2 WHERE id::text = $1 OR appointment_id = $1`,
      [meetingId, storedTranscript],
    );
  }

  async function emitPipelineSummaryEvent(meetingId, meeting, failedPayload, extra = {}) {
    setPipelineStatus(meetingId, failedPayload, meeting);
    await updateMeetingConfigPipeline(meetingId, failedPayload);
    io?.to(meetingId)?.emit?.('meeting-summary-ready', {
      meetingId,
      appointmentId: meeting.appointment_id,
      summary: null,
      error: failedPayload.userMessage,
      requiresValidation: false,
      pipeline: failedPayload,
      timestamp: new Date().toISOString(),
      ...extra,
    });
    return failedPayload;
  }

  async function handleSummaryGenerationFailure(meetingId, meeting, paths, fullTranscript, summaryResult, started) {
    const failedSummary = {
      stage: 'failed',
      meetingId,
      appointmentId: meeting.appointment_id,
      recordingUrl: paths?.recordingUrl || meeting.recording_url,
      error: summaryResult.error,
      errorCode: 'failed_summary',
      userMessage: summaryResult.userMessage || pipelineUserMessage('failed', 'failed_summary'),
      transcriptLength: fullTranscript.length,
      durationMs: Date.now() - started,
    };
    return emitPipelineSummaryEvent(meetingId, meeting, failedSummary);
  }

  async function handleTranscriptionFailure(meetingId, meeting, paths, started) {
    const failedTx = {
      stage: 'failed',
      meetingId,
      errorCode: 'failed_transcription',
      userMessage: pipelineUserMessage('failed', 'failed_transcription'),
      recordingUrl: paths?.recordingUrl || meeting.recording_url,
      durationMs: Date.now() - started,
    };
    return emitPipelineSummaryEvent(meetingId, meeting, failedTx);
  }

  async function persistClinicalOutputs(meetingId, narrative, structured, clinicalJson) {
    if (!narrative && !structured && !clinicalJson) return;
    const safeSummary = prepareSummaryForDb(narrative, structured);
    const recPayload = clinicalJson
      ? clampText(
          JSON.stringify({ clinical: clinicalJson, requiresValidation: true }),
          CLINICAL_TEXT_LIMITS.MAX_JSONB_PAYLOAD,
        )
      : null;
    await safeQuery(
      `UPDATE meeting_records SET
         ai_summary = COALESCE($2, ai_summary),
         ai_summary_structured = COALESCE($3, ai_summary_structured),
         ai_recommendations = COALESCE($4, ai_recommendations)
       WHERE id::text = $1 OR appointment_id = $1`,
      [
        meetingId,
        safeSummary.narrative,
        safeSummary.structured ? JSON.stringify(safeSummary.structured) : null,
        recPayload,
      ],
    );
  }

  async function finalizeSuccessfulPipeline({
    meetingKey,
    meetingId,
    meeting,
    paths,
    fullTranscript,
    transcriptionMeta,
    narrative,
    structured,
    clinicalJson,
    degraded,
    started,
  }) {
    if (paths) {
      cleanupEphemeralRecordingAfterPersist({
        recordingsDir,
        paths,
        legacyMeetingKey: meetingKey === meetingId ? null : meetingKey,
        gcsUri: paths.gcsUri || meeting.meeting_config?.postMeetingPipeline?.gcsUri,
        deleteTranscriptArtifact: true,
      });
    }
    sweepEmptyRecordingDirs(recordingsDir);

    const completed = {
      stage: 'completed',
      meetingId,
      appointmentId: meeting.appointment_id,
      recordingUrl: paths?.recordingUrl || meeting.recording_url,
      transcriptLength: fullTranscript?.length || 0,
      transcription: transcriptionMeta,
      summaryAvailable: Boolean(narrative),
      degraded: Boolean(degraded),
      durationMs: Date.now() - started,
    };
    setPipelineStatus(meetingId, completed, meeting);
    await updateMeetingConfigPipeline(meetingId, completed);

    io?.to(meetingId)?.emit?.('meeting-summary-ready', {
      meetingId,
      appointmentId: meeting.appointment_id,
      summary: narrative,
      structured,
      clinical: clinicalJson,
      recordingUrl: completed.recordingUrl,
      requiresValidation: true,
      pipeline: completed,
      timestamp: new Date().toISOString(),
    });

    return completed;
  }

  /**
   * Main async pipeline (call without awaiting from HTTP handlers).
   */
  async function runPostMeetingPipeline(meetingKey, options = {}) {
    const started = Date.now();
    let meeting = options.meeting || null;
    let meetingId = meetingKey;

    setPipelineStatus(meetingKey, { stage: 'storage', error: null }, meeting);
    await updateMeetingConfigPipeline(meetingKey, { stage: 'storage', startedAt: new Date().toISOString() });

    try {
      meeting = meeting || (await resolveMeetingContext(meetingKey));
      if (!meeting) {
        throw new Error('Meeting not found');
      }
      meetingId = meeting.id;

      if (Date.now() - started > PIPELINE_TIMEOUT_MS) {
        throw new Error('Pipeline timeout before start');
      }

      let { paths, buffer, mimeType } = await resolvePipelineRecording(meetingId, meeting, options);
      await markPartialIfNoRecording(meetingId, meeting, buffer, paths);

      setPipelineStatus(meetingId, { stage: 'transcribing' }, meeting);
      await updateMeetingConfigPipeline(meetingId, { stage: 'transcribing' });
      logPipelineMemory('transcribing-start', meetingId);

      const initialTranscript = options.fullTranscript || (await compileTranscriptFromDb(meetingId));
      const { fullTranscript, transcriptionMeta } = await transcribeRecordingIfNeeded(
        meetingId,
        initialTranscript,
        buffer,
        mimeType,
        paths,
      );
      await storeMeetingTranscript(meetingId, fullTranscript);

      logPipelineMemory('transcribing-end', meetingId);
      buffer = null;

      setPipelineStatus(meetingId, { stage: 'summarizing', transcriptLength: fullTranscript?.length || 0 }, meeting);
      await updateMeetingConfigPipeline(meetingId, { stage: 'summarizing', transcription: transcriptionMeta });
      logPipelineMemory('summarizing-start', meetingId);

      const summaryResult = await generateClinicalSummary(fullTranscript, meeting, options.chatContext || '');
      const { narrative, structured, clinicalJson, degraded } = summaryResult;

      logPipelineMemory('summarizing-end', meetingId);

      if (
        summaryOutputsMissing(summaryResult) &&
        fullTranscript?.length >= 20 &&
        summaryResult.error &&
        !degraded
      ) {
        return handleSummaryGenerationFailure(meetingId, meeting, paths, fullTranscript, summaryResult, started);
      }

      if (
        summaryOutputsMissing(summaryResult) &&
        (!fullTranscript || fullTranscript.length < 20) &&
        buffer
      ) {
        return handleTranscriptionFailure(meetingId, meeting, paths, started);
      }

      await persistClinicalOutputs(meetingId, narrative, structured, clinicalJson);
      return finalizeSuccessfulPipeline({
        meetingKey,
        meetingId,
        meeting,
        paths,
        fullTranscript,
        transcriptionMeta,
        narrative,
        structured,
        clinicalJson,
        degraded,
        started,
      });
    } catch (err) {
      console.error('[PostMeeting] Pipeline failed:', err.message);
      const failed = {
        stage: 'failed',
        meetingId,
        error: err.message,
        errorCode: 'pipeline_exception',
        userMessage: pipelineUserMessage(
          'failed',
          err.message?.includes('validation') ? 'failed_corrupt_recording' : 'failed_summary',
        ),
        durationMs: Date.now() - started,
      };
      setPipelineStatus(meetingKey, failed, meeting);
      await updateMeetingConfigPipeline(meetingKey, failed);
      io?.to(meetingId)?.emit?.('meeting-summary-ready', {
        meetingId,
        summary: null,
        error: failed.userMessage,
        requiresValidation: false,
        pipeline: failed,
        timestamp: new Date().toISOString(),
      });
      return failed;
    }
  }

  function queuePostMeetingPipeline(meetingKey, options = {}) {
    setImmediate(() => {
      runPostMeetingPipeline(meetingKey, options).catch(async (e) => {
        console.error('[PostMeeting] Background job error:', e.message);
        try {
          await updateMeetingConfigPipeline(meetingKey, {
            stage: 'failed',
            error: e.message,
            errorCode: 'background_job_exception',
          });
        } catch (configErr) {
          console.error('[PostMeeting] Failed to update pipeline config:', configErr.message);
          if (io) {
            io.to(String(meetingKey)).emit('meeting-pipeline-error', {
              meetingId: meetingKey,
              error: e.message,
              configError: configErr.message,
              timestamp: new Date().toISOString(),
            });
          }
        }
      });
    });
  }

  return {
    buildRecordingPaths,
    validateRecordingBuffer,
    persistRecordingFromBuffer,
    ingestJibriRecording,
    readRecordingFileFromDisk,
    resolveRecordingForPlayback,
    MIN_RECORDING_BYTES,
    CLINICAL_TEXT_LIMITS,
    prepareTranscriptForLlm,
    prepareSummaryForDb,
    buildChaoticTranscript2Hours,
    runPostMeetingPipeline,
    queuePostMeetingPipeline,
    getPipelineStatus,
    resolveMeetingContext,
  };
}

export { encryptRecordingBuffer, decryptRecordingBuffer, isRecordingEncryptionEnabled };

function sanitizePathSegment(value) {
  return String(value || 'unknown').replaceAll(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

async function uploadToGcs(localPath, objectName) {
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) return null;
  try {
    const { Storage } = await import('@google-cloud/storage');
    const storage = new Storage();
    const bucket = storage.bucket(bucketName);
    const destination = `meetings/${objectName.replaceAll('\\', '/')}`;
    await bucket.upload(localPath, {
      destination,
      predefinedAcl: 'private',
      metadata: {
        contentType: getGcsContentType(localPath),
        cacheControl: 'private, max-age=0',
      },
    });
    return destination;
  } catch (e) {
    console.warn('[PostMeeting] GCS upload skipped:', e.message);
    return null;
  }
}

function getGcsContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.json') return 'application/json';
  return 'application/octet-stream';
}

export { sanitizePathSegment, pipelineJobs };
