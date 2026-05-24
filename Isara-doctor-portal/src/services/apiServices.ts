import { Appointment, AppointmentBooking, HealthRecord, AppointmentResult } from '../types';
import * as authService from './authServices';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
    const sorted = [...results].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted[0];
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

// Meeting Service - Handles video meeting AI summaries and storage
export interface MeetingResults {
  summary: {
    chiefComplaint: string;
    presentingSymptoms: string[];
    preliminaryAssessment: string;
    recommendations: string[];
    prescriptions: any[];
    followUp: string;
    redFlags: string[];
    lifestyleAdvice: string[];
    needsFollowUp: boolean;
    followUpDate: string | null;
  };
  duration: number;
  messages: any[];
  doctor: any;
  recordingUrl?: string | null;
  conversationComplete: boolean;
  timestamp: string;
}

export interface MeetingFilesResponse {
  success: boolean;
  appointmentId: string;
  meetingId?: string;
  duration?: number;
  endedAt?: string;
  files: {
    video: string | null;
    transcript: string | null;
    summary: string | null;
    recommendations: string | null;
  };
  storage?: {
    bucket: string;
    basePath: string;
  };
  transcript?: any[];
  summary?: any;
  recommendations?: any;
}

export class MeetingService {
  /**
   * Save meeting results to the backend (stores in GCS)
   * This is called when the meeting ends to persist AI summary to cloud storage
   */
  async saveMeetingResults(appointmentId: string, results: MeetingResults, doctorId: string, doctorName: string): Promise<any> {
    try {
      console.log('📤 Saving meeting results to GCS via API...', { appointmentId, doctorId });
      
      // Convert the frontend format to backend format
      const requestBody = {
        appointmentId,
        doctorId,
        doctorName,
        duration: results.duration,
        transcript: results.messages.map((m, i) => ({
          id: i + 1,
          speaker: m.sender === 'ai' ? 'doctor' : 'patient',
          text: m.content,
          timestamp: m.timestamp,
          isFinal: true
        })),
        summary: results.summary,
        recommendations: results.summary.recommendations,
        timestamp: results.timestamp
      };

      const response = await fetch(`${API_BASE_URL}/api/video-meeting/${appointmentId}/end`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save meeting results');
      }

      const data = await response.json();
      console.log('✅ Meeting results saved to GCS:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error saving meeting results:', error);
      throw error;
    }
  }

  /**
   * Get meeting files and AI summary from GCS
   */
  async getMeetingFiles(appointmentId: string, doctorId?: string): Promise<MeetingFilesResponse> {
    try {
      const url = doctorId 
        ? `${API_BASE_URL}/api/video-meeting/${appointmentId}/files?doctorId=${doctorId}`
        : `${API_BASE_URL}/api/video-meeting/${appointmentId}/files`;
        
      const response = await fetch(url, {
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch meeting files');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error fetching meeting files:', error);
      throw error;
    }
  }

  /**
   * Get meeting transcript and summary
   */
  async getMeetingTranscript(appointmentId: string): Promise<{ transcript: any[]; summary: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/video-meeting/${appointmentId}/transcript`, {
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch transcript');
      }

      const data = await response.json();
      return {
        transcript: data.transcript || [],
        summary: data.summary || null
      };
    } catch (error: any) {
      console.error('Error fetching meeting transcript:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations on demand
   */
  async generateRecommendations(appointmentId: string, patientInfo: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/video-meeting/${appointmentId}/recommendations`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientInfo }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate recommendations');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Check video meeting service health
   */
  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/video-meeting/health`, {
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Video meeting service unhealthy');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error checking meeting service health:', error);
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
export const meetingService = new MeetingService();