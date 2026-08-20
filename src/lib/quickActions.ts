export type QuickActionId = "simpler" | "example" | "matter";

export interface QuickAction {
  id: QuickActionId;
  label: string;
  prompt: string;
}

const SIMPLER: QuickAction = {
  id: "simpler",
  label: "Explain simpler",
  prompt:
    "Explain this more simply, in 3 short sentences, for how it is used on this page.",
};

const MATTER: QuickAction = {
  id: "matter",
  label: "Why does this matter?",
  prompt:
    "Why does this matter in the surrounding page context? What goes wrong if someone misunderstands it? 2–4 sentences.",
};

const EXAMPLE: QuickAction = {
  id: "example",
  label: "Give a code example",
  prompt:
    "Give one short, realistic code example for this term as used on this page. Use the language implied by the page. At most 10 lines, then one sentence on what it shows.",
};

const PROGRAMMING_HOST =
  /github\.com|gitlab\.com|bitbucket\.org|developer\.mozilla|mdn\.io|stackoverflow\.com|stackexchange\.com|npmjs\.com|pypi\.org|readthedocs|devdocs\.io|manning\.com|livebook|javadoc|kotlinlang|python\.org|go\.dev|rust-lang\.org|typescriptlang\.org|react\.dev|nextjs\.org|nodejs\.org|kubernetes\.io|docs\./i;

const PROGRAMMING_WORDS = [
  "function",
  "method",
  "interface",
  "struct",
  "enum",
  "generic",
  "async",
  "await",
  "promise",
  "callback",
  "closure",
  "goroutine",
  "mutex",
  "thread",
  "runtime",
  "compile",
  "pointer",
  "undefined",
  "import",
  "export",
  "module",
  "package",
  "endpoint",
  "middleware",
  "component",
  "hook",
  "props",
  "algorithm",
  "boolean",
  "json",
  "sql",
  "exception",
  "heap",
  "docker",
  "kubernetes",
  "npm",
];

/**
 * Heuristic: should we offer a code-example quick action?
 * Uses the highlight, surrounding extract, and page URL — not a model call.
 */
export function isProgrammingRelated(
  term: string,
  context: string,
  pageUrl: string,
  pageTitle: string,
): boolean {
  if (PROGRAMMING_HOST.test(pageUrl)) return true;

  if (/[a-z][A-Z]/.test(term)) return true;
  if (/[_$]|::|<\/?[A-Za-z]|=>|\(\)\s*$/.test(term)) return true;
  if (/[{};<>]|=>|::|function\b|const\b|class\b/.test(context)) return true;

  const hay = `${term} ${context} ${pageTitle}`.toLowerCase();
  return PROGRAMMING_WORDS.some((word) => hay.includes(word));
}

export function quickActionsFor(
  term: string,
  context: string,
  pageUrl: string,
  pageTitle: string,
): QuickAction[] {
  const actions = [SIMPLER, MATTER];
  if (isProgrammingRelated(term, context, pageUrl, pageTitle)) {
    actions.splice(1, 0, EXAMPLE);
  }
  return actions;
}
