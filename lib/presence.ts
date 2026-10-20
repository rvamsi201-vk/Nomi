export const PRESENCE_WINDOW_MS = 45_000;

export function isUserOnline(lastSeenAt: Date | string | null | undefined) {
  if (!lastSeenAt) return false;
  const seen = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
  return Date.now() - seen.getTime() < PRESENCE_WINDOW_MS;
}
