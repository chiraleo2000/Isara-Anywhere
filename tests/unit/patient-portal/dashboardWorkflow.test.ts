// ============================================================================
// Dashboard & Patient Stats Workflow Tests
// Based on: Processes/Pages/Patient-Portal/04_Dashboard_Page.md
//           Processes/Pages/Doctor-Portal/03_Dashboard_Page.md
// Tests: Dashboard stats, quick actions, upcoming appointments, health overview
// ============================================================================

import { describe, it, expect } from 'vitest';

// --- Types ---

interface PatientDashboardStats {
  upcomingAppointments: number;
  totalAppointments: number;
  unreadNotifications: number;
  medicationsActive: number;
  lastVitalSigns?: { date: string; bloodPressure?: string; heartRate?: number };
}

interface DoctorDashboardStats {
  totalPatients: number;
  totalDoctors: number;
  todayAppointments: number;
  pendingApprovals: number;
  totalMeetings: number;
  activeMeetings: number;
}

interface AppointmentSummary {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  type: string;
}

interface QuickAction {
  id: string;
  label: string;
  labelTh: string;
  icon: string;
  route: string;
  roles: string[];
}

// --- Constants ---

const PATIENT_QUICK_ACTIONS: QuickAction[] = [
  { id: 'book', label: 'Book Appointment', labelTh: 'นัดหมายแพทย์', icon: '📅', route: '/book-appointment', roles: ['patient'] },
  { id: 'phr', label: 'Health Records', labelTh: 'บันทึกสุขภาพ', icon: '💊', route: '/phr', roles: ['patient'] },
  { id: 'ai', label: 'AI Health', labelTh: 'AI สุขภาพ', icon: '🤖', route: '/ai-doctor', roles: ['patient'] },
  { id: 'map', label: 'Nearby', labelTh: 'สถานพยาบาล', icon: '🗺️', route: '/map', roles: ['patient'] },
  { id: 'library', label: 'Health Library', labelTh: 'คลังความรู้', icon: '📚', route: '/health-library', roles: ['patient'] },
  { id: 'timeline', label: 'Timeline', labelTh: 'ประวัติการรักษา', icon: '📋', route: '/timeline', roles: ['patient'] },
];

const DOCTOR_QUICK_ACTIONS: QuickAction[] = [
  { id: 'schedule', label: 'Schedule', labelTh: 'ตารางนัดหมาย', icon: '📅', route: '/schedule', roles: ['doctor', 'admin'] },
  { id: 'patients', label: 'Patients', labelTh: 'ผู้ป่วย', icon: '👥', route: '/patients', roles: ['doctor', 'admin'] },
  { id: 'meetings', label: 'Meetings', labelTh: 'การประชุม', icon: '📹', route: '/meetings', roles: ['doctor', 'admin'] },
  { id: 'content', label: 'Content', labelTh: 'เนื้อหา', icon: '📚', route: '/medical-content', roles: ['doctor', 'admin'] },
  { id: 'consultants', label: 'Consultants', labelTh: 'ที่ปรึกษา', icon: '👨‍⚕️', route: '/consultants', roles: ['doctor', 'admin'] },
];

const PATIENT_ROUTES = [
  '/', '/appointments', '/book-appointment', '/phr', '/ai-doctor',
  '/health-library', '/map', '/pdpa', '/living-will', '/profile',
  '/settings', '/timeline',
];

const DOCTOR_ROUTES = [
  '/', '/schedule', '/patients', '/meetings', '/consultants',
  '/medical-content', '/clinical-resources', '/profile',
  '/admin/appointments', '/admin/doctors', '/doctors',
];

// --- Helper Functions ---

function getUpcomingAppointments(appointments: AppointmentSummary[], limit = 3): AppointmentSummary[] {
  const now = new Date();
  return appointments
    .filter(a => a.status === 'confirmed' && new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);
}

function calculateCompletionRate(appointments: AppointmentSummary[]): number {
  if (appointments.length === 0) return 0;
  const completed = appointments.filter(a => a.status === 'completed').length;
  return Math.round((completed / appointments.length) * 100);
}

