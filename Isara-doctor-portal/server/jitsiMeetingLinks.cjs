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

  return {
    roomName,
    meetingLink: baseUrl,
    doctorMeetingUrl: buildJitsiHashUrl(baseUrl, doctorName, {
      'config.startWithAudioMuted': 'false',
    }),
    patientMeetingUrl: buildJitsiHashUrl(baseUrl, patientName, {
      'config.startWithVideoMuted': 'false',
    }),
    guestMeetingUrl: buildJitsiHashUrl(baseUrl, 'Guest', {
      'config.startWithVideoMuted': 'true',
    }),
  };
}

module.exports = {
  generateIzaraRoomName,
  buildJitsiHashUrl,
  buildTelehealthMeetingUrls,
};
