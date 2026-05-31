export function projectSessionSnapshot(session) {
  if (!session) return null;
  // Minimal projection for exported session snapshots
  return Object.freeze({
    id: session.id || null,
    mode: session.mode || null,
    startTs: session.startTs || null,
    endTs: session.endTs || null,
    eventsCount: Array.isArray(session.events) ? session.events.length : 0
  });
}
