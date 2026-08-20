/**
 * Pull the most useful surrounding prose (or code lines) for a selection.
 * Prefers the current sentence plus one on each side, skips chrome/nav/ads,
 * and stays reliable on documentation layouts (MDN, GitHub, Manning, …).
 */

const MAX_CONTEXT = 900;
const MAX_NEIGHBOR = 420;

const BLOCK_SELECTOR = [
  "p",
  "li",
  "blockquote",
  "pre",
  "td",
  "th",
  "dd",
  "dt",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "[data-type='para']",
  "[data-type='sect1']",
  "[data-type='sect2']",
  ".blob-code",
  ".blob-code-inner",
  ".highlight",
  ".cm-line",
].join(",");

const NOISE_SELECTOR = [
  "nav",
  "aside",
  "footer",
  "form",
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "canvas",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
  "[role='search']",
  "[role='complementary']",
  "[aria-hidden='true']",
  "[hidden]",
].join(",");

const NOISE_ATTR =
  /(?:^|[\s_-])(?:nav|sidebar|breadcrumb|toc|menu|advert|adsbygoogle|cookie|consent|promo|sponsor|share|social|subscribe|newsletter|related-posts|comment-count|sidenav)(?:$|[\s_-])/i;

const CODE_SELECTOR = [
  "pre",
  "code",
  "textarea",
  ".blob-code",
  ".blob-code-inner",
  ".highlight",
  ".syntaxhighlighter",
  ".cm-line",
  "[data-code]",
].join(",");

function ownerDoc(node: Node): Document {
  return node.ownerDocument ?? document;
}

export function extractContext(range: Range, term: string): string {
  try {
    const selected = cleanProse(term) || cleanProse(limitedRangeText(range));
    const block = nearestContentBlock(range);
    if (!block) return selected;

    const heading = nearestHeading(block);
    const body = isCodey(block)
      ? extractCodeWindow(block, selected)
      : extractSentenceWindow(block, range, selected);

    const parts: string[] = [];
    if (heading) parts.push(`Section: ${heading}`);
    parts.push(body || selected);

    return capAtSentence(parts.join("\n"), MAX_CONTEXT);
  } catch {
    return cleanProse(term);
  }
}

function nearestContentBlock(range: Range): Element | null {
  let node: Node | null = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  if (!(node instanceof Element)) return null;

  const tight = node.closest(BLOCK_SELECTOR);
  if (tight) return tight;

  let el: Element | null = node;
  let depth = 0;
  const rootEl = ownerDoc(node).documentElement;
  while (el && el !== rootEl && depth < 14) {
    if (el.matches(BLOCK_SELECTOR) && !isNoiseElement(el)) return el;
    el = el.parentElement;
    depth += 1;
  }

  return node;
}

function extractSentenceWindow(
  block: Element,
  range: Range,
  term: string,
): string {
  const prev = adjacentContentBlock(block, "previous");
  const next = adjacentContentBlock(block, "next");

  const chunks: string[] = [];
  if (prev) chunks.push(clip(visibleText(prev), MAX_NEIGHBOR));
  chunks.push(visibleText(block));
  if (next) chunks.push(clip(visibleText(next), MAX_NEIGHBOR));

  const blob = cleanProse(chunks.join(" "));
  if (!blob) return term;

  const sentences = splitSentences(blob);
  if (sentences.length === 0) return clip(blob, MAX_CONTEXT);

  const offset = selectionOffset(block, range);
  const index = sentenceIndex(sentences, term, offset);
  const from = Math.max(0, index - 1);
  const to = Math.min(sentences.length, index + 2);
  return sentences.slice(from, to).join(" ");
}

function extractCodeWindow(block: Element, term: string): string {
  const raw = visibleText(block, true);
  const lines = raw.split("\n");
  const needle = term;
  let index = lines.findIndex((line) =>
    needle ? line.includes(needle) : false,
  );
  if (index < 0) {
    index = lines.findIndex((line) => line.includes(term));
  }
  if (index < 0) index = 0;

  const from = Math.max(0, index - 2);
  const to = Math.min(lines.length, index + 3);
  return lines
    .slice(from, to)
    .map((line) => line.replace(/[ \t]+$/u, ""))
    .join("\n")
    .trim();
}

