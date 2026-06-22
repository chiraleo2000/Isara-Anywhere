/**
 * Runtime environment validation for Izara services.
 */
const { z } = require('zod');
const { GEMINI_PLACEHOLDER } = require('./geminiKey.cjs');

const baseServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  RECORDING_ENCRYPTION_KEY: z.string().min(32).optional(),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required (use xxxxx placeholder for dev)'),
  DATABASE_URL: z.string().url().optional(),
  JITSI_DOMAIN: z.string().optional(),
  PORT: z.string().optional(),
});

const meetingServerEnvSchema = baseServerEnvSchema.extend({
  JIBRI_WEBHOOK_SECRET: z.string().min(8).optional(),
});

function formatZodError(error) {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
}

function validateServerEnv(env = process.env, { service = 'server' } = {}) {
  const schema = service === 'meeting' ? meetingServerEnvSchema : baseServerEnvSchema;
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Environment validation failed: ${formatZodError(parsed.error)}`);
  }
  return parsed.data;
}

function validateServerEnvOrExit(env = process.env, options = {}) {
  try {
    return validateServerEnv(env, options);
  } catch (err) {
    console.error(`[ENV] ${err.message}`);
    if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
      process.exit(1);
    }
    throw err;
  }
}

module.exports = {
  GEMINI_PLACEHOLDER,
  baseServerEnvSchema,
  meetingServerEnvSchema,
  validateServerEnv,
  validateServerEnvOrExit,
};
