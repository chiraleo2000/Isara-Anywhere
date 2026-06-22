/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — UNIT TEST CONFIGURATION v2.0.0
 * ═══════════════════════════════════════════════════════════════════════
 * All unit tests live here in tests/unit/ — completely isolated from
 * project source. Tests validate pure logic, data transforms, and
 * security functions without requiring running servers.
 *
 * Groups:
 *   auth        — Login, registration, JWT, middleware (doctor + patient)
 *   appointments— Booking, reschedule, queue, appointment workflows
 *   clinical    — EMR, PHR, prescriptions, lab orders, drug database
 *   content     — Medical content, clinical resources, consultants
 *   meeting     — Jitsi, transcription, AI summary, socket events
 *   ai          — Gemini AI, CDS, chat routes
 *   api         — API endpoints, server config, data services
 *   notifications— Notification service, routes, workflows
 *   security    — OWASP middleware, CORS, rate limiting, audit logs
 *   database    — Schema validation, seed data, embedded PG
 *
 * Run all:         npm test
 * Run group:       npm run test:auth
 * Run with UI:     npm run test:ui
 * ═══════════════════════════════════════════════════════════════════════
 */
import { defineConfig } from 'vitest/config';
import path from 'node:path';

// ── File lists per logical group ────────────────────────────────────────
const GROUP_AUTH = [
  'doctor-portal/doctorLogin.integration.test.ts',
  'doctor-portal/adminLogin.test.ts',
  'patient-portal/patientLogin.integration.test.ts',
  'doctor-portal/authServer.http.test.ts',
  'doctor-portal/authServer.test.ts',
  'doctor-portal/config.test.ts',
  'patient-portal/authRoute.test.ts',
  'patient-portal/authMiddleware.test.ts',
  'patient-portal/auth-context.test.ts',
  'patient-portal/registerRoute.test.ts',
  'patient-portal/resetPasswordRoute.test.ts',
];
const GROUP_APPOINTMENTS = [
  'doctor-portal/appointmentService.test.ts',
  'doctor-portal/appointmentReschedule.test.ts',
  'doctor-portal/queueManagementWorkflow.test.ts',
  'doctor-portal/queueLifecycle.integration.test.ts',
  'doctor-portal/queueAcceptTraceability.test.ts',
  'doctor-portal/processPagesContract.test.ts',
  'patient-portal/appointmentsRoute.test.ts',
  'patient-portal/appointmentWorkflow.test.ts',
  'patient-portal/bookAppointment.test.ts',
  'patient-portal/appointmentDetail.test.ts',
  'patient-portal/appointmentTypeFix.test.ts',   // regression tests for case-normalisation fix
  'patient-portal/appointmentSlotLock.test.ts',
  'patient-portal/appointmentsRollback.test.ts',
  'patient-portal/guestMeetingJoin.test.ts',
  'patient-portal/processPagesContract.test.ts',
  'doctor-portal/appointmentPoolManagement.test.ts',
];
const GROUP_CLINICAL = [
  'doctor-portal/meetingResultsValidation.test.ts',
  'doctor-portal/emrAutosave.test.ts',
  'doctor-portal/prescribingAllergy.test.ts',
  'doctor-portal/queueSocket.test.ts',
  'doctor-portal/emrService.test.ts',
  'doctor-portal/emr-clinical.test.ts',
  'doctor-portal/healthRecordsEmrWorkflow.test.ts',
  'doctor-portal/prescriptions.test.ts',
  'doctor-portal/labOrders.test.ts',
  'doctor-portal/labTestDatabase.test.ts',
  'doctor-portal/drugDatabase.test.ts',
  'patient-portal/phrRoute.test.ts',
  'patient-portal/sharedPHRTypes.test.ts',
  'patient-portal/livingWillWorkflow.test.ts',
  'patient-portal/pdpaRoute.test.ts',
  'patient-portal/pdpaWorkflow.test.ts',
  'patient-portal/pdpaAudit.integration.test.ts',
];
const GROUP_CONTENT = [
  'doctor-portal/medicalContentWorkflow.test.ts',
  'doctor-portal/medicalConsultants.test.ts',
  'patient-portal/contentRoute.test.ts',
];
const GROUP_MEETING = [
  'meeting/**',
  'meeting-server/generateSummary.integration.test.ts',
  'meeting-server/threePartyLobby.integration.test.ts',
  'meeting-server/jitsi-meeting.test.ts',
  'meeting-server/meetingRoutes.test.ts',
  'meeting-server/socketEvents.test.ts',
  'meeting-server/videoMeetingWorkflow.test.ts',
  'meeting-server/aiSummary.test.ts',
  'meeting-server/meeting-ai-features.test.ts',
  'meeting-server/lobbyFlow.test.ts',
  'meeting-server/lobbyKeyResolve.test.ts',
  'meeting-server/transcriptionFlow.test.ts',
  'meeting-server/joinConfigAcceptance.test.ts',
  'meeting-server/meetingCreateAcceptance.test.ts',
  'meeting-server/hostReadyGate.test.ts',
  'meeting-server/meetingRuntimeApi.test.ts',
  'meeting-server/jibriWebhook.test.ts',
  'meeting-server/jitsiRoleJwt.test.ts',
  'doctor-portal/meetingJoinContract.test.ts',
  'doctor-portal/meetingWorkflowHardening.test.ts',
  'doctor-portal/meetingTimeService.test.ts',
  'patient-portal/videoMeetingRoute.test.ts',
  'cross-portal/jitsiMeetingConfig.test.ts',
  'cross-portal/defectIsaraPdfMeetingQueue.test.ts',
  'patient-portal/jitsiDisplayName.behavior.test.ts',
];
const GROUP_AI = [
  'doctor-portal/geminiService.test.ts',
  'patient-portal/aiRoute.test.ts',
  'patient-portal/aiTriage.test.ts',
  'patient-portal/aiNewChat.behavior.test.ts',
  'patient-portal/aiLanguagePrompt.behavior.test.ts',
];
const GROUP_API = [
  'doctor-portal/apiEndpoints.test.ts',
  'doctor-portal/mainApiServer.test.ts',
  'doctor-portal/postgresDataService.test.ts',
  'doctor-portal/storageServices.test.ts',
  'doctor-portal/gcsApiServer.test.ts',
  'patient-portal/api-service.test.ts',
  'patient-portal/services-logic.test.ts',
];
const GROUP_NOTIFICATIONS = [
  'patient-portal/notificationService.test.ts',
  'patient-portal/notificationsRoute.test.ts',
  'patient-portal/notificationWorkflow.test.ts',
  'patient-portal/notificationRowNormalize.test.ts',
  'patient-portal/notificationMarkAllRead.behavior.test.ts',
];
const GROUP_SECURITY = [
  'doctor-portal/owaspMiddleware.test.ts',
  'doctor-portal/sanitizeRequestBody.middleware.test.ts',
  'doctor-portal/authLoginResponse.test.ts',
  'doctor-portal/auditLogService.test.ts',
  'patient-portal/owasp-middleware.test.ts',
  'security/corsAndRateLimiting.test.ts',
  'security/security-validation.test.ts',
];
const GROUP_PATIENT_WORKFLOWS = [
  'patient-portal/dashboardWorkflow.test.ts',
  'patient-portal/dataSyncWorkflow.test.ts',
  'patient-portal/userManagementWorkflow.test.ts',
  'patient-portal/timelinePage.test.ts',
  'patient-portal/settingsPage.test.ts',
  'patient-portal/mapPage.test.ts',
];
const GROUP_DATABASE = [
  'database/appointmentTx.integration.test.ts',
  'config/envSchema.test.ts',
  'database/data-validation.test.ts',
  'database/embeddedPg.test.ts',
  'database/schema-validation.test.ts',
  'database/schemaAndSeed.test.ts',
];
const GROUP_ADMIN = [
  'doctor-portal/scheduleManagement.test.ts',
  'doctor-portal/patientDetailView.test.ts',
  'doctor-portal/clinicalResources.test.ts',
  'doctor-portal/adminDoctorManagement.test.ts',
  'doctor-portal/adminAppointmentManagement.test.ts',
];
const GROUP_CROSS_PORTAL = [
  'cross-portal/postMeetingWorkflow.integration.test.ts',
  'cross-portal/meetingLifecycleFixture.test.ts',
  'cross-portal/emrToPhrDelivery.integration.test.ts',
  'cross-portal/calendarConfirmNotification.test.ts',
  'cross-portal/syncQueue.integration.test.ts',
  'cross-portal/offlineEmrSync.test.ts',
  'cross-portal/workflowContract.test.ts',
  'cross-portal/processPageCoverage.test.ts',
  'cross-portal/fullWorkflowInvariants.test.ts',
  'cross-portal/appointmentWorkflowContract.test.ts',
  'cross-portal/healthRecordsWorkflowContract.test.ts',
  'cross-portal/dataSyncValidation.test.ts',
  'cross-portal/jwtCrossService.test.ts',
  'cross-portal/multiPortalHelpers.test.ts',
  'cross-portal/globalSetupLogic.test.ts',
  'cross-portal/fixtureReliability.test.ts',
  'cross-portal/authStateValidation.test.ts',
  'cross-portal/browserMatrix.test.ts',
  'cross-portal/serviceReadiness.test.ts',
  'cross-portal/combinedWorkflowActions.test.ts',
  'cross-portal/separatedWorkflowFunctions.test.ts',
  'cross-portal/notificationWorkflowContract.test.ts',
  'cross-portal/livingWillContract.test.ts',
  'cross-portal/doctorEnvAudit.test.ts',
  'cross-portal/appointmentUxContract.test.ts',
  'cross-portal/meetingUxContract.test.ts',
  'cross-portal/phrEmrUxContract.test.ts',
  'doctor-portal/emrAiDraft.test.ts',
  'doctor-portal/meetingRoomRoutes.test.ts',
  'doctor-portal/telemedDashboard.test.ts',
  'doctor-portal/clinicalBreadcrumb.test.ts',
  'patient-portal/phrDocuments.test.ts',
  'patient-portal/profileWorkflow.test.ts',
];

