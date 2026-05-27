import React, { type ReactNode } from 'react';

export interface JitsiMeetingShellProps {
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export const JitsiMeetingShell: React.FC<JitsiMeetingShellProps> = ({
  children,
  className = '',
  'data-testid': testId = 'jitsi-meeting-shell',
}) => (
  <div
    data-testid={testId}
    className={`w-full max-w-full overflow-x-hidden min-h-0 flex flex-col ${className}`}
  >
    {children}
  </div>
);

export default JitsiMeetingShell;
