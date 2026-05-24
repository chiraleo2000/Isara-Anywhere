/**
 * Degraded clinical summary when Gemini/Whisper unavailable (503, timeout).
 */
export function buildRecordingOnlySoapFallback(meeting) {
  return {
    chiefComplaint: 'ปรึกษาทางวิดีโอ',
    soap: {
      subjective: `ผู้ป่วย ${meeting?.patient_name_thai || 'ไม่ระบุ'} รายงานอาการทั่วไปจากการพบแพทย์ออนไลน์`,
      objective: 'ตรวจผ่าน Telemedicine — มีบันทึกเสียง/วิดีโอสำหรับแพทย์ตรวจสอบ',
      assessment: 'ภาวะทั่วไป — รอแพทย์ยืนยันจากบันทึกการประชุม',
      plan: 'ติดตามอาการ ใช้ยาตามที่แพทย์สั่ง และกลับมาพบเมื่ออาการรุนแรงขึ้น',
    },
    redFlags: [],
    requiresValidation: true,
    degraded: true,
  };
}

export function formatSoapMarkdownFromStructured(structuredSoap) {
  const s = structuredSoap?.soap || {};
  return [
    `## S - Subjective\n${s.subjective || 'ไม่ระบุ'}`,
    `## O - Objective\n${s.objective || 'ไม่ระบุ'}`,
    `## A - Assessment\n${s.assessment || 'ไม่ระบุ'}`,
    `## P - Plan\n${s.plan || 'ไม่ระบุ'}`,
  ].join('\n\n');
}
