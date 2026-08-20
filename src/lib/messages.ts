import type {
  ExplainFailure,
  ExplainPayload,
  Explanation,
  FollowUpHistoryItem,
} from "./types";
import type { CompletionUsage } from "./pricing";

export const EXPLAIN_PORT = "context-x-explain";

export const MESSAGE = {
  OPEN_OPTIONS: "CONTEXT_X_OPEN_OPTIONS",
  EXPLAIN_SELECTION: "CONTEXT_X_EXPLAIN_SELECTION",
} as const;

export interface OpenOptionsMessage {
  type: typeof MESSAGE.OPEN_OPTIONS;
}

export interface ExplainSelectionCommand {
  type: typeof MESSAGE.EXPLAIN_SELECTION;
}

export type ExtensionMessage = OpenOptionsMessage | ExplainSelectionCommand;

export type StreamToBackground =
  | { type: "EXPLAIN"; payload: ExplainPayload }
  | {
      type: "FOLLOW_UP";
      id: string;
      question: string;
      payload: ExplainPayload;
      prior: Explanation;
      history: FollowUpHistoryItem[];
    };

export type StreamToContent =
  | { type: "delta"; explanation: Explanation }
  | { type: "done"; explanation: Explanation; usage: CompletionUsage }
  | { type: "error"; error: ExplainFailure }
  | { type: "follow_up_delta"; id: string; text: string }
  | { type: "follow_up_done"; id: string }
  | { type: "follow_up_error"; id: string; error: ExplainFailure };

/**
 * Typed wrapper around chrome.runtime.sendMessage.
 * The service worker returns a value; callers should always await it.
 */
export async function sendMessage<TResponse>(
  message: ExtensionMessage,
): Promise<TResponse> {
  return chrome.runtime.sendMessage(message) as Promise<TResponse>;
}
