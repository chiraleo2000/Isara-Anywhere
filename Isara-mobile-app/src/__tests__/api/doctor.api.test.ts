import { doctorApi } from '../../api/doctor.api';

jest.mock('../../api/client', () => ({
  api: {
    get: jest.fn().mockResolvedValue({}),
    post: jest.fn().mockResolvedValue({}),
    put: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
}));

const { api } = require('../../api/client');

// Test-only mock credentials — not real secrets
const MOCK_CREDENTIALS = { email: 'doc@hospital.com', credential: 'mock-test-value' };

describe('doctorApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authentication', () => {
    it('calls login on doctorAuth target', async () => {
      await doctorApi.login({ email: MOCK_CREDENTIALS.email, password: MOCK_CREDENTIALS.credential });
      expect(api.post).toHaveBeenCalledWith('doctorAuth', '/auth/login', {
        email: MOCK_CREDENTIALS.email,
        password: MOCK_CREDENTIALS.credential,
      });
    });

    it('calls register on doctorAuth target', async () => {
      const data = {
        name: 'Dr. Test',
        email: MOCK_CREDENTIALS.email,
        password: MOCK_CREDENTIALS.credential,
        medicalLicenseNumber: 'ML-001',
        specialty: 'General',
      };
      await doctorApi.register(data);
      expect(api.post).toHaveBeenCalledWith('doctorAuth', '/auth/register', data);
    });

    it('calls getMe on doctorAuth', async () => {
      await doctorApi.getMe();
      expect(api.get).toHaveBeenCalledWith('doctorAuth', '/auth/me');
    });

    it('calls requestPasswordReset', async () => {
      await doctorApi.requestPasswordReset('doc@hospital.com');
      expect(api.post).toHaveBeenCalledWith('doctorAuth', '/auth/request-password-reset', {
        email: 'doc@hospital.com',
      });
    });
  });

  describe('dashboard', () => {
    it('gets dashboard with encoded doctor id', async () => {
      await doctorApi.getDashboard('d-001');
      expect(api.get).toHaveBeenCalledWith('doctorApi', '/api/dashboard/d-001');
    });
  });

  describe('appointments', () => {
    it('gets appointments with doctorId query param', async () => {
      await doctorApi.getAppointments('d-001');
      expect(api.get).toHaveBeenCalledWith('doctorApi', '/api/appointments?doctorId=d-001');
    });

    it('claims an appointment', async () => {
      await doctorApi.claimAppointment('appt-1');
      expect(api.post).toHaveBeenCalledWith('doctorApi', '/api/appointments/appt-1/claim');
    });
  });

  describe('queue', () => {
    it('gets queue', async () => {
      await doctorApi.getQueue();
      expect(api.get).toHaveBeenCalledWith('doctorApi', '/api/queue');
    });
  });

  describe('patients', () => {
    it('gets patients without search', async () => {
      await doctorApi.getPatients();
      expect(api.get).toHaveBeenCalledWith('doctorApi', '/api/patients');
    });

    it('gets patients with search query', async () => {
      await doctorApi.getPatients('John');
      expect(api.get).toHaveBeenCalledWith('doctorApi', '/api/patients?search=John');
    });
  });
});
