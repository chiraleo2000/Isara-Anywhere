// Dev fallback — Docker runtime overwrites via envsubst from env-config.template.js
window.ENV = window.ENV || {
  DEMO_AUTO_LOGIN: '0',
  DEMO_AUTO_MEETING: '0',
  DEMO_PATIENT_EMAIL: 'demo.test@gmail.com',
  DEMO_PATIENT_PASSWORD: 'P@ssw0rd',
};
