import { patientApi } from '../../api/patient.api';

// Mock the client module
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
const MOCK_CREDENTIALS = { email: 'test@mail.com', credential: 'mock-test-value' };

describe('patientApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authentication', () => {
    it('calls login with correct params', async () => {
      api.post.mockResolvedValueOnce({ token: 'abc', user: { id: '1' } });
      await patientApi.login({ email: MOCK_CREDENTIALS.email, password: MOCK_CREDENTIALS.credential });
      expect(api.post).toHaveBeenCalledWith('patient', '/api/auth/login', {
        email: MOCK_CREDENTIALS.email,
        password: MOCK_CREDENTIALS.credential,
      });
    });

    it('calls register with correct params', async () => {
      const data = {
        name: 'Test',
        email: MOCK_CREDENTIALS.email,
        password: MOCK_CREDENTIALS.credential,
        confirmPassword: MOCK_CREDENTIALS.credential,
        phone: '0800000000',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      };
      await patientApi.register(data);
      expect(api.post).toHaveBeenCalledWith('patient', '/api/auth/register', data);
    });

    it('calls getMe', async () => {
      await patientApi.getMe();
      expect(api.get).toHaveBeenCalledWith('patient', '/api/auth/me');
    });

    it('calls requestPasswordReset', async () => {
      await patientApi.requestPasswordReset('user@mail.com');
      expect(api.post).toHaveBeenCalledWith('patient', '/api/auth/request-password-reset', {
        email: 'user@mail.com',
      });
    });
  });

  describe('appointments', () => {
    it('gets upcoming appointments', async () => {
      await patientApi.getUpcomingAppointments();
      expect(api.get).toHaveBeenCalledWith('patient', '/api/appointments/upcoming');
    });

    it('gets appointment history', async () => {
      await patientApi.getAppointmentHistory();
      expect(api.get).toHaveBeenCalledWith('patient', '/api/appointments/history');
    });

    it('gets single appointment with encoded id', async () => {
      await patientApi.getAppointment('appt-123');
      expect(api.get).toHaveBeenCalledWith('patient', '/api/appointments/appt-123');
    });

    it('books an appointment', async () => {
      const data = { doctorId: 'd-1', date: '2025-06-15', time: '10:00', reason: 'Checkup' };
      await patientApi.bookAppointment(data);
      expect(api.post).toHaveBeenCalledWith('patient', '/api/appointments', data);
    });

    it('cancels an appointment with encoded id', async () => {
      await patientApi.cancelAppointment('appt-123');
      expect(api.put).toHaveBeenCalledWith('patient', '/api/appointments/appt-123/cancel');
    });
  });

  describe('doctors', () => {
    it('gets doctors list', async () => {
      await patientApi.getDoctors();
      expect(api.get).toHaveBeenCalledWith('patient', '/api/doctors');
    });
  });

  describe('PHR', () => {
    it('gets PHR with encoded patient id', async () => {
      await patientApi.getPHR('p-001');
      expect(api.get).toHaveBeenCalledWith('patient', '/api/phr/p-001');
    });

    it('gets vitals', async () => {
      await patientApi.getVitals('p-001');
      expect(api.get).toHaveBeenCalledWith('patient', '/api/phr/p-001/vitals');
    });
  });
});
