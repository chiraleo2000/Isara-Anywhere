/**
 * Central Jitsi URL + External API config for Izara telemedicine.
 *
 * IMPORTANT: On public meet.jit.si, JWT moderator tokens are NOT honored.
 * We use Izara's own lobby (API + Socket.IO) and disable Jitsi's built-in lobby
 * so patients never see "waiting for moderator". Doctor should join the room
 * first (empty room → moderator on public Jitsi).
 */

export function buildJitsiHashParams(role = 'guest', options = {}) {
  const isHost = role === 'doctor' || role === 'host' || role === 'moderator';
  const params = new URLSearchParams();

  params.set('config.prejoinPageEnabled', 'false');
  params.set('config.requireDisplayName', 'false');
  params.set('config.startWithAudioMuted', String(options.startAudioMuted ?? false));
  params.set('config.startWithVideoMuted', String(options.startVideoMuted ?? false));
  params.set('config.enableClosePage', 'false');
  params.set('config.disableDeepLinking', 'true');
  params.set('config.defaultLanguage', options.language || 'th');
  params.set('config.enableInsecureRoomNameWarning', 'false');
  params.set('config.enableWelcomePage', 'false');
  params.set('config.disableThirdPartyRequests', 'true');

  // Izara lobby handles admission — never use Jitsi's moderator gate on meet.jit.si
  params.set('config.enableLobby', 'false');
  params.set('config.lobbyModeEnabled', 'false');
  params.set('config.enableLobbyChat', 'false');

  if (isHost) {
    params.set('config.moderator', 'true');
    params.set('config.disableModeratorIndicator', 'false');
  }

  if (options.displayName) {
    params.set('userInfo.displayName', options.displayName);
  }
  if (options.email) {
    params.set('userInfo.email', options.email);
  }

  params.set('interfaceConfig.APP_NAME', 'Izara Telemedicine');
  params.set('interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE', 'false');
  params.set('interfaceConfig.SHOW_JITSI_WATERMARK', 'false');
  params.set('interfaceConfig.SHOW_WATERMARK_FOR_GUESTS', 'false');
  params.set('interfaceConfig.SHOW_BRAND_WATERMARK', 'false');
  params.set('interfaceConfig.MOBILE_APP_PROMO', 'false');

  return params;
}

export function buildMeetingUrls(domain, roomName, participants = {}) {
  const base = `https://${domain}/${roomName}`;
  const doctor = participants.doctor || {};
  const patient = participants.patient || {};
  const guest = participants.guest || {};

  const doctorParams = buildJitsiHashParams('doctor', {
    displayName: doctor.name || 'Doctor',
    email: doctor.email,
    language: participants.language,
  });
  const patientParams = buildJitsiHashParams('patient', {
    displayName: patient.name || 'Patient',
    email: patient.email,
    language: participants.language,
    startVideoMuted: false,
  });
  const guestParams = buildJitsiHashParams('guest', {
    displayName: guest.name || 'Guest',
    language: participants.language,
    startAudioMuted: true,
  });

  const jwtQuery = (token) => (token ? `?jwt=${encodeURIComponent(token)}` : '');

  return {
    meeting: `${base}${jwtQuery(participants.jwt || '')}#${patientParams.toString()}`,
    doctor: `${base}${jwtQuery(participants.doctorJwt || '')}#${doctorParams.toString()}`,
    patient: `${base}#${patientParams.toString()}`,
    guest: `${base}#${guestParams.toString()}`,
  };
}

/** Config passed to JitsiMeetExternalAPI */
/** Canonical patient-portal guest URLs (single source of truth for invite copy). */
export function buildGuestPortalUrls({ patientPortalBase, meetingKey, guestName, token }) {
  const base = String(patientPortalBase || '').replace(/\/$/, '');
  const key = encodeURIComponent(String(meetingKey || ''));
  const nameQ = guestName ? `?name=${encodeURIComponent(String(guestName))}` : '';
  const guestJoinUrl = `${base}/guest-join/${key}${nameQ}`;
  const guestTokenUrl = token
    ? `${base}/guest/join/${encodeURIComponent(String(token))}`
    : undefined;
  return {
    guestJoinUrl,
    guestTokenUrl,
    /** Back-compat alias */
    guestLink: guestTokenUrl || guestJoinUrl,
  };
}

export function externalApiConfig(role = 'guest', displayName = 'Guest') {
  const isHost = role === 'doctor' || role === 'host' || role === 'admin';
  return {
    configOverwrite: {
      prejoinPageEnabled: false,
      requireDisplayName: false,
      ...(isHost ? { moderator: true } : {}),
      startWithAudioMuted: !isHost,
      startWithVideoMuted: false,
      enableClosePage: false,
      disableDeepLinking: true,
      defaultLanguage: 'th',
      enableWelcomePage: false,
      enableInsecureRoomNameWarning: false,
      disableThirdPartyRequests: true,
      enableLobby: false,
      lobbyModeEnabled: false,
      enableLobbyChat: false,
      hideLobbyButton: true,
      toolbarButtons: isHost
        ? ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'participants-pane', 'tileview', 'hangup', 'settings', 'fullscreen', 'recording']
        : ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'tileview', 'hangup', 'settings', 'fullscreen'],
    },
    interfaceConfigOverwrite: {
      APP_NAME: 'Izara Telemedicine',
      SHOW_PROMOTIONAL_CLOSE_PAGE: false,
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_BRAND_WATERMARK: false,
      TOOLBAR_ALWAYS_VISIBLE: true,
      MOBILE_APP_PROMO: false,
      DEFAULT_LOCAL_DISPLAY_NAME: displayName,
    },
  };
}
