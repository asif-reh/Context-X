import type { AnchorRect, OverlayPosition } from "./types";

export const OVERLAY_PAD = 12;
export const OVERLAY_GAP = 10;
export const PANEL_WIDTH = 368;
export const BUTTON_FALLBACK = { width: 118, height: 32 } as const;

const CROWDED_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "video",
  "audio",
  "iframe",
  "header",
  "nav",
  "[role='dialog']",
  "[role='navigation']",
  "[role='banner']",
].join(",");

export function rectToAnchor(rect: DOMRect | DOMRectReadOnly): AnchorRect {
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function viewport(): { w: number; h: number; pad: number } {
  return {
    w: window.innerWidth,
    h: window.innerHeight,
    pad: OVERLAY_PAD,
  };
}

export function isOnScreen(rect: AnchorRect): boolean {
  const { w, h } = viewport();
  return rect.bottom > 0 && rect.top < h && rect.right > 0 && rect.left < w;
}

/** Last visual line of a wrapped selection — where Grammarly-style chips sit. */
export function lastLineRect(range: Range): AnchorRect {
  try {
    const rects = range.getClientRects();
    const start = Math.max(0, rects.length - 24);
    for (let i = rects.length - 1; i >= start; i -= 1) {
      const rect = rects[i];
      if (rect && rect.width + rect.height > 0) {
        return rectToAnchor(rect);
      }
    }
    return rectToAnchor(range.getBoundingClientRect());
  } catch {
    return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }
}

export function boundsRect(range: Range): AnchorRect {
  return rectToAnchor(range.getBoundingClientRect());
}

function clampPosition(
  top: number,
  left: number,
  size: { width: number; height: number },
  side: OverlayPosition["side"],
): OverlayPosition {
  const { w, h, pad } = viewport();
  return {
    top: clamp(top, pad, Math.max(pad, h - size.height - pad)),
    left: clamp(left, pad, Math.max(pad, w - size.width - pad)),
    width: size.width,
    maxHeight: size.height,
    side,
  };
}

function isOurOverlay(node: Element): boolean {
  if (node.id === "context-x-host") return true;
  const root = node.getRootNode();
  return root instanceof ShadowRoot && root.host.id === "context-x-host";
}

function crowdedScore(
  pos: OverlayPosition,
  size: { width: number; height: number },
): number {
  const samples: Array<[number, number]> = [
    [pos.left + 6, pos.top + 6],
    [pos.left + size.width / 2, pos.top + size.height / 2],
    [pos.left + size.width - 6, pos.top + size.height - 6],
  ];

  let hits = 0;
  for (const [x, y] of samples) {
    const node = document.elementFromPoint(x, y);
    if (!node || isOurOverlay(node)) continue;
    if (node.closest?.(CROWDED_SELECTOR)) hits += 1;
  }
  return hits;
}

/**
 * Place the Explain chip next to the last selected line.
 * Tries end → start → below → above, skipping spots that sit on links,
 * inputs, nav, or media when another candidate is free.
 */
export function placeButton(
  endRect: AnchorRect,
  size: { width: number; height: number } = BUTTON_FALLBACK,
): OverlayPosition {
  const gap = OVERLAY_GAP;
  const candidates: OverlayPosition[] = [
    clampPosition(
      endRect.top + (endRect.height - size.height) / 2,
      endRect.right + gap,
      size,
      "end",
    ),
    clampPosition(
      endRect.top + (endRect.height - size.height) / 2,
      endRect.left - gap - size.width,
      size,
      "start",
    ),
    clampPosition(
      endRect.bottom + gap,
      endRect.left + endRect.width / 2 - size.width / 2,
      size,
      "below",
    ),
    clampPosition(
      endRect.top - gap - size.height,
      endRect.left + endRect.width / 2 - size.width / 2,
      size,
      "above",
    ),
  ];

  let best = candidates[0]!;
  let bestScore = crowdedScore(best, size);
  for (let i = 1; i < candidates.length; i += 1) {
    const next = candidates[i]!;
    const score = crowdedScore(next, size);
    if (score < bestScore) {
      best = next;
      bestScore = score;
      if (score === 0) break;
    }
  }
  return best;
}

/**
 * Place the explanation panel against the selection bounds.
 * Prefers below, flips above when needed, and reports maxHeight so the
 * card can scroll internally instead of leaving the viewport.
 */
export function placePanel(
  bounds: AnchorRect,
  size: { width: number; height: number },
): OverlayPosition {
  const { w, h, pad } = viewport();
  const gap = 10;
  const width = Math.min(size.width, w - pad * 2);
  const maxLeft = Math.max(pad, w - width - pad);

  const spaceBelow = h - bounds.bottom - pad - gap;
  const spaceAbove = bounds.top - pad - gap;
  const minComfortable = Math.min(size.height, 240);
  const side: "above" | "below" =
    spaceBelow >= minComfortable || spaceBelow >= spaceAbove
      ? "below"
      : "above";

  const maxHeight = Math.max(
    180,
    Math.min(side === "below" ? spaceBelow : spaceAbove, h - pad * 2),
  );
  const height = Math.min(size.height, maxHeight);
  const unclampedTop =
    side === "below" ? bounds.bottom + gap : bounds.top - gap - height;

  return {
    top: clamp(unclampedTop, pad, Math.max(pad, h - height - pad)),
    left: clamp(bounds.left, pad, maxLeft),
    width,
    maxHeight,
    side,
  };
}
