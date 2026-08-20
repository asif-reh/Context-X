import {
  EXPLAIN_PORT,
  type StreamToBackground,
  type StreamToContent,
} from "./messages";
import type {
  ExplainFailure,
  ExplainPayload,
  Explanation,
  FollowUpHistoryItem,
} from "./types";
import type { CompletionUsage } from "./pricing";

export interface ExplainStreamHandlers {
  onPartial: (explanation: Explanation) => void;
  onDone: (explanation: Explanation, usage: CompletionUsage) => void;
  onError: (error: ExplainFailure) => void;
  onFollowUpDelta: (id: string, text: string) => void;
  onFollowUpDone: (id: string) => void;
  onFollowUpError: (id: string, error: ExplainFailure) => void;
}

export interface ExplainStreamHandle {
  abort: () => void;
  askFollowUp: (
    id: string,
    question: string,
    prior: Explanation,
    payload: ExplainPayload,
    history: FollowUpHistoryItem[],
  ) => void;
}

/**
 * Open a long-lived port to the background worker and stream an explanation.
 * The API key never enters this world — only structured text comes back.
 */
export function startExplainStream(
  payload: ExplainPayload,
  handlers: ExplainStreamHandlers,
): ExplainStreamHandle {
  const port = chrome.runtime.connect({ name: EXPLAIN_PORT });
  let aborted = false;
  let settled = false;

  port.onMessage.addListener((message: StreamToContent) => {
    if (aborted) return;

    switch (message.type) {
      case "delta":
        handlers.onPartial(message.explanation);
        return;
      case "done":
        settled = true;
        handlers.onDone(message.explanation, message.usage);
        return;
      case "error":
        settled = true;
        handlers.onError(message.error);
        return;
      case "follow_up_delta":
        handlers.onFollowUpDelta(message.id, message.text);
        return;
      case "follow_up_done":
        handlers.onFollowUpDone(message.id);
        return;
      case "follow_up_error":
        handlers.onFollowUpError(message.id, message.error);
        return;
    }
  });

  port.onDisconnect.addListener(() => {
    if (aborted || settled) return;
    handlers.onError({
      ok: false,
      code: "UNKNOWN",
      message:
        "Context-X lost its connection. Tap Retry, or reload the extension if it keeps happening.",
    });
  });

  const start: StreamToBackground = { type: "EXPLAIN", payload };
  port.postMessage(start);

  return {
    abort() {
      aborted = true;
      port.disconnect();
    },
    askFollowUp(id, question, prior, followPayload, history) {
      const message: StreamToBackground = {
        type: "FOLLOW_UP",
        id,
        question,
        payload: followPayload,
        prior,
        history,
      };
      port.postMessage(message);
    },
  };
}
