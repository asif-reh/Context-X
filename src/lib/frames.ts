const MAX_FRAMES = 8;
const SCAN_DEBOUNCE_MS = 250;

function isReadableFrame(frame: HTMLIFrameElement): boolean {
  if (frame.offsetWidth < 12 && frame.offsetHeight < 12) return false;
  try {
    return frame.contentDocument !== null && frame.contentWindow !== null;
  } catch {
    return false;
  }
}

/** Same-origin iframes we can actually read (skips ads, pixels, cross-origin). */
export function listSameOriginFrames(): HTMLIFrameElement[] {
  const nodes = document.querySelectorAll("iframe");
  const frames: HTMLIFrameElement[] = [];
  for (let i = 0; i < nodes.length && frames.length < MAX_FRAMES; i += 1) {
    const node = nodes[i];
    if (node instanceof HTMLIFrameElement && isReadableFrame(node)) {
      frames.push(node);
    }
  }
  return frames;
}

function tryContentDocument(frame: HTMLIFrameElement): Document | null {
  try {
    return frame.contentDocument;
  } catch {
    return null;
  }
}

/**
 * Call `bind` for the top document and each same-origin iframe document.
 * Re-runs when iframes are added or finish loading (ebook readers, docs).
 */
export function watchSameOriginDocuments(
  bind: (doc: Document) => (() => void) | void,
): () => void {
  const attached = new Map<Document, () => void>();
  let scanTimer = 0;
  const loaders = new Set<HTMLIFrameElement>();

  const attach = (doc: Document): void => {
    if (attached.has(doc)) return;
    const teardown = bind(doc);
    attached.set(doc, () => teardown?.());
  };

  const onFrameLoad = (event: Event): void => {
    const frame = event.currentTarget;
    if (!(frame instanceof HTMLIFrameElement)) return;
    const doc = tryContentDocument(frame);
    if (doc) attach(doc);
  };

  const scan = (): void => {
    attach(document);
    const frames = document.querySelectorAll("iframe");
    const limit = Math.min(frames.length, MAX_FRAMES);
    for (let i = 0; i < limit; i += 1) {
      const frame = frames[i];
      if (!(frame instanceof HTMLIFrameElement)) continue;
      const doc = tryContentDocument(frame);
      if (doc && isReadableFrame(frame)) {
        attach(doc);
        continue;
      }
      if (loaders.has(frame)) continue;
      loaders.add(frame);
      frame.addEventListener("load", onFrameLoad);
    }
  };

  const scheduleScan = (): void => {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, SCAN_DEBOUNCE_MS);
  };

  scan();
  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  return () => {
    window.clearTimeout(scanTimer);
    observer.disconnect();
    loaders.forEach((frame) => {
      frame.removeEventListener("load", onFrameLoad);
    });
    loaders.clear();
    attached.forEach((teardown) => teardown());
    attached.clear();
  };
}
