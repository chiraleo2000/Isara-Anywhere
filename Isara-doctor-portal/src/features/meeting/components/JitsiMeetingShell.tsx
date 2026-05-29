import React, { type ReactNode } from 'react';

export interface JitsiMeetingShellProps {
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}

/** Responsive wrapper for Jitsi iframe + meeting controls (overflow-safe on mobile). */
export const JitsiMeetingShell: React.FC<JitsiMeetingShellProps> = ({
  children,
  className = '',
  'data-testid': testId = 'jitsi-meeting-shell',
}) => (
  <div
    data-testid={testId}
    className={`w-full max-w-full overflow-x-hidden min-h-[100dvh] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${className}`}
  >
    {children}
  </div>
);

export default JitsiMeetingShell;
