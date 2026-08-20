import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { ExplainButton } from "@/components/ExplainButton";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { OverlayToast } from "@/components/OverlayToast";
import { useSelectionOverlay } from "@/hooks/useSelectionOverlay";
import { extractContext } from "@/lib/context";
import { startExplainStream, type ExplainStreamHandle } from "@/lib/explainClient";
import { watchSameOriginDocuments } from "@/lib/frames";
import { MESSAGE, sendMessage } from "@/lib/messages";
import { hasAnySection } from "@/lib/parseExplanation";
import { inspectSelection, refreshSnapshot, toastForMiss } from "@/lib/selection";
import { quickActionsFor } from "@/lib/quickActions";
import { isExplainShortcut, isTypingTarget } from "@/lib/shortcut";
import {
  MAX_FOLLOW_UPS,
  type ExplainFailure,
  type ExplainPayload,
  type Explanation,
  type FollowUpTurn,
  type SelectionSnapshot,
} from "@/lib/types";

const PANEL_CLOSE_MS = 160;
const SHORTCUT_DEBOUNCE_MS = 400;

type View =
  | { kind: "hidden" }
  | { kind: "button"; snapshot: SelectionSnapshot }
  | {
      kind: "panel";
      snapshot: SelectionSnapshot;
      loading: boolean;
      streaming: boolean;
      explanation: Explanation | null;
      error: ExplainFailure | null;
      followUps: FollowUpTurn[];
      costUsd: number | null;
      closing: boolean;
    };

function payloadFrom(snapshot: SelectionSnapshot): ExplainPayload {
  let context = snapshot.term;
  try {
    context = extractContext(snapshot.range, snapshot.term) || snapshot.term;
  } catch {
    context = snapshot.term;
  }

  return {
    term: snapshot.term,
    context,
    pageTitle: document.title,
    pageUrl: location.href,
  };
}

/**
 * Overlay UI mounted inside the isolated Shadow Root.
 * Talks to the background worker over a streaming port.
 */
