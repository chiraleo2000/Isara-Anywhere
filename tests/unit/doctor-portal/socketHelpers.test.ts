/**
 * Doctor backend: socketEvents.cjs + socketRedisAdapter.cjs (no real Redis).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const doctorBackend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../issara-doctor/backend',
);

describe('socketEvents', () => {
  it('exports stable SOCKET_EVENTS names', () => {
    const { SOCKET_EVENTS } = require(path.join(doctorBackend, 'socketEvents.cjs')) as {
      SOCKET_EVENTS: Record<string, string>;
    };
    expect(SOCKET_EVENTS.APPOINTMENT_CREATED).toBe('appointment:created');
    expect(SOCKET_EVENTS.QUEUE_UPDATED).toBe('queue:updated');
    expect(SOCKET_EVENTS.EMR_UPDATED).toBe('emr:updated');
    expect(SOCKET_EVENTS.DATA_CHANGED).toBe('data:changed');
    expect(SOCKET_EVENTS.NOTIFICATION_CREATED).toBe('notification:created');
    expect(Object.values(SOCKET_EVENTS).every((v) => typeof v === 'string' && v.includes(':'))).toBe(
      true,
    );
  });
});

describe('socketRedisAdapter', () => {
  const adapterPath = path.join(doctorBackend, 'socketRedisAdapter.cjs');
  const prevRedis = process.env.REDIS_URL;
  const prevSocketRedis = process.env.SOCKETIO_REDIS_URL;
  let originalLoad: typeof Module._load;

  beforeEach(() => {
    delete process.env.REDIS_URL;
    delete process.env.SOCKETIO_REDIS_URL;
    delete require.cache[adapterPath];
    originalLoad = Module._load;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    Module._load = originalLoad;
    if (prevRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = prevRedis;
    if (prevSocketRedis === undefined) delete process.env.SOCKETIO_REDIS_URL;
    else process.env.SOCKETIO_REDIS_URL = prevSocketRedis;
    delete require.cache[adapterPath];
    vi.restoreAllMocks();
  });

  it('skips adapter when REDIS_URL is unset', async () => {
    const { attachRedisAdapter } = require(adapterPath) as {
      attachRedisAdapter: (io: { adapter: (a: unknown) => void }) => Promise<boolean>;
    };
    const io = { adapter: vi.fn() };
    await expect(attachRedisAdapter(io)).resolves.toBe(false);
    expect(io.adapter).not.toHaveBeenCalled();
  });

  it('returns false when Redis packages fail to load', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    Module._load = function (request: string, parent: NodeModule, isMain: boolean) {
      if (request === '@socket.io/redis-adapter' || request === 'redis') {
        throw new Error('mock missing redis deps');
      }
      return originalLoad(request, parent, isMain);
    } as typeof Module._load;

    const { attachRedisAdapter } = require(adapterPath) as {
      attachRedisAdapter: (io: { adapter: (a: unknown) => void }) => Promise<boolean>;
    };
    await expect(attachRedisAdapter({ adapter: vi.fn() })).resolves.toBe(false);
  });

  it('attaches adapter when Redis clients connect (mocked)', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    const connect = vi.fn(async () => undefined);
    const duplicate = vi.fn(() => ({ connect }));
    const pubClient = { connect, duplicate };
    const createClient = vi.fn(() => pubClient);
    const createAdapter = vi.fn(() => ({ name: 'mock-adapter' }));

    Module._load = function (request: string, parent: NodeModule, isMain: boolean) {
      if (request === '@socket.io/redis-adapter') return { createAdapter };
      if (request === 'redis') return { createClient };
      return originalLoad(request, parent, isMain);
    } as typeof Module._load;

    const { attachRedisAdapter } = require(adapterPath) as {
      attachRedisAdapter: (io: { adapter: (a: unknown) => void }) => Promise<boolean>;
    };
    const io = { adapter: vi.fn() };
    await expect(attachRedisAdapter(io)).resolves.toBe(true);
    expect(createClient).toHaveBeenCalledWith({ url: 'redis://127.0.0.1:6379' });
    expect(io.adapter).toHaveBeenCalledWith({ name: 'mock-adapter' });
  });
});
