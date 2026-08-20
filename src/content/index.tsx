import { createRoot } from "react-dom/client";
import { HOST_ID } from "@/lib/selection";
import { ContentApp } from "./ContentApp";
import styles from "./styles.css?inline";

/**
 * Mount the React overlay inside an open Shadow Root.
 *
 * Why Shadow DOM:
 * - Host pages ship wildly different (and often aggressive) CSS.
 * - A shadow tree with inlined Tailwind keeps Grammarly-style UI isolated.
 * - The host is `pointer-events: none` (children opt back in) so page
 *   clicks pass through except on the chip and panel.
 *
 * Only one host is allowed. Extra nodes (HMR, SPA clones, double-inject)
 * are removed before mount.
 */
function mount(): void {
  const extras = document.querySelectorAll(`#${HOST_ID}`);
  extras.forEach((node, index) => {
    if (index > 0) node.remove();
  });

  const existing = document.getElementById(HOST_ID);
  if (existing?.shadowRoot?.querySelector("[data-context-x='app']")) return;
  existing?.remove();

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.setAttribute("data-context-x", "root");
  Object.assign(host.style, {
    position: "fixed",
    inset: "0px",
    width: "0px",
    height: "0px",
    zIndex: "2147483647",
    pointerEvents: "none",
    overflow: "visible",
  } satisfies Partial<CSSStyleDeclaration>);

  const shadow = host.attachShadow({ mode: "open" });

  const sheet = document.createElement("style");
  sheet.textContent = styles;
  shadow.appendChild(sheet);

  const root = document.createElement("div");
  root.id = "context-x-root";
  root.className = "dark";
  root.setAttribute("data-context-x", "app");
  shadow.appendChild(root);

  document.documentElement.appendChild(host);
  try {
    createRoot(root).render(<ContentApp />);
  } catch {
    host.remove();
  }
}

try {
  mount();
} catch {
  // A hostile page can throw on DOM writes; fail closed instead of breaking the site.
}
