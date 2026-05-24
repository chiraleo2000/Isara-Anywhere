/**
 * EMR autosave debounce — Processes/Pages/Doctor-Portal/08_EMR_Editor.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const AUTOSAVE_MS = 30_000;

function createAutosaveScheduler(onSave: () => void, intervalMs = AUTOSAVE_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        onSave();
      }, intervalMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

describe('EMR autosave debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces saves within 30s window', () => {
    const save = vi.fn();
    const scheduler = createAutosaveScheduler(save);
    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(AUTOSAVE_MS);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('cancel prevents flush', () => {
    const save = vi.fn();
    const scheduler = createAutosaveScheduler(save);
    scheduler.schedule();
    scheduler.cancel();
    vi.advanceTimersByTime(AUTOSAVE_MS + 1000);
    expect(save).not.toHaveBeenCalled();
  });
});
