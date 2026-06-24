/** Serialize Supabase PostgREST errors (plain objects, not Error instances). */
export function formatSupabaseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [
      record.code != null ? String(record.code) : null,
      record.message != null ? String(record.message) : null,
      record.details != null ? String(record.details) : null,
      record.hint != null ? String(record.hint) : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}
