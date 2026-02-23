/**
 * OmnichannelMonitorPage
 *
 * Page wrapper for the OmnichannelMonitor component.
 * Enforces RBAC: only 'doctor', 'nurse', or 'admin' roles may access.
 *
 * Route: /omnichannel-monitor
 */

import React from 'react';
import OmnichannelMonitor from '../components/OmnichannelMonitor';

// ─── Auth context (reuse existing pattern from other portal pages) ────────────
// We read the user from localStorage/sessionStorage where the auth server
// stores it after login — consistent with the existing portal pattern.

function getCurrentUser(): { role: string; name: string } | null {
  try {
    const raw = localStorage.getItem('izara_user') || sessionStorage.getItem('izara_user');
    if (!raw) return null;
    return JSON.parse(raw) as { role: string; name: string };
  } catch {
    return null;
  }
}

const ALLOWED_ROLES = ['doctor', 'nurse', 'admin'];

export default function OmnichannelMonitorPage() {
  const user = getCurrentUser();

  // ── Access denied ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-500 mb-4">Please log in to access the Omnichannel Monitor.</p>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">
            Your role (<strong>{user.role}</strong>) does not have permission to view this page.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Required roles: {ALLOWED_ROLES.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  const safeRole = ALLOWED_ROLES.includes(user.role)
    ? (user.role as 'doctor' | 'nurse' | 'admin')
    : 'nurse';

  // ── Authorised view ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <nav className="text-sm text-gray-500">
          <a href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</a>
          <span className="mx-2">›</span>
          <span className="text-gray-900 font-medium">Omnichannel Monitor</span>
        </nav>
      </div>

      {/* Main content — full remaining height */}
      <div className="flex-1 overflow-hidden">
        <OmnichannelMonitor
          userRole={safeRole}
          userName={user.name}
        />
      </div>
    </div>
  );
}