// Build include list from TEST_GROUP env var (or run all)
function getIncludePatterns(): string[] {
  const group = process.env.TEST_GROUP;
  if (!group) return ['**/*.test.ts'];

  const map: Record<string, string[]> = {
    auth: GROUP_AUTH,
    appointments: GROUP_APPOINTMENTS,
    clinical: GROUP_CLINICAL,
    content: GROUP_CONTENT,
    meeting: GROUP_MEETING,
    ai: GROUP_AI,
    api: GROUP_API,
    notifications: GROUP_NOTIFICATIONS,
    security: GROUP_SECURITY,
    workflows: GROUP_PATIENT_WORKFLOWS,
    database: GROUP_DATABASE,
    admin: GROUP_ADMIN,
    'cross-portal': GROUP_CROSS_PORTAL,
  };
  return map[group] || ['**/*.test.ts'];
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: getIncludePatterns(),
    exclude: ['**/node_modules/**'],
    testTimeout: 30_000,
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 2,
        maxThreads: 8,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        '../../Isara-doctor-portal/backend/**/*.{ts,js,cjs,mjs}',
        '../../Isara-doctor-portal/frontend/services/**/*.{ts,tsx}',
        '../../Isara-doctor-portal/frontend/utils/**/*.{ts,tsx}',
        '../../Isara-patient-portal/backend/**/*.{ts,js,cjs,mjs}',
        '../../Isara-patient-portal/frontend/services/**/*.{ts,tsx}',
        '../../Izara-jitsi-server/backend/**/*.{ts,js,cjs,mjs}',
      ],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
      all: true,
      // Phase 4 CI gate: fail if coverage regresses below these floors.
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 50,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@doctor': path.resolve(__dirname, '../../Isara-doctor-portal/frontend'),
      '@patient': path.resolve(__dirname, '../../Isara-patient-portal/frontend'),
      '@meeting': path.resolve(__dirname, '../../Izara-jitsi-server/backend'),
    },
  },
});
