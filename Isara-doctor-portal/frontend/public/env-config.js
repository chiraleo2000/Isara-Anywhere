// Dev fallback — Docker runtime overwrites via envsubst from env-config.template.js
globalThis.ENV = globalThis.ENV || {
  DEMO_AUTO_LOGIN: '0',
  DEMO_AUTO_MEETING: '0',
  DEMO_DOCTOR_EMAIL: 'doctor.test@izara.com',
  DEMO_DOCTOR_PASSWORD: 'IzaraDoctor@2024', // NOSONAR S2068 — dev-only demo seed; runtime uses env-config.template.js
  VITE_AUTO_ADMIT_LOBBY: '0',
};