export function ContentApp(): JSX.Element | null {
  const [view, setView] = useState<View>({ kind: "hidden" });
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );
  const generation = useRef(0);
  const lockRef = useRef(false);
  const streamRef = useRef<ExplainStreamHandle | null>(null);
  const explanationRef = useRef<Explanation | null>(null);
  const snapshotRef = useRef<SelectionSnapshot | null>(null);
  const lastShortcutAt = useRef(0);

  const followUpsRef = useRef<FollowUpTurn[]>([]);

  const stopStream = useCallback(() => {
    streamRef.current?.abort();
    streamRef.current = null;
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const hide = useCallback(() => {
    setView((current) => {
      if (current.kind === "panel" && !current.closing) {
        return { ...current, closing: true };
      }
      return { kind: "hidden" };
    });
  }, []);

  const isClosing = view.kind === "panel" && view.closing;

  useEffect(() => {
    if (view.kind !== "hidden") return;
    lockRef.current = false;
    generation.current += 1;
    stopStream();
    explanationRef.current = null;
    snapshotRef.current = null;
  }, [view.kind, stopStream]);

  useEffect(() => {
    if (!isClosing) return;
    stopStream();
    const timer = window.setTimeout(() => {
      setView({ kind: "hidden" });
    }, PANEL_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [isClosing, stopStream]);

  const showButton = useCallback(
    (snapshot: SelectionSnapshot) => {
      lockRef.current = false;
      stopStream();
      explanationRef.current = null;
      snapshotRef.current = null;
      setView({ kind: "button", snapshot });
    },
    [stopStream],
  );

  const openPanel = useCallback(
    (snapshot: SelectionSnapshot) => {
      lockRef.current = true;
      stopStream();
      const id = ++generation.current;
      explanationRef.current = null;
      snapshotRef.current = snapshot;
      followUpsRef.current = [];

      setView({
        kind: "panel",
        snapshot,
        loading: true,
        streaming: true,
        explanation: null,
        error: null,
        followUps: [],
        costUsd: null,
        closing: false,
      });

      const payload = payloadFrom(snapshot);
      const handle = startExplainStream(payload, {
        onPartial(explanation) {
          if (id !== generation.current) return;
          if (!hasAnySection(explanation)) return;
          explanationRef.current = explanation;
          setView((current) =>
            current.kind === "panel"
              ? {
                  ...current,
                  loading: false,
                  streaming: true,
                  explanation,
                  error: null,
                }
              : current,
          );
        },
        onDone(explanation, usage) {
          if (id !== generation.current) return;
          explanationRef.current = explanation;
          setView((current) =>
            current.kind === "panel"
              ? {
                  ...current,
                  loading: false,
                  streaming: false,
                  explanation,
                  error: null,
                  costUsd: usage.costUsd,
                }
              : current,
          );
        },
        onError(error) {
          if (id !== generation.current) return;
          explanationRef.current = null;
          setView((current) =>
            current.kind === "panel"
              ? {
                  ...current,
                  loading: false,
                  streaming: false,
                  explanation: null,
                  error,
                }
              : current,
          );
        },
        onFollowUpDelta(turnId, text) {
          if (id !== generation.current) return;
          setView((current) => {
            if (current.kind !== "panel") return current;
            return {
              ...current,
              followUps: current.followUps.map((turn) =>
                turn.id === turnId
                  ? { ...turn, answer: text, pending: true }
                  : turn,
              ),
            };
          });
        },
        onFollowUpDone(turnId) {
          if (id !== generation.current) return;
          setView((current) => {
            if (current.kind !== "panel") return current;
            return {
              ...current,
              followUps: current.followUps.map((turn) =>
                turn.id === turnId ? { ...turn, pending: false } : turn,
              ),
            };
          });
        },
        onFollowUpError(turnId, error) {
          if (id !== generation.current) return;
          setView((current) => {
            if (current.kind !== "panel") return current;
            return {
              ...current,
              followUps: current.followUps.map((turn) =>
                turn.id === turnId
                  ? { ...turn, pending: false, answer: error.message }
                  : turn,
              ),
            };
          });
        },
      });

      streamRef.current = handle;
    },
    [stopStream],
  );

  useEffect(() => {
    followUpsRef.current = view.kind === "panel" ? view.followUps : [];
  }, [view]);

  const handleFollowUp = useCallback((question: string, displayText?: string) => {
    const prior = explanationRef.current;
    const handle = streamRef.current;
    const snapshot = snapshotRef.current;
    if (!prior || !handle || !snapshot) return;

    const existing = followUpsRef.current;
    if (existing.some((turn) => turn.pending)) return;
    if (existing.length >= MAX_FOLLOW_UPS) return;

    const history = existing
      .filter((turn) => turn.answer.length > 0 && !turn.pending)
      .map((turn) => ({
        question: turn.question,
        answer: turn.answer,
      }));

    const turnId = crypto.randomUUID();
    const nextTurn: FollowUpTurn = {
      id: turnId,
      question: displayText ?? question,
      answer: "",
      pending: true,
    };
    followUpsRef.current = [...existing, nextTurn];
    handle.askFollowUp(turnId, question, prior, payloadFrom(snapshot), history);

    setView((current) => {
      if (current.kind !== "panel") return current;
      return {
        ...current,
        followUps: [...current.followUps, nextTurn],
      };
    });
  }, []);

  const handleShortcut = useCallback(() => {
    const now = Date.now();
    if (now - lastShortcutAt.current < SHORTCUT_DEBOUNCE_MS) return;
    lastShortcutAt.current = now;

    const result = inspectSelection();
    if (result.ok) {
      openPanel(result.snapshot);
      return;
    }
    if (snapshotRef.current && result.reason === "empty") {
      openPanel(snapshotRef.current);
      return;
    }
    showToast(toastForMiss(result.reason));
  }, [openPanel, showToast]);

  const openSettings = useCallback(() => {
    void sendMessage({ type: MESSAGE.OPEN_OPTIONS });
  }, []);

  useSelectionOverlay({
    lockRef,
    onSelection: showButton,
    onPageClickAway: hide,
  });

  useEffect(() => {
    let scrollFrame = 0;

    const onScrollOrResize = (): void => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        setView((current) => {
          if (current.kind !== "button") return current;
          const next = refreshSnapshot(current.snapshot);
          return next ? { kind: "button", snapshot: next } : { kind: "hidden" };
        });
      });
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        hide();
        return;
      }
      if (!isExplainShortcut(event) || isTypingTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      handleShortcut();
    };

    window.addEventListener("scroll", onScrollOrResize, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", onScrollOrResize);
    const unwatch = watchSameOriginDocuments((doc) => {
      doc.addEventListener("keydown", onKeyDown, true);
      doc.addEventListener("scroll", onScrollOrResize, {
        capture: true,
        passive: true,
      });
      return () => {
        doc.removeEventListener("keydown", onKeyDown, true);
        doc.removeEventListener("scroll", onScrollOrResize, true);
      };
    });

    return () => {
      window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      unwatch();
    };
  }, [handleShortcut, hide]);

  useEffect(() => {
    const onMessage = (message: { type?: string }): void => {
      if (message.type !== MESSAGE.EXPLAIN_SELECTION) return;
      handleShortcut();
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, [handleShortcut]);

  if (view.kind === "hidden" && !toast) return null;

  return (
    <>
      {toast ? (
        <OverlayToast
          key={toast.id}
          message={toast.message}
          onDone={dismissToast}
        />
      ) : null}

      {view.kind === "button" ? (
        <ExplainButton
          key="context-x-chip"
          anchor={view.snapshot.endRect}
          onClick={() => openPanel(view.snapshot)}
        />
      ) : null}

      {view.kind === "panel" ? (
        <ExplanationPanel
          term={view.snapshot.term}
          anchor={view.snapshot.bounds}
          loading={view.loading}
          streaming={view.streaming}
          explanation={view.explanation}
          error={view.error}
          followUps={view.followUps}
          costUsd={view.costUsd}
          closing={view.closing}
          onClose={hide}
          onFollowUp={handleFollowUp}
          onOpenSettings={openSettings}
          onRegenerate={() => openPanel(view.snapshot)}
          quickActions={quickActionsFor(
            view.snapshot.term,
            view.snapshot.context,
            location.href,
            document.title,
          )}
        />
      ) : null}
    </>
  );
}