function adjacentContentBlock(
  block: Element,
  side: "previous" | "next",
): Element | null {
  let sibling =
    side === "previous"
      ? block.previousElementSibling
      : block.nextElementSibling;

  while (sibling) {
    if (!isNoiseElement(sibling) && sibling.matches(BLOCK_SELECTOR)) {
      const len = textLength(sibling);
      if (len > 20 && len < 2000) return sibling;
    }
    sibling =
      side === "previous"
        ? sibling.previousElementSibling
        : sibling.nextElementSibling;
  }
  return null;
}

function textLength(el: Element): number {
  const doc = ownerDoc(el);
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let len = 0;
  let n = 0;
  let node = walker.nextNode();
  while (node && n < 40) {
    len += (node.textContent ?? "").length;
    if (len > 2000) return len;
    n += 1;
    node = walker.nextNode();
  }
  return len;
}

function nearestHeading(from: Element): string | null {
  let current: Element | null = from;
  for (let depth = 0; depth < 10 && current; depth += 1) {
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.matches("h1, h2, h3, h4, h5, h6")) {
        const text = clip(cleanProse(sibling.textContent ?? ""), 120);
        return text || null;
      }
      sibling = sibling.previousElementSibling;
    }
    current = current.parentElement;
    if (
      current?.matches("article, main, body, [role='main'], .markdown-body")
    ) {
      break;
    }
  }
  return null;
}

function visibleText(root: Element, keepNewlines = false): string {
  const doc = ownerDoc(root);
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return isUsefulTextNode(node, root)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const bits: string[] = [];
  let node = walker.nextNode();
  let count = 0;
  while (node && count < 80) {
    bits.push(node.textContent ?? "");
    count += 1;
    node = walker.nextNode();
  }

  const joined = bits.join(keepNewlines ? "\n" : " ");
  return keepNewlines ? cleanCode(joined) : cleanProse(joined);
}

function isUsefulTextNode(node: Node, root: Element): boolean {
  const parent = node.parentElement;
  if (!parent) return false;
  if (parent.closest("script, style, noscript, svg, canvas, iframe")) {
    return false;
  }
  const hidden = parent.closest("[aria-hidden='true'], [hidden]");
  if (hidden && hidden !== root && root.contains(hidden)) return false;
  const noise = parent.closest(NOISE_SELECTOR);
  if (noise && noise !== root && root.contains(noise)) return false;
  return Boolean(node.textContent && /\S/.test(node.textContent));
}

function isNoiseElement(el: Element): boolean {
  if (el.matches(NOISE_SELECTOR)) return true;
  const attr = `${el.getAttribute("class") ?? ""} ${el.id}`;
  return NOISE_ATTR.test(attr);
}

function isCodey(el: Element): boolean {
  return Boolean(el.closest(CODE_SELECTOR));
}

function limitedRangeText(range: Range): string {
  try {
    if (
      range.startContainer === range.endContainer &&
      range.startContainer.nodeType === Node.TEXT_NODE
    ) {
      return (range.startContainer.textContent ?? "").slice(
        range.startOffset,
        range.endOffset,
      );
    }
    const start = range.startContainer;
    const value = start.textContent ?? "";
    return value.slice(range.startOffset, range.startOffset + MAX_CONTEXT);
  } catch {
    return "";
  }
}

function selectionOffset(block: Element, range: Range): number {
  try {
    const doc = ownerDoc(block);
    const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let len = 0;
    let n = 0;
    let node = walker.nextNode();
    while (node && n < 80) {
      const value = node.textContent ?? "";
      if (node === range.startContainer) {
        return len + Math.min(range.startOffset, value.length);
      }
      len += value.length;
      if (len > MAX_CONTEXT * 2) return MAX_CONTEXT * 2;
      n += 1;
      node = walker.nextNode();
    }
    return len;
  } catch {
    return -1;
  }
}

function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?])\s+(?=["“'(A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text];
}

function sentenceIndex(
  sentences: string[],
  term: string,
  offset: number,
): number {
  if (offset >= 0) {
    let cursor = 0;
    for (let i = 0; i < sentences.length; i += 1) {
      const len = sentences[i]!.length;
      if (offset <= cursor + len + 1) return i;
      cursor += len + 1;
    }
  }

  const hit = sentences.findIndex((sentence) => sentence.includes(term));
  if (hit >= 0) return hit;
  return 0;
}

function cleanProse(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCode(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

function capAtSentence(value: string, max: number): string {
  if (value.length <= max) return value;
  const sliced = value.slice(0, max);
  const cut = Math.max(
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf("? "),
    sliced.lastIndexOf("! "),
  );
  if (cut > max * 0.5) return sliced.slice(0, cut + 1).trim();
  return clip(value, max);
}
