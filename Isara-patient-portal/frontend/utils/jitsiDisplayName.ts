/**
 * Resolve display name for Jitsi from Izara auth profile (never prompt manually when set).
 */
export type IzaraUserLike = {
  name?: string;
  nameThai?: string;
  name_thai?: string;
  displayName?: string;
  display_name?: string;
  email?: string;
  role?: string;
} | null | undefined;

export function getIzaraDisplayName(user: IzaraUserLike, fallback = 'Participant'): string {
  if (!user) return fallback;
  const name = (
    user.displayName ||
    user.display_name ||
    user.name ||
    user.nameThai ||
    user.name_thai ||
    ''
  ).trim();
  if (name) return name;
  if (user.email) {
    const local = user.email.split('@')[0]?.trim();
    if (local) return local;
  }
  return fallback;
}

export function jitsiConfigWithIzaraName(_displayName: string, extra: Record<string, unknown> = {}) {
  return {
    requireDisplayName: false,
    prejoinPageEnabled: false,
    enableLobby: false,
    lobbyModeEnabled: false,
    enableLobbyChat: false,
    ...extra,
  };
}
