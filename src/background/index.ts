import {
  EXPLAIN_PORT,
  MESSAGE,
  type ExtensionMessage,
  type StreamToBackground,
  type StreamToContent,
} from "@/lib/messages";
import { setOnboardingComplete } from "@/lib/onboarding";
import {
  streamExplanation,
  streamFollowUpAnswer,
  toFailure,
} from "@/lib/openai";
import { getSettings } from "@/lib/storage";
import { recordExplanationUsage } from "@/lib/usage";

/**
 * MV3 service worker.
 *
 * All OpenAI traffic happens here so the API key stays in `chrome.storage.sync`
 * and is never exposed to page JavaScript.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    void chrome.runtime.openOptionsPage();
    return;
  }
  if (details.reason === "update") {
    void (async () => {
      const { openaiApiKey } = await getSettings();
      if (openaiApiKey) await setOnboardingComplete();
    })();
  }
});

function post(port: chrome.runtime.Port, message: StreamToContent): void {
  try {
    port.postMessage(message);
  } catch {
    // The content script disconnected while tokens were still in flight.
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== EXPLAIN_PORT) return;

  const abort = new AbortController();
  port.onDisconnect.addListener(() => abort.abort());

  port.onMessage.addListener((message: StreamToBackground) => {
    if (message.type === "EXPLAIN") {
      void (async () => {
        try {
          const { explanation, usage } = await streamExplanation(
            message.payload,
            {
              signal: abort.signal,
              onDelta: (partial) => {
                post(port, { type: "delta", explanation: partial });
              },
            },
          );
          post(port, { type: "done", explanation, usage });
          void recordExplanationUsage({
            selectedText: message.payload.term,
            usage,
          });
        } catch (error) {
          if (abort.signal.aborted) return;
          post(port, { type: "error", error: toFailure(error) });
        }
      })();
      return;
    }

    if (message.type === "FOLLOW_UP") {
      void (async () => {
        try {
          await streamFollowUpAnswer(
            message.payload,
            message.prior,
            message.question,
            message.history,
            {
              signal: abort.signal,
              onDelta: (text) => {
                post(port, {
                  type: "follow_up_delta",
                  id: message.id,
                  text,
                });
              },
            },
          );
          post(port, { type: "follow_up_done", id: message.id });
        } catch (error) {
          if (abort.signal.aborted) return;
          post(port, {
            type: "follow_up_error",
            id: message.id,
            error: toFailure(error),
          });
        }
      })();
    }
  });
});

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender,
    sendResponse: (response: { ok: true }) => void,
  ) => {
    if (message.type === MESSAGE.OPEN_OPTIONS) {
      void chrome.runtime.openOptionsPage();
      sendResponse({ ok: true });
      return;
    }

    return false;
  },
);

chrome.commands.onCommand.addListener((command) => {
  if (command !== "explain-selection") return;

  void (async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (typeof tab?.id === "number") {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE.EXPLAIN_SELECTION,
        });
      } catch {
        // No content script on this tab (chrome://, Web Store, PDF viewer, …).
      }
    }
  })();
});
