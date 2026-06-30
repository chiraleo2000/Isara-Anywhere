-- One medical_record_access consent row per (patient, doctor)
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_consents_mra_patient_doctor
  ON patient_consents (patient_id, doctor_id, consent_type)
  WHERE doctor_id IS NOT NULL;
