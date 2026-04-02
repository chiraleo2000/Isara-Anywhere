-- ============================================================================
-- v2.2.0 PG LISTEN/NOTIFY triggers for cross-service real-time sync
-- ============================================================================
-- These triggers fire NOTIFY on data mutations so that ALL services
-- connected to the same PostgreSQL database can react in real time
-- without direct Socket.IO inter-service communication.
--
-- Channel: data_changes
-- Payload:  JSON { table, operation, id, patient_id, doctor_id }
-- ============================================================================

-- Generic trigger function: sends a JSON payload on the 'data_changes' channel
CREATE OR REPLACE FUNCTION notify_data_change()
RETURNS trigger AS $$
DECLARE
  payload JSON;
  record_id TEXT;
  patient TEXT;
  doctor TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    record_id := OLD.id::TEXT;
    patient   := COALESCE(OLD.patient_id::TEXT, '');
    doctor    := COALESCE(OLD.doctor_id::TEXT, '');
  ELSE
    record_id := NEW.id::TEXT;
    patient   := COALESCE(NEW.patient_id::TEXT, '');
    doctor    := COALESCE(NEW.doctor_id::TEXT, '');
  END IF;

  payload := json_build_object(
    'table',     TG_TABLE_NAME,
    'operation', TG_OP,
    'id',        record_id,
    'patient_id', patient,
    'doctor_id',  doctor
  );

  PERFORM pg_notify('data_changes', payload::TEXT);
  RETURN NULL; -- AFTER trigger, return value is ignored
END;
$$ LANGUAGE plpgsql;

-- Appointments
DROP TRIGGER IF EXISTS trg_appointments_notify ON appointments;
CREATE TRIGGER trg_appointments_notify
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION notify_data_change();

-- EMR
DROP TRIGGER IF EXISTS trg_emr_notify ON emr;
CREATE TRIGGER trg_emr_notify
  AFTER INSERT OR UPDATE ON emr
  FOR EACH ROW EXECUTE FUNCTION notify_data_change();

-- Prescriptions
DROP TRIGGER IF EXISTS trg_prescriptions_notify ON prescriptions;
CREATE TRIGGER trg_prescriptions_notify
  AFTER INSERT OR UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION notify_data_change();

-- Lab Orders
DROP TRIGGER IF EXISTS trg_lab_orders_notify ON lab_orders;
CREATE TRIGGER trg_lab_orders_notify
  AFTER INSERT OR UPDATE ON lab_orders
  FOR EACH ROW EXECUTE FUNCTION notify_data_change();

-- Notifications
DROP TRIGGER IF EXISTS trg_notifications_notify ON notifications;
CREATE TRIGGER trg_notifications_notify
  AFTER INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_data_change();

-- Vital Signs
DROP TRIGGER IF EXISTS trg_vital_signs_notify ON vital_signs;
CREATE TRIGGER trg_vital_signs_notify
  AFTER INSERT OR UPDATE ON vital_signs
  FOR EACH ROW EXECUTE FUNCTION notify_data_change();

-- PHR
DROP TRIGGER IF EXISTS trg_phr_notify ON phr;
CREATE TRIGGER trg_phr_notify
  AFTER INSERT OR UPDATE ON phr
  FOR EACH ROW EXECUTE FUNCTION notify_data_change();

-- Doctor Schedules
DROP TRIGGER IF EXISTS trg_doctor_schedules_notify ON doctor_schedules;
CREATE TRIGGER trg_doctor_schedules_notify
  AFTER INSERT OR UPDATE OR DELETE ON doctor_schedules
  FOR EACH ROW EXECUTE FUNCTION notify_data_change();

-- ============================================================================
-- Content tables use author_id (not patient_id/doctor_id), so they need a
-- separate trigger function that broadcasts to all connected clients.
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_content_change()
RETURNS trigger AS $$
DECLARE
  payload JSON;
  record_id TEXT;
  new_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    record_id  := OLD.id::TEXT;
    new_status := 'archived';
  ELSE
    record_id  := NEW.id::TEXT;
    new_status := NEW.status::TEXT;
  END IF;

  payload := json_build_object(
    'table',     TG_TABLE_NAME,
    'operation', TG_OP,
    'id',        record_id,
    'status',    new_status,
    'patient_id', '',
    'doctor_id',  ''
  );

  PERFORM pg_notify('data_changes', payload::TEXT);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Medical Content
DROP TRIGGER IF EXISTS trg_medical_content_notify ON medical_content;
CREATE TRIGGER trg_medical_content_notify
  AFTER INSERT OR UPDATE OR DELETE ON medical_content
  FOR EACH ROW EXECUTE FUNCTION notify_content_change();

-- Clinical Resources
DROP TRIGGER IF EXISTS trg_clinical_resources_notify ON clinical_resources;
CREATE TRIGGER trg_clinical_resources_notify
  AFTER INSERT OR UPDATE OR DELETE ON clinical_resources
  FOR EACH ROW EXECUTE FUNCTION notify_content_change();
