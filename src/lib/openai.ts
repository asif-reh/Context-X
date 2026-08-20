import {
  buildExplainSystemPrompt,
  buildFollowUpSystemPrompt,
} from "./explainPrompt";
import { toCompletionUsage, estimateTokensFromText } from "./pricing";
import type { CompletionUsage, TokenUsage } from "./pricing";
import { finalizeExplanation, parseExplainMarkdown } from "./parseExplanation";
import { getSettings } from "./storage";
import {
  MAX_FOLLOW_UPS,
  type ExplainErrorCode,
  type ExplainFailure,
  type ExplainPayload,
  type ExplainResult,
  type Explanation,
  type FollowUpHistoryItem,
} from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const EXPLAIN_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 20_000;

export class ExplainError extends Error {
  readonly code: ExplainErrorCode;

  constructor(code: ExplainErrorCode, message: string) {
    super(message);
    this.name = "ExplainError";
    this.code = code;
  }
}

export function toFailure(error: unknown): ExplainFailure {
  if (error instanceof ExplainError) {
    return { ok: false, code: error.code, message: error.message };
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return { ok: false, code: "TIMEOUT", message: messageFor("TIMEOUT") };
  }
  return {
    ok: false,
    code: "UNKNOWN",
    message: "Something went wrong while explaining. Please try again.",
  };
}

function fail(code: ExplainErrorCode, message: string): ExplainResult {
  return { ok: false, code, message };
}

function mapStatusToCode(status: number): ExplainErrorCode {
  if (status === 401 || status === 403) return "INVALID_KEY";
  if (status === 429) return "RATE_LIMIT";
  if (status === 408 || status === 504) return "TIMEOUT";
  return "UNKNOWN";
}

export function messageFor(code: ExplainErrorCode, status?: number): string {
  switch (code) {
    case "NO_API_KEY":
      return "Add your OpenAI API key in Context-X settings, then try again.";
    case "INVALID_KEY":
      return "That API key was not accepted. Open settings and paste a new key from OpenAI.";
    case "RATE_LIMIT":
      return "OpenAI is busy right now. Wait a few seconds, then tap Retry.";
    case "NETWORK":
      return "Could not reach OpenAI. Check your internet connection, then tap Retry.";
    case "TIMEOUT":
      return "That took too long. Tap Retry — a second attempt often works.";
    case "BAD_RESPONSE":
      return "Could not turn that into an explanation. Tap Retry, or highlight a slightly different phrase.";
    default:
      return status
        ? "Something went wrong on OpenAI's side. Tap Retry in a moment."
        : "Something went wrong. Tap Retry. If it keeps happening, check your API key in settings.";
  }
}

async function requireApiKey(): Promise<string> {
  const { openaiApiKey } = await getSettings();
  const key = openaiApiKey.trim();
  if (!key) {
    throw new ExplainError("NO_API_KEY", messageFor("NO_API_KEY"));
  }
  return key;
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Stream a chat completion from OpenAI (SSE). Tokens are delivered as they
 * arrive; usage is taken from the final chunk when `include_usage` is set.
 */
async function streamChatCompletion(
  apiKey: string,
  messages: ChatMessage[],
  signal: AbortSignal | undefined,
  onToken: (token: string) => void,
  maxTokens = 600,
): Promise<{ text: string; usage: TokenUsage }> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const combined =
    signal !== undefined
      ? AbortSignal.any([signal, timeout.signal])
      : timeout.signal;

  try {
    let response: Response;
    try {
      response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: EXPLAIN_MODEL,
          temperature: 0.3,
          max_tokens: maxTokens,
          stream: true,
          stream_options: { include_usage: true },
          messages,
        }),
        signal: combined,
      });
    } catch (error) {
      if (signal?.aborted && !timeout.signal.aborted) throw error;
      if (timeout.signal.aborted && !signal?.aborted) {
        throw new ExplainError("TIMEOUT", messageFor("TIMEOUT"));
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new ExplainError("NETWORK", messageFor("NETWORK"));
    }

    if (!response.ok) {
      const code = mapStatusToCode(response.status);
      throw new ExplainError(code, messageFor(code, response.status));
    }

    if (!response.body) {
      throw new ExplainError("NETWORK", messageFor("NETWORK"));
    }

    return await readSseTokens(response.body, combined, onToken);
  } catch (error) {
    if (timeout.signal.aborted && !signal?.aborted) {
      throw new ExplainError("TIMEOUT", messageFor("TIMEOUT"));
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

type SseEvent =
  | { kind: "token"; text: string }
  | { kind: "done" }
  | { kind: "usage"; usage: TokenUsage }
  | { kind: "skip" };

async function readSseTokens(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal | undefined,
  onToken: (token: string) => void,
): Promise<{ text: string; usage: TokenUsage }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assembled = "";
  let usage: TokenUsage | null = null;

  const abort = (): void => {
    void reader.cancel();
  };
  signal?.addEventListener("abort", abort, { once: true });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseSseLine(line);
        if (event.kind === "skip") continue;
        if (event.kind === "done") {
          return {
            text: assembled,
            usage: usage ?? fallbackUsage(assembled),
          };
        }
        if (event.kind === "usage") {
          usage = event.usage;
          continue;
        }
        assembled += event.text;
        onToken(event.text);
      }
    }

    const trailing = parseSseLine(buffer);
    if (trailing.kind === "token") {
      assembled += trailing.text;
      onToken(trailing.text);
    } else if (trailing.kind === "usage") {
      usage = trailing.usage;
    }

    return {
      text: assembled,
      usage: usage ?? fallbackUsage(assembled),
    };
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}

