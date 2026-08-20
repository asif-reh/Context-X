import {
  MAX_CONTEXT_CHARS,
  MAX_QUESTION_CHARS,
  MAX_TERM_CHARS,
  MAX_TITLE_CHARS,
  MAX_URL_CHARS,
} from "../src/lib/limits";
import { MAX_FOLLOW_UPS } from "../src/lib/types";

export interface ExplainBody {
  term: string;
  context: string;
  pageTitle: string;
  pageUrl: string;
}

export interface FollowUpBody extends ExplainBody {
  question: string;
  prior: {
    definition: string;
    explanation: string;
    analogy: string;
  };
  history: Array<{ question: string; answer: string }>;
}

export function isInstallId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function parseExplainBody(raw: unknown): ExplainBody | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const term = clip(body.term, MAX_TERM_CHARS);
  if (term.length < 1) return null;
  return {
    term,
    context: clip(body.context, MAX_CONTEXT_CHARS),
    pageTitle: clip(body.pageTitle, MAX_TITLE_CHARS),
    pageUrl: clip(body.pageUrl, MAX_URL_CHARS),
  };
}

export function parseFollowUpBody(raw: unknown): FollowUpBody | null {
  const base = parseExplainBody(raw);
  if (!base || typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const question = clip(body.question, MAX_QUESTION_CHARS);
  if (question.length < 1) return null;

  const priorRaw = body.prior;
  if (typeof priorRaw !== "object" || priorRaw === null) return null;
  const prior = priorRaw as Record<string, unknown>;

  const historyRaw = body.history;
  const history: Array<{ question: string; answer: string }> = [];
  if (Array.isArray(historyRaw)) {
    for (const turn of historyRaw.slice(-MAX_FOLLOW_UPS)) {
      if (typeof turn !== "object" || turn === null) continue;
      const row = turn as Record<string, unknown>;
      const q = clip(row.question, MAX_QUESTION_CHARS);
      const a = clip(row.answer, 2_000);
      if (q && a) history.push({ question: q, answer: a });
    }
  }

  return {
    ...base,
    question,
    prior: {
      definition: clip(prior.definition, 800),
      explanation: clip(prior.explanation, 2_000),
      analogy: clip(prior.analogy, 800),
    },
    history,
  };
}
