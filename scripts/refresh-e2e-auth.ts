import { refreshAuthStorageStates } from '../tests/helpers/auth-refresh.ts';

process.env.PATIENT_URL = process.env.PATIENT_URL || 'http://127.0.0.1:3005';
process.env.DOCTOR_URL = process.env.DOCTOR_URL || 'http://127.0.0.1:3010';

await refreshAuthStorageStates();
console.log('auth refreshed for', process.env.PATIENT_URL, process.env.DOCTOR_URL);
