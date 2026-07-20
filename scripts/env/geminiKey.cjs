/**
 * Shared Gemini API key resolver — placeholder until real key is injected.
 * No key-format / prefix checks (AIza, AQ., etc.) — any non-placeholder value is accepted.
 */
const PLACEHOLDER = 'xxxxx';

function resolveGeminiApiKey(env = process.env) {
  const key = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '';
  const trimmed = String(key || '').trim();
  if (!trimmed || trimmed === PLACEHOLDER) return PLACEHOLDER;
  return trimmed;
}

function isGeminiConfigured(env = process.env) {
  const key = resolveGeminiApiKey(env);
  return Boolean(key && key !== PLACEHOLDER);
}

function resolveGeminiModel(env = process.env) {
  return env.GEMINI_MODEL || env.VITE_GEMINI_MODEL || 'gemini-3.1-flash-lite';
}

module.exports = {
  GEMINI_PLACEHOLDER: PLACEHOLDER,
  resolveGeminiApiKey,
  isGeminiConfigured,
  resolveGeminiModel,
};
