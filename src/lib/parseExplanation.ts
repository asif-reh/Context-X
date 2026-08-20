import type { Explanation } from "./types";

function headerPattern(): RegExp {
  return /\*\*\s*(Definition|Explanation|Analogy)\s*\*\*/gi;
}

/**
 * Incrementally parse the model's markdown into the three UI sections.
 * Safe to call on every streamed token — missing sections stay empty.
 */
export function parseExplainMarkdown(raw: string, term: string): Explanation {
  const text = raw.replace(/\r\n/g, "\n");
  const matches = [...text.matchAll(headerPattern())];
  const result: Explanation = {
    term,
    definition: "",
    explanation: "",
    analogy: "",
  };

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (!match || match.index === undefined) continue;
    const heading = match[1]?.toLowerCase();
    const start = match.index + match[0].length;
    const next = matches[index + 1];
    const end = next?.index ?? text.length;
    const body = text.slice(start, end).trim();

    if (heading === "definition") result.definition = body;
    if (heading === "explanation") result.explanation = body;
    if (heading === "analogy") result.analogy = body;
  }

  return result;
}

/**
 * After the stream ends, fill any missing section from paragraph fallback
 * so a slightly off-format reply still lands in the UI.
 */
export function finalizeExplanation(raw: string, term: string): Explanation {
  const parsed = parseExplainMarkdown(raw, term);
  if (parsed.definition && parsed.explanation && parsed.analogy) {
    return parsed;
  }

  const paragraphs = raw
    .split(/\n\s*\n/)
    .map((part) => part.replace(headerPattern(), "").trim())
    .filter(Boolean);

  return {
    term,
    definition: parsed.definition || paragraphs[0] || raw.trim(),
    explanation: parsed.explanation || paragraphs[1] || "",
    analogy: parsed.analogy || paragraphs[2] || "",
  };
}

export function activeStreamingSection(
  data: Explanation,
): keyof Pick<Explanation, "definition" | "explanation" | "analogy"> | null {
  if (data.analogy) return "analogy";
  if (data.explanation) return "explanation";
  if (data.definition) return "definition";
  return null;
}

export function formatExplanation(data: Explanation): string {
  return [
    data.term,
    "",
    "Definition",
    data.definition,
    "",
    "Explanation",
    data.explanation,
    "",
    "Analogy",
    data.analogy,
  ].join("\n");
}

export function hasAnySection(data: Explanation | null): boolean {
  if (!data) return false;
  return Boolean(data.definition || data.explanation || data.analogy);
}
