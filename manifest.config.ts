import { defineManifest } from "@crxjs/vite-plugin";

/**
 * Chrome Manifest V3 — CRXJS compiles this into dist/manifest.json.
 *
 * Permissions (keep this list minimal for Web Store review):
 * - storage: API key, theme, and local usage history
 * - clipboardWrite: copy explanation from the overlay
 * - host_permissions openai: the background worker is the only caller
 *
 * Icon paths are relative to `public/` (Vite copies that folder to dist root).
 */
export default defineManifest({
  manifest_version: 3,
  name: "Context-X",
  short_name: "Context-X",
  version: "1.0.0",
  description:
    "Highlight any term on the web and get a page-aware AI explanation — definition, context, and analogy in one click.",
  permissions: ["storage", "clipboardWrite"],
  host_permissions: ["https://api.openai.com/*"],
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
