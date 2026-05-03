/** Conservative PII redaction before logging or external LLM prompts. */
export function redactForPrompt(text: string): string {
  return text
    .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[redacted-email]")
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[redacted-phone]");
}

/** U.S. SSN pattern (###-##-####). */
function redactSsn(text: string): string {
  return text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted-ssn]");
}

/**
 * Apply all conservative redactions for persisted RAG blobs and embeddings.
 * Runs prompt redaction first, then additional patterns suited for storage.
 */
export function redactForRagIngest(text: string): string {
  return redactSsn(redactForPrompt(text));
}
