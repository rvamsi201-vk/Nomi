export function dmSlug(userIdA: string, userIdB: string) {
  return ["dm", ...[userIdA, userIdB].sort()].join("-");
}
