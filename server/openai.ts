import {
  buildExplainSystemPrompt,
  buildFollowUpSystemPrompt,
} from "../src/lib/explainPrompt";
import type { ExplainBody, FollowUpBody } from "./validate";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function requireOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!key) {
    throw new Error("MISSING_SERVER_KEY");
  }
  return key;
}

async function streamCompletion(
  messages: ChatMessage[],
  maxTokens: number,
): Promise<Response> {
  const apiKey = requireOpenAiKey();
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      messages,
    }),
  });
  return response;
}

export async function streamExplain(body: ExplainBody): Promise<Response> {
  return streamCompletion(
    [
      {
        role: "system",
        content: buildExplainSystemPrompt(body.term, body.context),
      },
      { role: "user", content: "Explain the selected text." },
    ],
    600,
  );
}

export async function streamFollowUp(body: FollowUpBody): Promise<Response> {
  const priorTurns: ChatMessage[] = body.history.flatMap((turn) => [
    { role: "user", content: turn.question },
    { role: "assistant", content: turn.answer },
  ]);

  return streamCompletion(
    [
      {
        role: "system",
        content: buildFollowUpSystemPrompt(
          body.term,
          body.context,
          body.pageTitle,
          body.prior.definition,
          body.prior.explanation,
          body.prior.analogy,
        ),
      },
      ...priorTurns,
      { role: "user", content: body.question },
    ],
    420,
  );
}

export async function pingOpenAi(): Promise<boolean> {
  const apiKey = requireOpenAiKey();
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8,
      messages: [{ role: "user", content: "Reply with OK" }],
    }),
  });
  return response.ok;
}
