import { Router, Request, Response } from 'express';
import { storage, GCS_BUCKETS } from '../index';
import { authMiddleware } from '../middleware/auth';
import { notificationService } from '../services/notificationService';

const router = Router();

// Helper functions
async function readJSON(bucket: string, filePath: string): Promise<any> {
  try {
    const file = storage.bucket(bucket).file(filePath);
    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch (error: any) {
    if (error.code === 404) {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

async function writeJSON(bucket: string, filePath: string, data: any): Promise<void> {
  const file = storage.bucket(bucket).file(filePath);
  await file.save(JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
}

// Get all appointments for a patient
router.get('/patient/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    // Read appointments from GCS: appointments.json
    const allAppointments = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json');

    // Filter appointments for this patient
    const patientAppointments = allAppointments.filter((apt: any) => apt.patientId === patientId);

    res.json(patientAppointments);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.json([]); // Return empty array if no appointments yet
    }
    console.error('Get appointments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single appointment
router.get('/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    // First try to get from the main appointments.json (most up-to-date after doctor confirms)
    let appointment = null;
    try {
      const allAppointments = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json');
      appointment = allAppointments.find((apt: any) => apt.id === appointmentId);
    } catch {
      // Fall back to details file
    }

    // If not found in main list, try the individual details file
    if (!appointment) {
      try {
        appointment = await readJSON(
          GCS_BUCKETS.APPOINTMENTS,
          `appointments/${appointmentId}/details.json`
        );
      } catch {
        // Not found in either location
      }
    }

    // Also check for meeting link data and merge if available
    if (appointment) {
      try {
        const meetingLinkData = await readJSON(
          GCS_BUCKETS.APPOINTMENTS,
          `appointments/${appointmentId}/meeting-link.json`
        );
        // Merge meeting link data into appointment
        appointment = {
          ...appointment,
          meetingLink: meetingLinkData.meetLink || appointment.meetingLink,
          meetCode: meetingLinkData.meetCode || appointment.meetCode,
          scheduledDate: meetingLinkData.scheduledDate || appointment.scheduledDate,
          scheduledTime: meetingLinkData.scheduledTime || appointment.scheduledTime,
        };
      } catch {
        // No meeting link file yet - that's ok
      }
    }

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error: any) {
    console.error('Get appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new appointment
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const appointmentData = req.body;

    const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Determine initial status based on appointment type and doctor selection
    let initialStatus = appointmentData.status || 'pending';
    if (appointmentData.doctorId === 'unassigned') {
      initialStatus = 'in_pool';
    } else if (appointmentData.assignmentMethod === 'patient_selected') {
      initialStatus = 'awaiting_doctor_response';
    }

    const appointment = {
      id: appointmentId,
      ...appointmentData,
      status: initialStatus,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Read existing appointments
    let appointments: any[] = [];
    try {
      appointments = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json');
    } catch {
      // File doesn't exist yet
    }

    // Add new appointment
    appointments.push(appointment);

    // Write appointments list back to GCS
    await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json', appointments);

    // Write appointment details to GCS: appointments/{appointmentId}/details.json
    await writeJSON(
      GCS_BUCKETS.APPOINTMENTS,
      `appointments/${appointmentId}/details.json`,
      appointment
    );

    // Send notification to doctor/admin about new appointment request
    try {
      await notificationService.notifyAppointmentRequested({
        appointmentId,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        patientEmail: appointment.patientEmail,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        doctorEmail: appointment.doctorEmail,
        appointmentType: appointment.type,
        urgency: appointment.urgency || 'normal',
        preferredDates: appointment.preferredDates,
        preferredTimeSlot: appointment.preferredTimeSlot,
        reason: appointment.reason,
        symptoms: appointment.symptoms,
      });
    } catch (notifError) {
      console.error('Failed to send appointment notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json(appointment);
  } catch (error: any) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update appointment status (for doctor confirmation/decline)
router.put('/:appointmentId/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { status, appointmentDate, appointmentTime, confirmedBy, rejectedBy, meetingLink } = req.body;

    // Read existing appointment
    const appointment = await readJSON(
      GCS_BUCKETS.APPOINTMENTS,
      `appointments/${appointmentId}/details.json`
    );

    const previousStatus = appointment.status;
    
    // Update appointment
    const updatedAppointment = {
      ...appointment,
      status,
      appointmentDate: appointmentDate || appointment.appointmentDate,
      appointmentTime: appointmentTime || appointment.appointmentTime,
      meetingLink: meetingLink || appointment.meetingLink,
      confirmedBy,
      confirmedAt: status === 'confirmed' ? new Date().toISOString() : undefined,
      rejectedBy,
      rejectedAt: status === 'in_pool' || status === 'pending' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    // Write updated appointment
    await writeJSON(
      GCS_BUCKETS.APPOINTMENTS,
      `appointments/${appointmentId}/details.json`,
      updatedAppointment
    );

    // Update in appointments list
    try {
      const appointments = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json');
      const index = appointments.findIndex((apt: any) => apt.id === appointmentId);
      if (index !== -1) {
        appointments[index] = updatedAppointment;
        await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json', appointments);
      }
    } catch (error) {
      console.error('Failed to update appointments list:', error);
    }

    // Send appropriate notifications based on status change
    try {
      if (status === 'confirmed' && previousStatus !== 'confirmed') {
        // Doctor confirmed - notify patient with meeting link and calendar
        const notificationResult = await notificationService.notifyAppointmentConfirmed({
          appointmentId,
          patientId: updatedAppointment.patientId,
          patientName: updatedAppointment.patientName,
          patientEmail: updatedAppointment.patientEmail,
          doctorId: updatedAppointment.doctorId,
          doctorName: updatedAppointment.doctorName,
          appointmentDate: updatedAppointment.appointmentDate,
          appointmentTime: updatedAppointment.appointmentTime,
          appointmentType: updatedAppointment.type,
          reason: updatedAppointment.reason,
        });

        // Save the generated meeting link back to the appointment
        if (notificationResult.meetingLink && !updatedAppointment.meetingLink) {
          updatedAppointment.meetingLink = notificationResult.meetingLink;
          updatedAppointment.calendarEventUrl = notificationResult.calendarEventUrl;
          
          // Update in GCS
          await writeJSON(
            GCS_BUCKETS.APPOINTMENTS,
            `appointments/${appointmentId}/details.json`,
            updatedAppointment
          );
          
          // Update in appointments list
          try {
            const appointments = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json');
            const index = appointments.findIndex((apt: any) => apt.id === appointmentId);
            if (index !== -1) {
              appointments[index] = updatedAppointment;
              await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json', appointments);
            }
          } catch (error) {
            console.error('Failed to update appointments list with meeting link:', error);
          }
          console.log(`✅ [APPOINTMENT] Meeting link saved for ${appointmentId}: ${updatedAppointment.meetingLink}`);
        }
      } else if ((status === 'in_pool' || status === 'pending') && previousStatus === 'awaiting_doctor_response') {
        // Doctor declined - notify patient and admin
        await notificationService.notifyAppointmentDeclined({
          appointmentId,
          patientId: updatedAppointment.patientId,
          patientName: updatedAppointment.patientName,
          patientEmail: updatedAppointment.patientEmail,
          doctorId: updatedAppointment.doctorId,
          doctorName: updatedAppointment.doctorName,
        });
      }
    } catch (notifError) {
      console.error('Failed to send status update notification:', notifError);
    }

    res.json(updatedAppointment);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    console.error('Update appointment status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update appointment
router.put('/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const updateData = req.body;

    // Read existing appointment
    const appointment = await readJSON(
      GCS_BUCKETS.APPOINTMENTS,
      `appointments/${appointmentId}/details.json`
    );

    // Update appointment
    const updatedAppointment = {
      ...appointment,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    // Write updated appointment
    await writeJSON(
      GCS_BUCKETS.APPOINTMENTS,
      `appointments/${appointmentId}/details.json`,
      updatedAppointment
    );

    // Update in appointments list
    try {
      const appointments = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json');
      const index = appointments.findIndex((apt: any) => apt.id === appointmentId);
      if (index !== -1) {
        appointments[index] = updatedAppointment;
        await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json', appointments);
      }
    } catch (error) {
      console.error('Failed to update appointments list:', error);
    }

    res.json(updatedAppointment);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    console.error('Update appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel appointment - with immediate notification to doctor and admin
router.delete('/:appointmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { cancelledBy = 'patient', reason } = req.body || {};

    // Read existing appointment
    const appointment = await readJSON(
      GCS_BUCKETS.APPOINTMENTS,
      `appointments/${appointmentId}/details.json`
    );

    // Check if appointment can be cancelled (not already completed or cancelled)
    if (appointment.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed appointment' });
    }
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' });
    }

    // Update status to cancelled
    const cancelledAppointment = {
      ...appointment,
      status: 'cancelled',
      cancelledBy,
      cancellationReason: reason,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Write updated appointment
    await writeJSON(
      GCS_BUCKETS.APPOINTMENTS,
      `appointments/${appointmentId}/details.json`,
      cancelledAppointment
    );

    // Update in appointments list
    try {
      const appointments = await readJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json');
      const index = appointments.findIndex((apt: any) => apt.id === appointmentId);
      if (index !== -1) {
        appointments[index] = cancelledAppointment;
        await writeJSON(GCS_BUCKETS.APPOINTMENTS, 'appointments.json', appointments);
      }
    } catch (error) {
      console.error('Failed to update appointments list:', error);
    }

    // Send immediate notification to doctor and admin about cancellation
    try {
      await notificationService.notifyAppointmentCancelled({
        appointmentId,
        patientId: cancelledAppointment.patientId,
        patientName: cancelledAppointment.patientName,
        patientEmail: cancelledAppointment.patientEmail,
        doctorId: cancelledAppointment.doctorId,
        doctorName: cancelledAppointment.doctorName,
        doctorEmail: cancelledAppointment.doctorEmail,
        appointmentDate: cancelledAppointment.appointmentDate,
        appointmentTime: cancelledAppointment.appointmentTime,
        reason,
      }, cancelledBy);
    } catch (notifError) {
      console.error('Failed to send cancellation notification:', notifError);
    }

    res.json(cancelledAppointment);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user notifications
router.get('/notifications/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const notifications = await notificationService.getUserNotifications(userId);
    res.json(notifications);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/notifications/:userId/:notificationId/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, notificationId } = req.params;
    await notificationService.markAsRead(userId, notificationId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

