/**
 * Shared Jitsi room naming and hash URL builders for doctor portal + meeting server.
 */

function generateIzaraRoomName(appointmentId) {
  const id = String(appointmentId || 'room');
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `izara-${id.substring(0, 12)}-${timestamp}-${randomPart}`;
}

function buildJitsiHashUrl(baseUrl, displayName, extraParams = {}) {
  const params = new URLSearchParams({
    'config.prejoinPageEnabled': 'false',
    'config.requireDisplayName': 'false',
    'config.enableLobby': 'false',
    'config.lobbyModeEnabled': 'false',
    ...extraParams,
  });
  if (displayName) {
    params.set('userInfo.displayName', displayName);
  }
  return `${baseUrl}#${params.toString()}`;
}

function buildTelehealthMeetingUrls(appointmentId, opts = {}) {
  const domain = opts.domain || process.env.JITSI_DOMAIN || 'meet.jit.si';
  const roomName = opts.roomName || generateIzaraRoomName(appointmentId);
  const baseUrl = `https://${domain}/${roomName}`;
  const patientName = opts.patientName || 'Patient';
  const doctorName = opts.doctorName || 'Doctor';
  const patientPortal = String(opts.patientPortalUrl || process.env.PATIENT_PORTAL_URL || 'http://127.0.0.1:3005').replace(/\/$/, '');
  const doctorPortal = String(opts.doctorPortalUrl || process.env.DOCTOR_PORTAL_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');
  const patientId = opts.patientId || opts.patient_id;
  const doctorId = opts.doctorId || opts.doctor_id;
  const aptEnc = encodeURIComponent(String(appointmentId || ''));

  const portalPatientMeetingUrl = patientId
    ? `${patientPortal}/patient/${encodeURIComponent(String(patientId))}/meeting/${aptEnc}`
    : `${patientPortal}/meeting/${aptEnc}`;
  const portalDoctorMeetingUrl = doctorId
    ? `${doctorPortal}/doctor/${encodeURIComponent(String(doctorId))}/meeting/${aptEnc}`
    : null;

  return {
    roomName,
    meetingLink: baseUrl,
    doctorMeetingUrl: portalDoctorMeetingUrl || buildJitsiHashUrl(baseUrl, doctorName, {
      'config.startWithAudioMuted': 'false',
    }),
    patientMeetingUrl: portalPatientMeetingUrl,
    guestMeetingUrl: buildJitsiHashUrl(baseUrl, 'Guest', {
      'config.startWithVideoMuted': 'true',
    }),
    jitsiDoctorMeetingUrl: buildJitsiHashUrl(baseUrl, doctorName, {
      'config.startWithAudioMuted': 'false',
    }),
    jitsiPatientMeetingUrl: buildJitsiHashUrl(baseUrl, patientName, {
      'config.startWithVideoMuted': 'false',
    }),
  };
}

module.exports = {
  generateIzaraRoomName,
  buildJitsiHashUrl,
  buildTelehealthMeetingUrls,
};
