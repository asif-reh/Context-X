import { useEffect, useRef, type MutableRefObject } from "react";
import { watchSameOriginDocuments } from "@/lib/frames";
import { eventPathIncludesHost, inspectSelection } from "@/lib/selection";
import type { SelectionSnapshot } from "@/lib/types";

interface UseSelectionOverlayOptions {
  /**
   * Set synchronously when the panel opens so a trailing `selectionchange`
   * cannot swap the overlay back to the chip in the same turn.
   */
  lockRef: MutableRefObject<boolean>;
  onSelection: (snapshot: SelectionSnapshot) => void;
  onPageClickAway: () => void;
}

const SELECTION_DEBOUNCE_MS = 120;

/**
 * Detects a stable text selection via pointer-up and `selectionchange`.
 * Listeners are also attached inside same-origin iframes (ebook readers).
 */
export function useSelectionOverlay({
  lockRef,
  onSelection,
  onPageClickAway,
}: UseSelectionOverlayOptions): void {
  const onSelectionRef = useRef(onSelection);
  const onPageClickAwayRef = useRef(onPageClickAway);

  onSelectionRef.current = onSelection;
  onPageClickAwayRef.current = onPageClickAway;

  useEffect(() => {
    let pointerSelecting = false;
    let debounce = 0;
    let mouseUpTimer = 0;

    const emitIfSelected = (): void => {
      if (lockRef.current) return;
      if (document.hidden) return;
      const result = inspectSelection();
      if (result.ok) onSelectionRef.current(result.snapshot);
    };

    const schedule = (): void => {
      if (lockRef.current) return;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(emitIfSelected, SELECTION_DEBOUNCE_MS);
    };

    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      if (eventPathIncludesHost(event)) return;
      pointerSelecting = true;
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (event.button !== 0) return;
      if (eventPathIncludesHost(event)) return;
      pointerSelecting = false;

      const immediate = inspectSelection();
      if (immediate.ok) {
        onSelectionRef.current(immediate.snapshot);
      }

      window.clearTimeout(mouseUpTimer);
      mouseUpTimer = window.setTimeout(() => {
        if (lockRef.current) return;
        if (document.hidden) return;
        const result = inspectSelection();
        if (result.ok) {
          onSelectionRef.current(result.snapshot);
          return;
        }
        if (!immediate.ok) onPageClickAwayRef.current();
      }, 0);
    };

    const onSelectionChange = (): void => {
      if (pointerSelecting) return;
      schedule();
    };

    const unwatch = watchSameOriginDocuments((doc) => {
      doc.addEventListener("pointerdown", onPointerDown, {
        capture: true,
        passive: true,
      });
      doc.addEventListener("pointerup", onPointerUp, {
        capture: true,
        passive: true,
      });
      doc.addEventListener("selectionchange", onSelectionChange);
      return () => {
        doc.removeEventListener("pointerdown", onPointerDown, true);
        doc.removeEventListener("pointerup", onPointerUp, true);
        doc.removeEventListener("selectionchange", onSelectionChange);
      };
    });

    return () => {
      window.clearTimeout(debounce);
      window.clearTimeout(mouseUpTimer);
      unwatch();
    };
  }, [lockRef]);
}
