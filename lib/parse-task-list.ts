/** Max tasks accepted from a single pasted list. */
export const MAX_PASTED_TASKS = 100;

/** Leading markers: 1. 1) 1] 1: 1 - or bullets - * • */
const LEADING_MARKER =
  /^\s*(?:\d+[.)\]:]\s*|\d+\s+-\s+|[-*•]\s+)/;

/**
 * Parse a pasted block of text into task titles.
 * Strips numbered/bullet prefixes; keeps plain lines as-is.
 */
export function parseTaskList(text: string): string[] {
  const titles: string[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const stripped = raw.replace(LEADING_MARKER, "").trim();
    if (!stripped) continue;
    titles.push(stripped);
  }

  return titles;
}
