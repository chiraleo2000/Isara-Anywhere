import type { BrowserContext } from '@playwright/test';

/** Local headed E2E: stub Jitsi when meet.jit.si is slow/unreachable under webdriver. */
export function jitsiE2eStubInstaller(): void {
  type HandlerMap = Record<string, Array<(...args: unknown[]) => void>>;
  type StubWindow = {
    __izaraJitsiE2eStubInstalled?: boolean;
    __izaraJitsiMounts?: Array<{ domain: string; options: Record<string, unknown> }>;
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => {
      on: (event: string, fn: (...args: unknown[]) => void) => unknown;
      dispose: () => void;
      executeCommand: () => void;
    };
  };

  const w = globalThis as unknown as StubWindow;
  if (w.__izaraJitsiE2eStubInstalled) return;
  w.__izaraJitsiE2eStubInstalled = true;
  w.__izaraJitsiMounts ??= [];

  class FakeJitsiMeetExternalAPI {
    private handlers: HandlerMap = {};

    constructor(domain: string, options: Record<string, unknown>) {
      const clone = { ...options };
      delete clone.parentNode;
      w.__izaraJitsiMounts!.push({ domain, options: clone });

      const parent = options.parentNode as HTMLElement | undefined;
      if (parent) {
        const iframe = document.createElement('iframe');
        iframe.title = 'Jitsi E2E stub';
        iframe.setAttribute('allow', 'camera *; microphone *; display-capture *; autoplay *');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = '0';
        parent.appendChild(iframe);
      }

      globalThis.setTimeout(() => {
        for (const fn of this.handlers.videoConferenceJoined || []) fn({});
      }, 50);
    }

    on(event: string, fn: (...args: unknown[]) => void) {
      this.handlers[event] = this.handlers[event] || [];
      this.handlers[event].push(fn);
      return this;
    }

    dispose() {}

    executeCommand() {}
  }

  w.JitsiMeetExternalAPI = FakeJitsiMeetExternalAPI;
}

export function shouldUseJitsiE2eStub(): boolean {
  if (process.env.TEST_ENV === 'cloud') return false;
  if (process.env.PW_E2E_JITSI_STUB === '0') return false;
  if (process.env.PW_E2E_JITSI_STUB === '1') return true;
  return process.env.PW_HEADED === '1' || process.env.PW_HEADED === 'true';
}

export async function installJitsiE2eStubForContext(ctx: BrowserContext): Promise<void> {
  if (!shouldUseJitsiE2eStub()) return;
  await ctx.addInitScript(jitsiE2eStubInstaller);
}
