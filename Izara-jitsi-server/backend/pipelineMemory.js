/**
 * Lightweight RSS logging for post-meeting pipeline phases (Cloud Run diagnostics).
 */
export function logPipelineMemory(phase, meetingId) {
  const mu = process.memoryUsage();
  console.log(
    `[PostMeeting] mem phase=${phase} meeting=${meetingId} rss=${mu.rss} heap=${mu.heapUsed} external=${mu.external}`,
  );
}
