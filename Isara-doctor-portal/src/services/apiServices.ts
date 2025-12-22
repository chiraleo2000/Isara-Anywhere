import { Appointment, AppointmentBooking, HealthRecord, AppointmentResult } from '../types';
import * as authService from './simpleAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Appointment Service
export class AppointmentService {
  async bookAppointment(booking: AppointmentBooking): Promise<Appointment> {
    const formData = new FormData();
    formData.append('data', JSON.stringify({
      symptoms: booking.symptoms,
      symptomDescription: booking.symptomDescription,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      doctorSpecialty: booking.doctorSpecialty,
      urgencyLevel: booking.urgencyLevel,
    }));

    if (booking.attachments) {
      booking.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments/book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Booking failed');
      }

      const data = await response.json();
      return {
        ...data,
        date: new Date(data.date),
      };
    } catch (error: any) {
      console.error('Booking error:', error);
      throw error;
    }
  }

  async getAppointments(): Promise<Appointment[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments`, {
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch appointments');
      
      const data = await response.json();
      return data.appointments.map((apt: any) => ({
        ...apt,
        date: new Date(apt.date),
      }));
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  }

  async getAppointmentById(id: string): Promise<Appointment> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments/${id}`, {
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch appointment');
      
      const data = await response.json();
      return { ...data, date: new Date(data.date) };
    } catch (error) {
      console.error('Error fetching appointment:', error);
      throw error;
    }
  }

  async cancelAppointment(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments/${id}/cancel`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to cancel appointment');
    } catch (error) {
      console.error('Error canceling appointment:', error);
      throw error;
    }
  }
}

// Records Service
export class RecordsService {
  async getRecords(): Promise<HealthRecord[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/records`, {
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch records');
      
      const data = await response.json();
      return data.records;
    } catch (error) {
      console.error('Error fetching records:', error);
      throw error;
    }
  }

  async getRecordsByType(type: string): Promise<HealthRecord[]> {
    const records = await this.getRecords();
    return records.filter(record => record.type === type);
  }

  async getAppointmentResults(): Promise<AppointmentResult[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/records/appointment-results`, {
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch appointment results');
      
      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Error fetching appointment results:', error);
      throw error;
    }
  }

  async getLatestAppointmentResult(): Promise<AppointmentResult | null> {
    const results = await this.getAppointmentResults();
    if (results.length === 0) return null;
    return results.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }
}

export class EMRService {
  async create(data: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/emr`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create EMR');
      return await response.json();
    } catch (error) {
      console.error('Error creating EMR:', error);
      throw error;
    }
  }

  async getByPatient(patientId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/emr/patient/${patientId}`, {
        headers: authService.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch EMRs');
      const data = await response.json();
      return data.emrs || [];
    } catch (error) {
      console.error('Error fetching EMRs:', error);
      return [];
    }
  }
}

export class PrescriptionService {
  async create(data: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/prescriptions`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create prescription');
      return await response.json();
    } catch (error) {
      console.error('Error creating prescription:', error);
      throw error;
    }
  }

  async getByPatient(patientId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/prescriptions/patient/${patientId}`, {
        headers: authService.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch prescriptions');
      const data = await response.json();
      return data.prescriptions || [];
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      return [];
    }
  }
}

export class LabOrderService {
  async create(data: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lab-orders`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create lab order');
      return await response.json();
    } catch (error) {
      console.error('Error creating lab order:', error);
      throw error;
    }
  }

  async getByPatient(patientId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lab-orders/patient/${patientId}`, {
        headers: authService.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch lab orders');
      const data = await response.json();
      return data.labOrders || [];
    } catch (error) {
      console.error('Error fetching lab orders:', error);
      return [];
    }
  }
}

export class QueueService {
  async getQueue(doctorId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/doctor/${doctorId}`, {
        headers: authService.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch queue');
      const data = await response.json();
      return data.queue || [];
    } catch (error) {
      console.error('Error fetching queue:', error);
      return [];
    }
  }

  async callNext(doctorId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/call-next`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ doctorId }),
      });
      if (!response.ok) throw new Error('Failed to call next patient');
      return await response.json();
    } catch (error) {
      console.error('Error calling next patient:', error);
      throw error;
    }
  }

  async skip(patientId: string, reason: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queue/skip`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ patientId, reason }),
      });
      if (!response.ok) throw new Error('Failed to skip patient');
    } catch (error) {
      console.error('Error skipping patient:', error);
      throw error;
    }
  }
}

export const appointmentService = new AppointmentService();
export const recordsService = new RecordsService();
export const emrService = new EMRService();
export const prescriptionService = new PrescriptionService();
export const labOrderService = new LabOrderService();
export const queueService = new QueueService();