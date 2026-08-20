import { listSameOriginFrames } from "./frames";
import { boundsRect, isOnScreen, lastLineRect, rectToAnchor } from "./position";
import type { SelectionSnapshot } from "./types";

export const HOST_ID = "context-x-host";

/** Ignore accidental clicks and giant paste-selects. */
export const MIN_TERM_CHARS = 3;
export const MAX_TERM_CHARS = 160;

export type SelectionMiss =
  | "empty"
  | "short"
  | "long"
  | "iframe"
  | "unreadable";

export type SelectionRead =
  | { ok: true; snapshot: SelectionSnapshot }
  | { ok: false; reason: SelectionMiss };

export function eventPathIncludesHost(event: Event): boolean {
  const host = document.getElementById(HOST_ID);
  if (!host) return false;
  return event.composedPath().includes(host);
}

export function toastForMiss(reason: SelectionMiss): string {
  switch (reason) {
    case "short":
      return "Select a longer word or phrase — a couple of letters isn't enough.";
    case "long":
      return "Highlight a shorter term. A word or short phrase works best.";
    case "iframe":
      return "Can't read text inside this embedded frame. Open it in a new tab, or select on the main page.";
    case "unreadable":
      return "Can't read that selection. Try highlighting the text on the page itself.";
    default:
      return "Select a word or phrase first.";
  }
}

function isFormControl(el: Element): boolean {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  );
}

/**
 * Skip real form fields so the chip does not appear while typing.
 * Large contenteditable surfaces (ebook readers, docs) stay eligible.
 */
export function isFormField(node: Node | null): boolean {
  const el = node instanceof Element ? node : (node?.parentElement ?? null);
  if (!el) return false;
  if (isFormControl(el)) return true;
  if (el.closest("input, textarea, select, [role='textbox']")) return true;

  const editable = el.closest(
    "[contenteditable]:not([contenteditable='false'])",
  );
  if (!editable || !(editable instanceof HTMLElement)) return false;
  if (editable.closest("form") || editable.getAttribute("role") === "textbox") {
    return true;
  }
  return (editable.textContent ?? "").length < 800;
}

function isInsideHost(node: Node | null): boolean {
  const host = document.getElementById(HOST_ID);
  if (!host || !node) return false;
  if (host === node || host.contains(node)) return true;
  const root = node.getRootNode();
  return root instanceof ShadowRoot && root.host === host;
}

/**
 * Walk the range’s text nodes up to a cap so a whole-page select
 * never calls `selection.toString()` on tens of thousands of characters.
 */
function limitedSelectedText(
  range: Range,
  maxChars: number,
): { text: string; overflow: boolean } {
  try {
    const start = range.startContainer;
    const end = range.endContainer;

    if (start === end && start.nodeType === Node.TEXT_NODE) {
      const raw = (start.textContent ?? "").slice(
        Math.min(range.startOffset, range.endOffset),
        Math.max(range.startOffset, range.endOffset),
      );
      const text = raw.replace(/\s+/g, " ").trim();
      return { text, overflow: text.length > maxChars };
    }

    const root =
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentNode;
    if (!root) return { text: "", overflow: false };

    const doc = range.commonAncestorContainer.ownerDocument ?? document;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let buf = "";
    let seen = false;
    let node = walker.nextNode();
    while (node) {
      if (!range.intersectsNode(node)) {
        if (seen) break;
        node = walker.nextNode();
        continue;
      }
      seen = true;
      const value = node.textContent ?? "";
      const piece =
        node === start && node === end
          ? value.slice(range.startOffset, range.endOffset)
          : node === start
            ? value.slice(range.startOffset)
            : node === end
              ? value.slice(0, range.endOffset)
              : value;
      buf += piece;
      if (buf.length > maxChars + 24) {
        return {
          text: buf.replace(/\s+/g, " ").trim(),
          overflow: true,
        };
      }
      if (node === end) break;
      node = walker.nextNode();
    }

    const text = buf.replace(/\s+/g, " ").trim();
    return { text, overflow: text.length > maxChars };
  } catch {
    return { text: "", overflow: false };
  }
}

