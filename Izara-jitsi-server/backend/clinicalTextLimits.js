/**
 * Clinical text size guards — Postgres TEXT/JSONB safe bounds + LLM context windows.
 */

export const CLINICAL_TEXT_LIMITS = {
  /** Full transcript column on meeting_records */
  MAX_TRANSCRIPT_STORE: Number.parseInt(process.env.MAX_TRANSCRIPT_STORE_CHARS || '2000000', 10),
  /** Text sent to Gemini / Whisper follow-up prompts */
  MAX_TRANSCRIPT_FOR_LLM: Number.parseInt(process.env.MAX_TRANSCRIPT_FOR_LLM_CHARS || '120000', 10),
  MAX_AI_SUMMARY_TEXT: Number.parseInt(process.env.MAX_AI_SUMMARY_CHARS || '500000', 10),
  MAX_JSONB_PAYLOAD: Number.parseInt(process.env.MAX_CLINICAL_JSONB_CHARS || '1000000', 10),
  MAX_SEGMENT_CONTENT: Number.parseInt(process.env.MAX_TRANSCRIPT_SEGMENT_CHARS || '32000', 10),
  MAX_SEGMENTS_PER_MEETING: Number.parseInt(process.env.MAX_TRANSCRIPT_SEGMENTS || '10000', 10),
  MAX_SOAP_FIELD: 50_000,
};

export function clampText(value, maxLen) {
  const str = value == null ? '' : String(value);
  if (str.length <= maxLen) return str;
  const omitted = str.length - maxLen;
  return `${str.slice(0, maxLen)}\n...[truncated ${omitted} characters for storage safety]`;
}

/** ~2h consult at ~1 line/3s → large chaotic block for schema stress tests */
export function buildChaoticTranscript2Hours(targetChars = 400_000) {
  const lines = [];
  let total = 0;
  let i = 0;
  while (total < targetChars) {
    const role = i % 3 === 0 ? 'แพทย์' : i % 3 === 1 ? 'ผู้ป่วย' : 'แขก';
    const line = `[${role}] segment-${i} ${'อาการทดสอบขอบเขต '.repeat(12)} vitals=120/80 chaos=${i % 97}\n`;
    lines.push(line);
    total += line.length;
    i += 1;
  }
  return lines.join('');
}

/** Head/tail sampling when transcript exceeds model context */
export function prepareTranscriptForLlm(fullText) {
  if (!fullText) return '';
  const max = CLINICAL_TEXT_LIMITS.MAX_TRANSCRIPT_FOR_LLM;
  if (fullText.length <= max) return fullText;
  const headLen = Math.floor(max * 0.55);
  const tailLen = Math.floor(max * 0.4);
  const omitted = fullText.length - headLen - tailLen;
  return [
    fullText.slice(0, headLen),
    `\n\n[... transcript omitted: ${omitted} characters (${Math.round(omitted / 1024)} KB) — middle section excluded for AI context ...]\n\n`,
    fullText.slice(-tailLen),
  ].join('');
}

export function sanitizeStructuredForDb(structured) {
  if (!structured || typeof structured !== 'object') return null;
  const copy = JSON.parse(JSON.stringify(structured));
  if (copy.soap && typeof copy.soap === 'object') {
    for (const key of Object.keys(copy.soap)) {
      copy.soap[key] = clampText(copy.soap[key], CLINICAL_TEXT_LIMITS.MAX_SOAP_FIELD);
    }
  }
  if (copy.chiefComplaint) copy.chiefComplaint = clampText(copy.chiefComplaint, 8_000);
  if (Array.isArray(copy.redFlags)) {
    copy.redFlags = copy.redFlags.slice(0, 50).map((f) => clampText(f, 2_000));
  }
  if (copy.emrFields && typeof copy.emrFields === 'object') {
    for (const key of Object.keys(copy.emrFields)) {
      const val = copy.emrFields[key];
      if (Array.isArray(val)) {
        copy.emrFields[key] = val.slice(0, 100).map((v) => clampText(v, 1_000));
      } else {
        copy.emrFields[key] = clampText(val, 4_000);
      }
    }
  }
  const json = JSON.stringify(copy);
  if (json.length > CLINICAL_TEXT_LIMITS.MAX_JSONB_PAYLOAD) {
    const trimmed = clampText(json, CLINICAL_TEXT_LIMITS.MAX_JSONB_PAYLOAD);
    try {
      return JSON.parse(trimmed);
    } catch {
      return {
        soap: {
          subjective: clampText(copy.soap?.subjective || '', CLINICAL_TEXT_LIMITS.MAX_SOAP_FIELD),
          objective: clampText(copy.soap?.objective || '', 4_000),
          assessment: clampText(copy.soap?.assessment || '', 4_000),
          plan: clampText(copy.soap?.plan || '', 4_000),
        },
        truncatedForStorage: true,
      };
    }
  }
  return copy;
}

export function prepareSummaryForDb(narrative, structured) {
  return {
    narrative: clampText(narrative, CLINICAL_TEXT_LIMITS.MAX_AI_SUMMARY_TEXT),
    structured: sanitizeStructuredForDb(structured),
  };
}
