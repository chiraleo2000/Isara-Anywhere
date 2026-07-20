import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const notificationsPagePath = path.resolve(
  __dirname,
  '../../../issara-patient/frontend/pages/NotificationsPage.tsx',
);
const livingWillPath = path.resolve(
  __dirname,
  '../../../issara-patient/frontend/pages/pdpa/LivingWillPage.tsx',
);
describe('dark mode surfaces (G2)', () => {
  it('NotificationsPage branches title and rows on theme === dark', () => {
    const source = fs.readFileSync(notificationsPagePath, 'utf8');
    expect(source).toContain("const isDark = theme === 'dark'");
    expect(source).toMatch(/isDark \? 'text-white'/);
    expect(source).toContain('notificationRowClass');
  });

  it('notificationRowClass provides dark unread highlight', () => {
    const hookPath = path.resolve(
      __dirname,
      '../../../issara-patient/frontend/hooks/useNotificationsPageHelpers.ts',
    );
    const source = fs.readFileSync(hookPath, 'utf8');
    expect(source).toMatch(/isDark.*bg-emerald-950/);
  });

  it('LivingWillPage uses isDark branches for header and panels', () => {
    const lw = fs.readFileSync(livingWillPath, 'utf8');
    expect(lw).toContain('isDark');
    expect(lw).toMatch(/isDark \? 'text-white'/);
    expect(lw).not.toMatch(/isDark \? 'bg-white'/);
  });

  it('NotificationsPage main container avoids unconditional bg-white in dark mode', () => {
    const source = fs.readFileSync(notificationsPagePath, 'utf8');
    expect(source).toMatch(/isDark.*bg-gray-900|isDark.*bg-slate-900/);
  });
});
