/**
 * Canonical map: Processes/*.md → Vitest regression files.
 * Gate for documentation-driven test coverage (see tests/PROCESS_COVERAGE_MATRIX.md).
 */
export type ProcessWorkflowEntry = {
  /** Relative path from repo root */
  processDoc: string;
  domain: 'Auth' | 'Appointments' | 'Meeting' | 'Clinical' | 'Content' | 'AI' | 'Admin' | 'Notifications' | 'Workflows' | 'Sync' | 'Infrastructure';
  /** Vitest paths relative to tests/unit/ */
  unitTests: string[];
  priority: 'P0' | 'P1' | 'P2';
};

export const DOCTOR_PORTAL_PROCESS_TESTS: ProcessWorkflowEntry[] = [
  { processDoc: 'Processes/Pages/Doctor-Portal/00_Doctor_Portal_Overview.md', domain: 'Auth', priority: 'P2', unitTests: ['doctor-portal/config.test.ts', 'doctor-portal/authServer.test.ts', 'doctor-portal/processPagesContract.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/01_Login_Page.md', domain: 'Auth', priority: 'P1', unitTests: ['doctor-portal/authServer.test.ts', 'doctor-portal/authServer.http.test.ts', 'doctor-portal/processPagesContract.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/02_Reset_Password_Page.md', domain: 'Auth', priority: 'P2', unitTests: ['doctor-portal/authServer.http.test.ts', 'doctor-portal/processPagesContract.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/03_Dashboard_Page.md', domain: 'Admin', priority: 'P1', unitTests: ['doctor-portal/dashboardFiltering.test.ts', 'doctor-portal/telemedDashboard.test.ts', 'patient-portal/dashboardWorkflow.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/04_Schedule_Page.md', domain: 'Appointments', priority: 'P1', unitTests: ['doctor-portal/scheduleManagement.test.ts', 'doctor-portal/scheduleParity.behavior.test.ts', 'doctor-portal/scheduleCountParity.behavior.test.ts', 'doctor-portal/scheduleCalendarMapperContract.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/05_Patient_Management_Page.md', domain: 'Clinical', priority: 'P1', unitTests: ['doctor-portal/patientDetailView.test.ts', 'doctor-portal/processPagesContract.test.ts', 'doctor-portal/patientDoctorMessages.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/06_Health_Meeting_Page.md', domain: 'Meeting', priority: 'P0', unitTests: ['doctor-portal/meetingJoinContract.test.ts', 'doctor-portal/meetingWorkflowHardening.test.ts', 'doctor-portal/meetingRoomRoutes.test.ts', 'doctor-portal/queueAcceptTraceability.test.ts', 'doctor-portal/clinicalBreadcrumb.test.ts', 'cross-portal/defectIsaraPdfMeetingQueue.test.ts', 'cross-portal/appointmentUxContract.test.ts', 'cross-portal/meetingUxContract.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/08_EMR_Editor.md', domain: 'Clinical', priority: 'P1', unitTests: ['doctor-portal/emrService.test.ts', 'doctor-portal/emrAutosave.test.ts', 'doctor-portal/emr-clinical.test.ts', 'doctor-portal/emrAiDraft.test.ts', 'cross-portal/phrEmrUxContract.test.ts', 'cross-portal/emrSignDeliveryContract.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/09_Prescribing.md', domain: 'Clinical', priority: 'P1', unitTests: ['doctor-portal/prescriptions.test.ts', 'doctor-portal/prescribingAllergy.test.ts', 'doctor-portal/drugDatabase.test.ts', 'cross-portal/imagingRxLabDeliveryContract.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/10_Lab_Orders.md', domain: 'Clinical', priority: 'P0', unitTests: ['doctor-portal/labOrders.test.ts', 'doctor-portal/labTestDatabase.test.ts', 'cross-portal/imagingRxLabDeliveryContract.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/11_Patient_Record_Viewer.md', domain: 'Clinical', priority: 'P1', unitTests: ['doctor-portal/healthRecordsEmrWorkflow.test.ts', 'cross-portal/healthRecordsWorkflowContract.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/12_Medical_Consultants_Page.md', domain: 'Content', priority: 'P2', unitTests: ['doctor-portal/medicalConsultants.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/13_Medical_Content_Page.md', domain: 'Content', priority: 'P2', unitTests: ['doctor-portal/medicalContentWorkflow.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/14_Clinical_Resources_Page.md', domain: 'Content', priority: 'P2', unitTests: ['doctor-portal/clinicalResources.test.ts', 'doctor-portal/clinicalResourcesMount.behavior.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/15_Gemini_AI_Studio.md', domain: 'AI', priority: 'P2', unitTests: ['doctor-portal/geminiService.test.ts', 'doctor-portal/geminiServerProxy.regression.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/16_Doctor_Profile_Page.md', domain: 'Auth', priority: 'P2', unitTests: ['doctor-portal/processPagesContract.test.ts', 'doctor-portal/doctorProfileCrudContract.test.ts', 'cross-portal/settingsI18n.behavior.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/17_Admin_Appointment_Management.md', domain: 'Admin', priority: 'P1', unitTests: ['doctor-portal/adminAppointmentManagement.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/18_Admin_Doctor_Management.md', domain: 'Admin', priority: 'P1', unitTests: ['doctor-portal/adminDoctorManagement.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/19_Doctors_Management_Page.md', domain: 'Admin', priority: 'P2', unitTests: ['doctor-portal/adminDoctorManagement.test.ts', 'doctor-portal/processPagesContract.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md', domain: 'Appointments', priority: 'P0', unitTests: ['doctor-portal/appointmentPoolManagement.test.ts', 'doctor-portal/queueLifecycle.integration.test.ts', 'doctor-portal/queueAcceptTraceability.test.ts'] },
  { processDoc: 'Processes/Pages/Doctor-Portal/21_Queue_Management.md', domain: 'Appointments', priority: 'P0', unitTests: ['doctor-portal/queueManagementWorkflow.test.ts', 'doctor-portal/queueSocket.test.ts', 'doctor-portal/queueAcceptTraceability.test.ts'] },
];

export const PATIENT_PORTAL_PROCESS_TESTS: ProcessWorkflowEntry[] = [
  { processDoc: 'Processes/Pages/Patient-Portal/00_Patient_Portal_Overview.md', domain: 'Auth', priority: 'P2', unitTests: ['patient-portal/auth-context.test.ts', 'patient-portal/mainLayout.nav.test.ts', 'patient-portal/processPagesContract.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/01_Login_Page.md', domain: 'Auth', priority: 'P1', unitTests: ['patient-portal/authRoute.test.ts', 'patient-portal/auth-context.test.ts', 'patient-portal/processPagesContract.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/02_Register_Page.md', domain: 'Auth', priority: 'P1', unitTests: ['patient-portal/registerRoute.test.ts', 'patient-portal/authPayloadContract.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/03_Reset_Password_Page.md', domain: 'Auth', priority: 'P1', unitTests: ['patient-portal/resetPasswordRoute.test.ts', 'patient-portal/authPayloadContract.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/04_Dashboard_Page.md', domain: 'Workflows', priority: 'P1', unitTests: ['patient-portal/dashboardWorkflow.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/05_Appointments_Page.md', domain: 'Appointments', priority: 'P0', unitTests: ['patient-portal/appointmentWorkflow.test.ts', 'patient-portal/bookAppointment.test.ts', 'patient-portal/appointmentDetail.test.ts', 'patient-portal/unifiedQueueFilter.test.ts', 'cross-portal/appointmentWorkflowContract.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/06_PHR_Page.md', domain: 'Clinical', priority: 'P0', unitTests: ['patient-portal/phrRoute.test.ts', 'patient-portal/sharedPHRTypes.test.ts', 'patient-portal/phrTimeline.route.test.ts', 'patient-portal/phrDocuments.test.ts', 'patient-portal/phrCrudContract.test.ts', 'cross-portal/healthRecordsWorkflowContract.test.ts', 'cross-portal/phrEmrUxContract.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/07_AI_Doctor_Page.md', domain: 'AI', priority: 'P2', unitTests: ['patient-portal/aiRoute.test.ts', 'patient-portal/aiNewChat.behavior.test.ts', 'patient-portal/aiTriage.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/08_Medical_Content_Library.md', domain: 'Content', priority: 'P2', unitTests: ['patient-portal/contentRoute.test.ts', 'patient-portal/medicalContentThumbnail.behavior.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/09_Map_Page.md', domain: 'Workflows', priority: 'P2', unitTests: ['patient-portal/mapPage.test.ts', 'patient-portal/mapMarkers.behavior.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/10_PDPA_Page.md', domain: 'Clinical', priority: 'P2', unitTests: ['patient-portal/pdpaWorkflow.test.ts', 'patient-portal/pdpaRoute.test.ts', 'patient-portal/pdpaAudit.integration.test.ts', 'cross-portal/pdpaConsentContract.test.ts', 'cross-portal/pdpaG15G16Contract.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/11_Living_Will_Page.md', domain: 'Clinical', priority: 'P2', unitTests: ['patient-portal/livingWillWorkflow.test.ts', 'patient-portal/livingWillInput.behavior.test.ts', 'patient-portal/livingWillCanonicalPath.regression.test.ts', 'cross-portal/livingWillContract.test.ts', 'cross-portal/livingWillShareContract.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/12_Profile_Page.md', domain: 'Auth', priority: 'P2', unitTests: ['patient-portal/userManagementWorkflow.test.ts', 'patient-portal/phrProfilePersist.behavior.test.ts', 'patient-portal/profileWorkflow.test.ts', 'patient-portal/processPagesContract.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/13_Settings_Page.md', domain: 'Workflows', priority: 'P2', unitTests: ['patient-portal/settingsPage.test.ts', 'cross-portal/settingsI18n.behavior.test.ts', 'cross-portal/settingsI18nPlaceholders.behavior.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/14_Timeline_Page.md', domain: 'Workflows', priority: 'P2', unitTests: ['patient-portal/timelinePage.test.ts', 'patient-portal/phrTimeline.route.test.ts'] },
  { processDoc: 'Processes/Pages/Patient-Portal/15_Notification_System.md', domain: 'Notifications', priority: 'P2', unitTests: ['patient-portal/notificationWorkflow.test.ts', 'patient-portal/notificationService.test.ts', 'patient-portal/notificationsRoute.test.ts', 'cross-portal/notificationWorkflowContract.test.ts', 'cross-portal/notificationDedupContract.test.ts'] },
];

export const MEETING_SERVER_PROCESS_TESTS: ProcessWorkflowEntry[] = [
  { processDoc: 'Processes/Pages/Meeting-Server/00_Meeting_Server_Overview.md', domain: 'Meeting', priority: 'P0', unitTests: ['meeting-server/joinConfigAcceptance.test.ts', 'meeting-server/hostReadyGate.test.ts', 'meeting-server/lobbyFlow.test.ts', 'doctor-portal/meetingRoomRoutes.test.ts'] },
  { processDoc: 'Processes/Pages/Meeting-Server/01_Meeting_Room.md', domain: 'Meeting', priority: 'P0', unitTests: ['meeting-server/joinConfigAcceptance.test.ts', 'meeting-server/transcriptHostControlsContract.test.ts', 'meeting-server/guestAnonymousDenyContract.test.ts', 'cross-portal/jitsiMeetingConfig.test.ts', 'cross-portal/meetingUxContract.test.ts', 'cross-portal/adminLobbyModeratorDenyContract.test.ts'] },
  { processDoc: 'Processes/Pages/Meeting-Server/02_Meeting_Results.md', domain: 'Meeting', priority: 'P0', unitTests: ['doctor-portal/meetingResultsValidation.test.ts', 'cross-portal/postMeetingWorkflow.integration.test.ts', 'cross-portal/meetingUxContract.test.ts', 'cross-portal/mitlValidateContract.test.ts'] },
  { processDoc: 'Processes/Pages/Meeting-Server/03_Emr_Appointment_Page.md', domain: 'Clinical', priority: 'P0', unitTests: ['doctor-portal/emrAiDraft.test.ts', 'doctor-portal/meetingRoomRoutes.test.ts', 'cross-portal/phrEmrUxContract.test.ts', 'cross-portal/emrSignDeliveryContract.test.ts'] },
];

export const HIGH_LEVEL_WORKFLOW_TESTS: ProcessWorkflowEntry[] = [
  { processDoc: 'Processes/Appointment_Workflows.md', domain: 'Appointments', priority: 'P0', unitTests: ['cross-portal/appointmentWorkflowContract.test.ts', 'cross-portal/calendarConfirmNotification.test.ts', 'cross-portal/confirmTripleNotifyContract.test.ts', 'cross-portal/adminCannotConfirmContract.test.ts', 'cross-portal/declineToPoolContract.test.ts', 'cross-portal/appointmentUxContract.test.ts', 'doctor-portal/queueLifecycle.integration.test.ts', 'doctor-portal/confirmSetsConfirmedDate.test.ts', 'patient-portal/unifiedQueueFilter.test.ts', 'patient-portal/appointmentWorkflow.test.ts'] },
  { processDoc: 'Processes/Health_Records_Processes.md', domain: 'Clinical', priority: 'P1', unitTests: ['cross-portal/healthRecordsWorkflowContract.test.ts', 'cross-portal/emrToPhrDelivery.integration.test.ts', 'doctor-portal/healthRecordsEmrWorkflow.test.ts', 'patient-portal/phrRoute.test.ts', 'patient-portal/phrCrudContract.test.ts'] },
  { processDoc: 'Processes/Clinical_Document_Delivery_Workflows.md', domain: 'Clinical', priority: 'P0', unitTests: ['cross-portal/clinicalDocumentDelivery.test.ts', 'patient-portal/phrDocuments.test.ts', 'cross-portal/emrToPhrDelivery.integration.test.ts', 'cross-portal/emrSignDeliveryContract.test.ts', 'cross-portal/imagingRxLabDeliveryContract.test.ts', 'cross-portal/pageElementContract.test.ts'] },
  { processDoc: 'Processes/FULL_WORKFLOW_CONTRACT.md', domain: 'Infrastructure', priority: 'P0', unitTests: ['cross-portal/fullWorkflowInvariants.test.ts', 'cross-portal/workflowContract.test.ts', 'cross-portal/processPageCoverage.test.ts', 'cross-portal/authLockoutContract.test.ts', 'cross-portal/crossRoleApiDenialContract.test.ts'] },
  { processDoc: 'Processes/POST_MEETING_WORKFLOW.md', domain: 'Meeting', priority: 'P0', unitTests: ['cross-portal/postMeetingWorkflow.integration.test.ts', 'cross-portal/meetingLifecycleFixture.test.ts', 'cross-portal/mitlValidateContract.test.ts', 'meeting/parseLobbyThreeParty.test.ts', 'meeting-server/generateSummary.integration.test.ts', 'meeting-server/recordingRoundTrip.integration.test.ts', 'meeting-server/meetingSmokeStepsContract.test.ts', 'doctor-portal/meetingResultsValidation.test.ts'] },
  { processDoc: 'Processes/VIDEO_MEETING_JITSI_GEMINI.md', domain: 'Meeting', priority: 'P0', unitTests: ['meeting-server/jitsiRoleJwt.test.ts', 'meeting-server/threePartyLobby.integration.test.ts', 'meeting-server/portalCorsOrigins.test.ts', 'meeting-server/transcriptionFlow.test.ts', 'meeting-server/transcriptHostControlsContract.test.ts', 'meeting-server/guestAnonymousDenyContract.test.ts', 'cross-portal/jitsiMeetingConfig.test.ts', 'cross-portal/resolveMeetingEnv.test.ts', 'cross-portal/meetingBffProxyContract.test.ts', 'cross-portal/sessionAuthCrossPortal.test.ts', 'cross-portal/adminLobbyModeratorDenyContract.test.ts', 'patient-portal/jitsiDisplayName.behavior.test.ts', 'patient-portal/meetingJoinProxy.test.ts', 'doctor-portal/meetingWorkflowHardening.test.ts', 'doctor-portal/meetingRecordingUi.test.ts', 'meeting/parseLobbyThreeParty.test.ts'] },
  { processDoc: 'Processes/Notification_Workflows.md', domain: 'Notifications', priority: 'P2', unitTests: ['patient-portal/notificationWorkflow.test.ts', 'patient-portal/notificationService.test.ts', 'cross-portal/notificationWorkflowContract.test.ts', 'cross-portal/notificationDedupContract.test.ts', 'cross-portal/confirmTripleNotifyContract.test.ts'] },
  { processDoc: 'Processes/Combined_Workflows_And_Actions.md', domain: 'Workflows', priority: 'P0', unitTests: ['cross-portal/combinedWorkflowActions.test.ts', 'cross-portal/bookToMeetToPhrChain.integration.test.ts', 'cross-portal/fullWorkflowInvariants.test.ts'] },
  { processDoc: 'Processes/Separated_Workflows_And_Functions.md', domain: 'Workflows', priority: 'P0', unitTests: ['cross-portal/separatedWorkflowFunctions.test.ts', 'cross-portal/workflowContract.test.ts'] },
  { processDoc: 'Processes/Living_Will_Processes.md', domain: 'Clinical', priority: 'P2', unitTests: ['cross-portal/livingWillContract.test.ts', 'cross-portal/livingWillShareContract.test.ts', 'patient-portal/livingWillWorkflow.test.ts'] },
  { processDoc: 'Processes/Data_Sync_Documentation.md', domain: 'Sync', priority: 'P1', unitTests: ['cross-portal/syncQueue.integration.test.ts', 'doctor-portal/queueSocket.test.ts', 'cross-portal/dataSyncValidation.test.ts', 'cross-portal/notifySocketRoomMapContract.test.ts', 'cross-portal/offlineEmrSync.test.ts'] },
  { processDoc: 'Processes/ENV_AND_STACK_CHECK.md', domain: 'Infrastructure', priority: 'P0', unitTests: ['cross-portal/doctorEnvAudit.test.ts', 'config/envSchema.test.ts', 'config/envForbiddenKeys.test.ts'] },
  { processDoc: 'Processes/SECURITY_SCANNING.md', domain: 'Infrastructure', priority: 'P0', unitTests: ['cross-portal/securityScanningContract.test.ts', 'config/envForbiddenKeys.test.ts'] },
  { processDoc: 'Processes/TWO_ROUND_CLOUD_TESTING.md', domain: 'Infrastructure', priority: 'P1', unitTests: ['cross-portal/twoRoundCloudTestingContract.test.ts', 'cross-portal/processPageCoverage.test.ts'] },
  { processDoc: 'Processes/WORKFLOW_CONNECTIONS.md', domain: 'Infrastructure', priority: 'P0', unitTests: ['cross-portal/workflowConnectionsContract.test.ts', 'cross-portal/notifySocketRoomMapContract.test.ts'] },
  { processDoc: 'Processes/PostgreSQL_Database_Architecture.md', domain: 'Infrastructure', priority: 'P1', unitTests: ['database/schema-validation.test.ts', 'database/embeddedPg.test.ts', 'database/appointmentTx.integration.test.ts'] },
  { processDoc: 'Processes/User_management_Workflows.md', domain: 'Auth', priority: 'P1', unitTests: ['doctor-portal/adminDoctorManagement.test.ts', 'patient-portal/userManagementWorkflow.test.ts', 'patient-portal/registerRoute.test.ts', 'cross-portal/authLockoutContract.test.ts', 'cross-portal/googleSsoContract.test.ts', 'cross-portal/crossRoleApiDenialContract.test.ts'] },
  { processDoc: 'Processes/Clinical_Resources_&_Medical_Library_Workflows.md', domain: 'Content', priority: 'P2', unitTests: ['doctor-portal/clinicalResources.test.ts', 'patient-portal/contentRoute.test.ts', 'cross-portal/contentVisibilityContract.test.ts', 'cross-portal/contentApprovalStateMachine.test.ts'] },
  { processDoc: 'Processes/Medical_Consultants_Workflows.md', domain: 'Content', priority: 'P2', unitTests: ['doctor-portal/medicalConsultants.test.ts'] },
  { processDoc: 'Processes/Medicine_Content_Processes.md', domain: 'Content', priority: 'P2', unitTests: ['doctor-portal/medicalContentWorkflow.test.ts', 'patient-portal/medicalContentThumbnail.behavior.test.ts', 'cross-portal/contentWorkflowContract.test.ts', 'cross-portal/contentApprovalStateMachine.test.ts'] },
  { processDoc: 'Processes/System_Architecture_Overview.md', domain: 'Infrastructure', priority: 'P2', unitTests: ['cross-portal/serviceReadiness.test.ts', 'cross-portal/globalSetupLogic.test.ts'] },
  { processDoc: 'Processes/GATE0_IMPLEMENTATION_STATUS.md', domain: 'Appointments', priority: 'P0', unitTests: ['cross-portal/gate0ImplementationContract.test.ts', 'doctor-portal/queueLifecycle.integration.test.ts', 'cross-portal/appointmentWorkflowContract.test.ts', 'cross-portal/adminCannotConfirmContract.test.ts'] },
  { processDoc: 'Processes/PHASE1_REQUIREMENTS.md', domain: 'Infrastructure', priority: 'P2', unitTests: ['cross-portal/phase1RequirementsContract.test.ts', 'cross-portal/fullWorkflowInvariants.test.ts'] },
  { processDoc: 'Processes/PROCESS_TO_TEST_GATE.md', domain: 'Infrastructure', priority: 'P0', unitTests: ['cross-portal/processPageCoverage.test.ts', 'cross-portal/fullWorkflowInvariants.test.ts'] },
];

export const ALL_PROCESS_WORKFLOW_ENTRIES: ProcessWorkflowEntry[] = [
  ...DOCTOR_PORTAL_PROCESS_TESTS,
  ...PATIENT_PORTAL_PROCESS_TESTS,
  ...MEETING_SERVER_PROCESS_TESTS,
  ...HIGH_LEVEL_WORKFLOW_TESTS,
];

export function uniqueUnitTestFiles(entries: ProcessWorkflowEntry[] = ALL_PROCESS_WORKFLOW_ENTRIES): string[] {
  return [...new Set(entries.flatMap((e) => e.unitTests))];
}
