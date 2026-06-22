/**
 * Jibri webhook request validation — shared by HTTP handler and tests.
 */
export function validateJibriWebhookRequest(body, { expectedSecret, providedSecret } = {}) {
  if (expectedSecret && providedSecret !== expectedSecret) {
    return { ok: false, status: 401, error: 'Invalid webhook secret' };
  }
  const meetingId = body?.meetingId;
  const hasPayload = Boolean(body?.localFilePath || body?.videoBase64);
  if (!meetingId || !hasPayload) {
    return {
      ok: false,
      status: 400,
      error: 'meetingId and (localFilePath or videoBase64) are required',
    };
  }
  return { ok: true, status: 200 };
}
