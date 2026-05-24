/** Normalize JWT payload to a single actor id for doctor-scoped routes. */
export function resolveActorUserId(user) {
  return user?.id || user?.userId || user?.sub || null;
}
