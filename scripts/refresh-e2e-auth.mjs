import { refreshAuthStorageStates } from './tests/helpers/auth-refresh.ts';

async function main() {
  process.env.PATIENT_URL = process.env.PATIENT_URL || 'http://127.0.0.1:3005';
  process.env.DOCTOR_URL = process.env.DOCTOR_URL || 'http://127.0.0.1:3010';
  await refreshAuthStorageStates();
  console.log('auth refreshed for', process.env.PATIENT_URL, process.env.DOCTOR_URL);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
