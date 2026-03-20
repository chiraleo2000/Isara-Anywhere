export interface EMRRecord {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  reviewOfSystems?: string;
  physicalExamination?: string;
  assessment?: string;
  diagnosis?: string;
  plan?: string;
  prescriptions?: string;
  followUp?: string;
  isSigned: boolean;
  createdAt: string;
  signedAt?: string;
}

export interface Drug {
  id: string;
  name: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
}

export interface ImagingOrder {
  id: string;
  patientId: string;
  doctorId: string;
  imagingType: string;
  targetSite: string;
  notes?: string;
  status: 'ordered' | 'completed';
  results?: string;
  orderedAt: string;
}