function snapshotFromRange(
  range: Range,
  term: string,
  context: string,
): SelectionSnapshot | null {
  let endRect = lastLineRect(range);
  if (endRect.width === 0 && endRect.height === 0) {
    const node =
      range.endContainer instanceof Element
        ? range.endContainer
        : range.endContainer.parentElement;
    if (node) endRect = rectToAnchor(node.getBoundingClientRect());
  }
  const bounds = boundsRect(range);
  if ((endRect.width === 0 && endRect.height === 0) || !isOnScreen(endRect)) {
    return null;
  }

  return {
    term,
    context,
    range: range.cloneRange(),
    endRect,
    bounds,
  };
}

function inspectWindow(win: Window): SelectionRead {
  const selection = win.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) {
    return { ok: false, reason: "empty" };
  }

  let range: Range;
  try {
    range = selection.getRangeAt(0);
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  if (isFormField(range.commonAncestorContainer)) {
    return { ok: false, reason: "empty" };
  }
  if (isInsideHost(range.commonAncestorContainer)) {
    return { ok: false, reason: "empty" };
  }

  const { text, overflow } = limitedSelectedText(range, MAX_TERM_CHARS);
  if (overflow) return { ok: false, reason: "long" };
  if (text.length === 0) return { ok: false, reason: "empty" };
  if (text.length < MIN_TERM_CHARS) return { ok: false, reason: "short" };

  const snapshot = snapshotFromRange(range, text, text);
  if (!snapshot) return { ok: false, reason: "unreadable" };
  return { ok: true, snapshot };
}

function shiftRect(
  rect: SelectionSnapshot["endRect"],
  frameBox: DOMRectReadOnly,
): SelectionSnapshot["endRect"] {
  return {
    top: rect.top + frameBox.top,
    left: rect.left + frameBox.left,
    right: rect.right + frameBox.left,
    bottom: rect.bottom + frameBox.top,
    width: rect.width,
    height: rect.height,
  };
}

function offsetByFrame(
  snapshot: SelectionSnapshot,
  frame: HTMLIFrameElement,
): SelectionSnapshot | null {
  try {
    if (!frame.isConnected) return null;
    const box = frame.getBoundingClientRect();
    return {
      ...snapshot,
      frame,
      endRect: shiftRect(snapshot.endRect, box),
      bounds: shiftRect(snapshot.bounds, box),
    };
  } catch {
    return null;
  }
}

/** Same-origin iframes we can read; cross-origin frames fail closed. */
function inspectFocusedFrame(): SelectionRead | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLIFrameElement)) return null;

  let win: Window | null = null;
  try {
    win = active.contentWindow;
    if (!win || active.contentDocument === null) {
      return { ok: false, reason: "iframe" };
    }
  } catch {
    return { ok: false, reason: "iframe" };
  }

  const result = inspectWindow(win);
  if (!result.ok) return result;
  const shifted = offsetByFrame(result.snapshot, active);
  if (!shifted) return { ok: false, reason: "unreadable" };
  return { ok: true, snapshot: shifted };
}

function inspectSameOriginFrames(): SelectionRead | null {
  const frames = listSameOriginFrames();
  for (const frame of frames) {
    const win = frame.contentWindow;
    if (!win) continue;
    const result = inspectWindow(win);
    if (result.ok) {
      const shifted = offsetByFrame(result.snapshot, frame);
      if (shifted) return { ok: true, snapshot: shifted };
      continue;
    }
    if (result.reason === "short" || result.reason === "long") return result;
  }
  return null;
}

export function inspectSelection(): SelectionRead {
  try {
    const result = inspectWindow(window);
    if (result.ok || result.reason === "short" || result.reason === "long") {
      return result;
    }
    const focused = inspectFocusedFrame();
    if (focused?.ok || focused?.reason === "short" || focused?.reason === "long") {
      return focused;
    }
    if (focused?.reason === "iframe") return focused;
    const nested = inspectSameOriginFrames();
    if (nested) return nested;
    return focused ?? result;
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}

/** Remeasure a cloned range after scroll/resize. */
export function refreshSnapshot(
  snapshot: SelectionSnapshot,
): SelectionSnapshot | null {
  try {
    if (snapshot.range.collapsed) return null;
    const next = snapshotFromRange(
      snapshot.range,
      snapshot.term,
      snapshot.context,
    );
    if (!next) return null;
    return snapshot.frame ? offsetByFrame(next, snapshot.frame) : next;
  } catch {
    return null;
  }
}
