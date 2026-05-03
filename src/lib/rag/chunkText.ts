/** Max characters per chunk; overlap keeps context across boundaries. */
export function chunkText(
  text: string,
  opts: { maxChars?: number; overlap?: number } = {},
): string[] {
  const maxChars = opts.maxChars ?? 1500;
  const overlap = opts.overlap ?? 200;
  const t = text.trim();
  if (!t) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < t.length) {
    const end = Math.min(start + maxChars, t.length);
    chunks.push(t.slice(start, end).trim());
    if (end >= t.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter((c) => c.length > 0);
}

/** Escape `%` and `_` for SQL ILIKE patterns. */
export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
