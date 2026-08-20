import { defineManifest } from "@crxjs/vite-plugin";
import { DEFAULT_API_ORIGIN } from "./src/lib/limits";

function apiHostPermissions(): string[] {
  const raw = process.env.VITE_CONTEXT_X_API_URL || DEFAULT_API_ORIGIN;
  let origin = DEFAULT_API_ORIGIN;
  try {
    origin = new URL(raw).origin;
  } catch {
    origin = DEFAULT_API_ORIGIN;
  }
  return [
    ...new Set([
      "https://api.openai.com/*",
      `${origin}/*`,
      "http://127.0.0.1:8787/*",
      "http://localhost:8787/*",
    ]),
  ];
}

/**
 * Chrome Manifest V3 — CRXJS compiles this into dist/manifest.json.
 *
 * Permissions (keep this list minimal for Web Store review):
 * - storage: theme, optional BYOK key, local usage
 * - clipboardWrite: copy explanation from the overlay
 * - host_permissions: OpenAI (BYOK) and the Context-X API (hosted)
 */
export default defineManifest({
  manifest_version: 3,
  name: "Context-X",
  short_name: "Context-X",
  version: "1.1.0",
  description:
    "Highlight any term on the web and get a page-aware AI explanation — definition, context, and analogy in one click.",
  permissions: ["storage", "clipboardWrite"],
  host_permissions: apiHostPermissions(),
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  action: {
    default_title: "Context-X — explain this page",
    default_popup: "src/popup/index.html",
    default_icon: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
  options_ui: {
    page: "src/options/index.html",
    open_in_tab: true,
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
    },
  ],
  commands: {
    "explain-selection": {
      suggested_key: {
        default: "Alt+X",
        mac: "Alt+X",
      },
      description: "Explain the currently selected text",
    },
  },
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
  minimum_chrome_version: "116",
});
