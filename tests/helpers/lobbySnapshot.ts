/** Pure lobby snapshot helpers (no Playwright dependency — safe for Vitest). */

export type LobbyParticipantRow = {
  participantId?: string;
  status?: string;
  role?: string;
};

export function parseLobbySnapshot(data: {
  participants?: LobbyParticipantRow[];
  lobby?: LobbyParticipantRow[];
}): { waiting: LobbyParticipantRow[]; all: LobbyParticipantRow[] } {
  const waiting = data.participants || [];
  const all = data.lobby || waiting;
  return { waiting, all };
}

export function participantIdByRole(
  snap: { waiting: LobbyParticipantRow[]; all: LobbyParticipantRow[] },
  role: string,
): string | undefined {
  return (
    snap.waiting.find((p) => p.role === role)?.participantId ||
    snap.all.find((p) => p.role === role)?.participantId
  );
}