function parseSseLine(line: string): SseEvent {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return { kind: "skip" };
  const data = trimmed.slice(5).trim();
  if (!data) return { kind: "skip" };
  if (data === "[DONE]") return { kind: "done" };

  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== "object" || parsed === null) return { kind: "skip" };

    const choices = (
      parsed as { choices?: Array<{ delta?: { content?: unknown } }> }
    ).choices;
    const content = choices?.[0]?.delta?.content;
    if (typeof content === "string") return { kind: "token", text: content };

    const usage = usageFromChunk(parsed);
    if (usage) return { kind: "usage", usage };
    return { kind: "skip" };
  } catch {
    return { kind: "skip" };
  }
}

function usageFromChunk(parsed: unknown): TokenUsage | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const usage = (parsed as { usage?: Record<string, unknown> }).usage;
  if (!usage) return null;

  const input = asFiniteNumber(usage.prompt_tokens ?? usage.input_tokens);
  const output = asFiniteNumber(
    usage.completion_tokens ?? usage.output_tokens,
  );
  if (input === null || output === null) return null;
  return { inputTokens: input, outputTokens: output };
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function fallbackUsage(outputText: string): TokenUsage {
  return {
    inputTokens: 0,
    outputTokens: estimateTokensFromText(outputText),
  };
}

export async function streamExplanation(
  payload: ExplainPayload,
  options: {
    signal?: AbortSignal;
    onDelta: (explanation: Explanation) => void;
  },
): Promise<{ explanation: Explanation; usage: CompletionUsage }> {
  const apiKey = await requireApiKey();
  let raw = "";

  const result = await streamChatCompletion(
    apiKey,
    [
      {
        role: "system",
        content: buildExplainSystemPrompt(payload.term, payload.context),
      },
      { role: "user", content: "Explain the selected text." },
    ],
    options.signal,
    (token) => {
      raw += token;
      options.onDelta(parseExplainMarkdown(raw, payload.term));
    },
  );

  const final = finalizeExplanation(raw, payload.term);
  if (!final.definition.trim()) {
    throw new ExplainError("BAD_RESPONSE", messageFor("BAD_RESPONSE"));
  }

  const usage = toCompletionUsage(
    result.usage.inputTokens > 0
      ? result.usage
      : {
          inputTokens: estimateTokensFromText(
            `${buildExplainSystemPrompt(payload.term, payload.context)}\nExplain the selected text.`,
          ),
          outputTokens: result.usage.outputTokens,
        },
  );

  return { explanation: final, usage };
}

export async function streamFollowUpAnswer(
  payload: ExplainPayload,
  prior: Explanation,
  question: string,
  history: FollowUpHistoryItem[],
  options: {
    signal?: AbortSignal;
    onDelta: (text: string) => void;
  },
): Promise<string> {
  const apiKey = await requireApiKey();
  let raw = "";

  const priorTurns: ChatMessage[] = history.slice(-MAX_FOLLOW_UPS).flatMap(
    (turn) => [
      { role: "user" as const, content: turn.question },
      { role: "assistant" as const, content: turn.answer },
    ],
  );

  await streamChatCompletion(
    apiKey,
    [
      {
        role: "system",
        content: buildFollowUpSystemPrompt(
          payload.term,
          payload.context,
          payload.pageTitle,
          prior.definition,
          prior.explanation,
          prior.analogy,
        ),
      },
      ...priorTurns,
      { role: "user", content: question.trim() },
    ],
    options.signal,
    (token) => {
      raw += token;
      options.onDelta(raw.trim());
    },
    420,
  );

  const answer = raw.trim();
  if (!answer) {
    throw new ExplainError("BAD_RESPONSE", messageFor("BAD_RESPONSE"));
  }
  return answer;
}

/** Lightweight ping used by the options page "Test connection" button. */
export async function testApiKey(
  apiKey: string,
  model: string,
): Promise<ExplainResult> {
  if (!apiKey.trim()) {
    return fail("NO_API_KEY", messageFor("NO_API_KEY"));
  }

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || EXPLAIN_MODEL,
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with OK" }],
      }),
      signal: timeout.signal,
    });

    if (response.ok) {
      return {
        ok: true,
        data: {
          term: "ok",
          definition: "ok",
          explanation: "ok",
          analogy: "ok",
        },
      };
    }

    const code = mapStatusToCode(response.status);
    return fail(code, messageFor(code, response.status));
  } catch (error) {
    if (timeout.signal.aborted) {
      return fail("TIMEOUT", messageFor("TIMEOUT"));
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      return fail("TIMEOUT", messageFor("TIMEOUT"));
    }
    return fail("NETWORK", messageFor("NETWORK"));
  } finally {
    clearTimeout(timer);
  }
}
