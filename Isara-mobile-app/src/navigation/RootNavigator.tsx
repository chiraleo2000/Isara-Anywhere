import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Auth screens
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';
import { PatientLoginScreen } from '../screens/auth/PatientLoginScreen';
import { PatientRegisterScreen } from '../screens/auth/PatientRegisterScreen';
import { DoctorLoginScreen } from '../screens/auth/DoctorLoginScreen';
import { DoctorRegisterScreen } from '../screens/auth/DoctorRegisterScreen';

// Tab navigators
import { PatientNavigator } from './PatientNavigator';
import { DoctorNavigator } from './DoctorNavigator';

// Shared detail screens
import { AppointmentDetailScreen } from '../screens/shared/AppointmentDetailScreen';
import { MeetingScreen } from '../screens/shared/MeetingScreen';
import { AIAssistantScreen } from '../screens/shared/AIAssistantScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

// Patient detail screens
import { BookAppointmentScreen } from '../screens/patient/BookAppointmentScreen';
import { VitalsScreen } from '../screens/patient/VitalsScreen';
import { TimelineScreen } from '../screens/patient/TimelineScreen';
import { PrescriptionsScreen } from '../screens/patient/PrescriptionsScreen';
import { LivingWillScreen } from '../screens/patient/LivingWillScreen';
import { MedicalContentScreen } from '../screens/patient/MedicalContentScreen';
import { PDPAConsentScreen } from '../screens/patient/PDPAConsentScreen';

// Doctor detail screens
import { PatientDetailScreen } from '../screens/doctor/PatientDetailScreen';
import { EMREditorScreen } from '../screens/doctor/EMREditorScreen';
import { PrescriptionEditorScreen } from '../screens/doctor/PrescriptionEditorScreen';
import { LabOrderScreen } from '../screens/doctor/LabOrderScreen';
import { ClinicalResourcesScreen } from '../screens/doctor/ClinicalResourcesScreen';
import { AvailabilityScreen } from '../screens/doctor/AvailabilityScreen';

export type RootStackParamList = {
  // Auth
  Welcome: undefined;
  RoleSelect: undefined;
  PatientLogin: undefined;
  PatientRegister: undefined;
  DoctorLogin: undefined;
  DoctorRegister: undefined;
  // Main
  PatientTabs: undefined;
  DoctorTabs: undefined;
  // Shared
  AppointmentDetail: { appointmentId: string };
  Meeting: { meetingId: string; jitsiUrl: string };
  AIAssistant: undefined;
  Settings: undefined;
  // Patient
  BookAppointment: { doctorId?: string };
  Vitals: { patientId: string };
  Timeline: { patientId: string };
  Prescriptions: { patientId: string };
  LivingWill: { patientId: string };
  MedicalContent: undefined;
  PDPAConsent: { patientId: string };
  // Doctor
  PatientDetail: { patientId: string };
  EMREditor: { patientId: string; appointmentId?: string };
  PrescriptionEditor: { patientId: string };
  LabOrder: { patientId: string };
  ClinicalResources: undefined;
  Availability: { doctorId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        // Authenticated flow
        <Stack.Group>
          {role === 'patient' ? (
            <Stack.Screen name="PatientTabs" component={PatientNavigator} />
          ) : (
            <Stack.Screen name="DoctorTabs" component={DoctorNavigator} />
          )}
          {/* Shared screens */}
          <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
          <Stack.Screen name="Meeting" component={MeetingScreen} />
          <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          {/* Patient detail screens */}
          <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
          <Stack.Screen name="Vitals" component={VitalsScreen} />
          <Stack.Screen name="Timeline" component={TimelineScreen} />
          <Stack.Screen name="Prescriptions" component={PrescriptionsScreen} />
          <Stack.Screen name="LivingWill" component={LivingWillScreen} />
          <Stack.Screen name="MedicalContent" component={MedicalContentScreen} />
          <Stack.Screen name="PDPAConsent" component={PDPAConsentScreen} />
          {/* Doctor detail screens */}
          <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
          <Stack.Screen name="EMREditor" component={EMREditorScreen} />
          <Stack.Screen name="PrescriptionEditor" component={PrescriptionEditorScreen} />
          <Stack.Screen name="LabOrder" component={LabOrderScreen} />
          <Stack.Screen name="ClinicalResources" component={ClinicalResourcesScreen} />
          <Stack.Screen name="Availability" component={AvailabilityScreen} />
        </Stack.Group>
      ) : (
        // Auth flow
        <Stack.Group>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="PatientLogin" component={PatientLoginScreen} />
          <Stack.Screen name="PatientRegister" component={PatientRegisterScreen} />
          <Stack.Screen name="DoctorLogin" component={DoctorLoginScreen} />
          <Stack.Screen name="DoctorRegister" component={DoctorRegisterScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
