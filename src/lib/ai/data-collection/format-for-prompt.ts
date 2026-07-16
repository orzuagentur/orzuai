import { COLLECTION_NICHE_LABELS } from "./presets";
import type { CollectionGapResult } from "./types";

export function formatCollectionGapsForPrompt(gaps: CollectionGapResult): string {
  const nicheLabel = COLLECTION_NICHE_LABELS[gaps.niche];
  const knownLines =
    Object.keys(gaps.known).length === 0
      ? "- (none yet)"
      : Object.entries(gaps.known)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join("\n");

  const missingRequired =
    gaps.missingRequired.length === 0
      ? "- (all required fields collected)"
      : gaps.missingRequired
          .map(
            (f) =>
              `- ${f.key} (${f.label}, ${f.type}${f.required ? ", required" : ""})`,
          )
          .join("\n");

  const missingOptional =
    gaps.missingOptional.length === 0
      ? "- (none)"
      : gaps.missingOptional
          .slice(0, 8)
          .map((f) => `- ${f.key} (${f.label}, optional)`)
          .join("\n");

  return [
    `DATA COLLECTION (${nicheLabel}) — server truth, do not re-ask known values.`,
    `Required complete: ${gaps.requiredComplete ? "yes" : "no"} (${Math.round(gaps.completionRatio * 100)}%).`,
    "Already known:",
    knownLines,
    "Still missing (required) — ask only these, one at a time:",
    missingRequired,
    "Optional (ask only if natural):",
    missingOptional,
    "When the customer provides a value, include it in collectedAnswers / update_collected_fields.",
    "Do not invent values. Prefer CRM tools only after required fields are complete (unless customer explicitly asks to book/buy now).",
  ].join("\n");
}