function getQuickActionsForRole(role: string, portal: 'patient' | 'doctor'): QuickAction[] {
  const actions = portal === 'patient' ? PATIENT_QUICK_ACTIONS : DOCTOR_QUICK_ACTIONS;
  return actions.filter(a => a.roles.includes(role));
}

function formatGreeting(name: string, lang: 'th' | 'en' = 'th'): string {
  return lang === 'th' ? `สวัสดี, ${name} 👋` : `Hello, ${name} 👋`;
}

function getRoutesForPortal(portal: 'patient' | 'doctor'): string[] {
  return portal === 'patient' ? PATIENT_ROUTES : DOCTOR_ROUTES;
}

function isValidRoute(portal: 'patient' | 'doctor', route: string): boolean {
  return getRoutesForPortal(portal).includes(route);
}

function validateDashboardStats(stats: Partial<PatientDashboardStats>): boolean {
  if (stats.upcomingAppointments !== undefined && stats.upcomingAppointments < 0) return false;
  if (stats.totalAppointments !== undefined && stats.totalAppointments < 0) return false;
  if (stats.unreadNotifications !== undefined && stats.unreadNotifications < 0) return false;
  return true;
}

// --- Tests ---

describe('Dashboard & Stats Workflow (Process: 04_Dashboard_Page.md)', () => {

  describe('A — Patient Quick Actions', () => {
    it('A01 — 6 patient quick actions', () => expect(PATIENT_QUICK_ACTIONS).toHaveLength(6));
    it('A02 — all have Thai labels', () => {
      for (const action of PATIENT_QUICK_ACTIONS) {
        expect(action.labelTh).toBeTruthy();
      }
    });
    it('A03 — all routes start with /', () => {
      for (const action of PATIENT_QUICK_ACTIONS) {
        expect(action.route.startsWith('/')).toBe(true);
      }
    });
    it('A04 — booking route exists', () => {
      const book = PATIENT_QUICK_ACTIONS.find(a => a.id === 'book');
      expect(book?.route).toBe('/book-appointment');
    });
    it('A05 — AI health route exists', () => {
      const ai = PATIENT_QUICK_ACTIONS.find(a => a.id === 'ai');
      expect(ai?.route).toBe('/ai-doctor');
    });
  });

  describe('B — Doctor Quick Actions', () => {
    it('B01 — 5 doctor quick actions', () => expect(DOCTOR_QUICK_ACTIONS).toHaveLength(5));
    it('B02 — admin can access all doctor actions', () => {
      const actions = getQuickActionsForRole('admin', 'doctor');
      expect(actions).toHaveLength(5);
    });
    it('B03 — doctor can access all doctor actions', () => {
      const actions = getQuickActionsForRole('doctor', 'doctor');
      expect(actions).toHaveLength(5);
    });
  });

  describe('C — Upcoming Appointments', () => {
    const appointments: AppointmentSummary[] = [
      { id: '1', patientName: 'P1', doctorName: 'D1', date: '2027-06-01', time: '09:00', status: 'confirmed', type: 'general' },
      { id: '2', patientName: 'P2', doctorName: 'D1', date: '2027-06-02', time: '10:00', status: 'confirmed', type: 'follow-up' },
      { id: '3', patientName: 'P3', doctorName: 'D1', date: '2027-06-03', time: '11:00', status: 'cancelled', type: 'general' },
      { id: '4', patientName: 'P4', doctorName: 'D1', date: '2027-06-04', time: '14:00', status: 'confirmed', type: 'specialist' },
      { id: '5', patientName: 'P5', doctorName: 'D1', date: '2024-01-01', time: '09:00', status: 'confirmed', type: 'general' },
    ];

    it('C01 — returns only confirmed future appointments', () => {
      const upcoming = getUpcomingAppointments(appointments);
      expect(upcoming.every(a => a.status === 'confirmed')).toBe(true);
    });
    it('C02 — limit to 3 by default', () => {
      const upcoming = getUpcomingAppointments(appointments);
      expect(upcoming.length).toBeLessThanOrEqual(3);
    });
    it('C03 — sorted by date ascending', () => {
      const upcoming = getUpcomingAppointments(appointments, 10);
      if (upcoming.length > 1) {
        expect(new Date(upcoming[0].date).getTime()).toBeLessThanOrEqual(new Date(upcoming[1].date).getTime());
      }
    });
    it('C04 — excludes past appointments', () => {
      const upcoming = getUpcomingAppointments(appointments, 10);
      expect(upcoming.find(a => a.id === '5')).toBeUndefined(); // past date
    });
    it('C05 — excludes cancelled', () => {
      const upcoming = getUpcomingAppointments(appointments, 10);
      expect(upcoming.find(a => a.id === '3')).toBeUndefined();
    });
  });

  describe('D — Completion Rate', () => {
    it('D01 — all completed = 100%', () => {
      const apts: AppointmentSummary[] = [
        { id: '1', patientName: 'P', doctorName: 'D', date: '2026-01-01', time: '09:00', status: 'completed', type: 'g' },
      ];
      expect(calculateCompletionRate(apts)).toBe(100);
    });
    it('D02 — none completed = 0%', () => {
      const apts: AppointmentSummary[] = [
        { id: '1', patientName: 'P', doctorName: 'D', date: '2026-01-01', time: '09:00', status: 'pending', type: 'g' },
      ];
      expect(calculateCompletionRate(apts)).toBe(0);
    });
    it('D03 — half completed = 50%', () => {
      const apts: AppointmentSummary[] = [
        { id: '1', patientName: 'P', doctorName: 'D', date: '2026-01-01', time: '09:00', status: 'completed', type: 'g' },
        { id: '2', patientName: 'P', doctorName: 'D', date: '2026-01-02', time: '10:00', status: 'pending', type: 'g' },
      ];
      expect(calculateCompletionRate(apts)).toBe(50);
    });
    it('D04 — empty list = 0%', () => expect(calculateCompletionRate([])).toBe(0));
  });

  describe('E — Greeting Format', () => {
    it('E01 — Thai greeting', () => expect(formatGreeting('สมชาย', 'th')).toBe('สวัสดี, สมชาย 👋'));
    it('E02 — English greeting', () => expect(formatGreeting('John', 'en')).toBe('Hello, John 👋'));
    it('E03 — defaults to Thai', () => expect(formatGreeting('Test')).toContain('สวัสดี'));
  });

  describe('F — Route Coverage', () => {
    it('F01 — patient portal has 12 routes', () => expect(PATIENT_ROUTES).toHaveLength(12));
    it('F02 — doctor portal has 11 routes', () => expect(DOCTOR_ROUTES).toHaveLength(11));
    it('F03 — book-appointment is valid patient route', () => expect(isValidRoute('patient', '/book-appointment')).toBe(true));
    it('F04 — admin/appointments is valid doctor route', () => expect(isValidRoute('doctor', '/admin/appointments')).toBe(true));
    it('F05 — admin route not on patient portal', () => expect(isValidRoute('patient', '/admin/appointments')).toBe(false));
    it('F06 — all routes start with /', () => {
      for (const route of [...PATIENT_ROUTES, ...DOCTOR_ROUTES]) {
        expect(route.startsWith('/')).toBe(true);
      }
    });
  });

  describe('G — Stats Validation', () => {
    it('G01 — valid stats pass', () => {
      expect(validateDashboardStats({ upcomingAppointments: 5, totalAppointments: 20, unreadNotifications: 3 })).toBe(true);
    });
    it('G02 — negative appointments fails', () => {
      expect(validateDashboardStats({ upcomingAppointments: -1 })).toBe(false);
    });
    it('G03 — zero values are valid', () => {
      expect(validateDashboardStats({ upcomingAppointments: 0, totalAppointments: 0, unreadNotifications: 0 })).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // H — CONTINUOUS WORKFLOW: Patient Login → Dashboard Load → Actions
  // ═══════════════════════════════════════════════════════════════════════════
  describe('H — Patient Dashboard Continuous Workflow', () => {
    const appointments: AppointmentSummary[] = [
      { id: 'APT-001', patientName: 'สมชาย', doctorName: 'Dr. วิชัย', date: '2026-06-15', time: '09:00', status: 'confirmed', type: 'telemedicine' },
      { id: 'APT-002', patientName: 'สมชาย', doctorName: 'Dr. วิชัย', date: '2026-06-10', time: '14:00', status: 'completed', type: 'telemedicine' },
      { id: 'APT-003', patientName: 'สมชาย', doctorName: 'Dr. สมศรี', date: '2026-06-20', time: '10:30', status: 'confirmed', type: 'telemedicine' },
      { id: 'APT-004', patientName: 'สมชาย', doctorName: 'Dr. วิชัย', date: '2026-05-01', time: '11:00', status: 'completed', type: 'telemedicine' },
    ];
    let upcoming: AppointmentSummary[] = [];
    let completionRate = 0;
    let quickActions: QuickAction[] = [];
    let greeting = '';

    it('H01 — Step 1: Generate Thai greeting', () => {
      greeting = formatGreeting('สมชาย', 'th');
      expect(greeting).toContain('สมชาย');
    });

    it('H02 — Step 2: Get upcoming appointments', () => {
      upcoming = getUpcomingAppointments(appointments);
      expect(upcoming.length).toBeGreaterThan(0);
      for (const a of upcoming) expect(a.status).toBe('confirmed');
    });

    it('H03 — Step 3: Calculate completion rate', () => {
      completionRate = calculateCompletionRate(appointments);
      expect(completionRate).toBeGreaterThan(0);
      expect(completionRate).toBeLessThanOrEqual(100);
    });

    it('H04 — Step 4: Get patient quick actions', () => {
      quickActions = getQuickActionsForRole('patient', 'patient');
      expect(quickActions.length).toBeGreaterThan(0);
    });

    it('H05 — Step 5: Quick actions have Thai labels', () => {
      for (const qa of quickActions) {
        expect(qa.labelTh).toBeTruthy();
      }
    });

    it('H06 — Step 6: Validate stats for display', () => {
      const stats: Partial<PatientDashboardStats> = {
        upcomingAppointments: upcoming.length,
        totalAppointments: appointments.length,
        unreadNotifications: 2,
      };
      expect(validateDashboardStats(stats)).toBe(true);
    });

    it('H07 — Step 7: Routes valid for patient portal', () => {
      const routes = getRoutesForPortal('patient');
      for (const qa of quickActions) {
        expect(isValidRoute('patient', qa.route)).toBe(true);
      }
      expect(routes.length).toBeGreaterThan(0);
    });

    it('H08 — Final: Dashboard fully loaded', () => {
      expect(greeting).toBeTruthy();
      expect(upcoming.length).toBeGreaterThan(0);
      expect(completionRate).toBeGreaterThan(0);
      expect(quickActions.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // I — CONTINUOUS WORKFLOW: Doctor Dashboard → Queue Overview → Actions
  // ═══════════════════════════════════════════════════════════════════════════
  describe('I — Doctor Dashboard Continuous Workflow', () => {
    let greeting = '';
    let quickActions: QuickAction[] = [];

    it('I01 — Step 1: Generate doctor greeting', () => {
      greeting = formatGreeting('Dr. วิชัย', 'th');
      expect(greeting).toContain('วิชัย');
    });

    it('I02 — Step 2: Get doctor quick actions', () => {
      quickActions = getQuickActionsForRole('doctor', 'doctor');
      expect(quickActions.length).toBeGreaterThan(0);
    });

    it('I03 — Step 3: Doctor actions have routes', () => {
      for (const qa of quickActions) {
        expect(isValidRoute('doctor', qa.route)).toBe(true);
      }
    });

    it('I04 — Step 4: Doctor routes separate from patient', () => {
      const doctorRoutes = getRoutesForPortal('doctor');
      const patientRoutes = getRoutesForPortal('patient');
      expect(doctorRoutes).not.toEqual(patientRoutes);
    });

    it('I05 — Final: Doctor dashboard ready', () => {
      expect(greeting).toBeTruthy();
      expect(quickActions.length).toBeGreaterThan(0);
    });
  });
});
