import path from "node:path";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import manifest from "./manifest.config";

/**
 * Context-X Vite config.
 *
 * CRXJS treats `manifest.config.ts` as the extension entry point and
 * bundles the background worker, content script, popup, and options page.
 * Tailwind is compiled via the Vite plugin so content-script CSS can be
 * inlined into Shadow DOM without leaking onto the host page.
 *
 * The OpenAI key lives only in server `.env` (`npm run server`).
 * The extension never embeds it. Optional BYOK still works from Settings.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = (
    env.VITE_CONTEXT_X_API_URL || "http://127.0.0.1:8787"
  ).replace(/\/$/, "");

  return {
    plugins: [react(), tailwindcss(), crx({ manifest })],
    define: {
      "import.meta.env.VITE_CONTEXT_X_API_URL": JSON.stringify(apiUrl),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      cors: {
        origin: [/chrome-extension:\/\//],
      },
    },
    build: {
      sourcemap: false,
      emptyOutDir: true,
    },
  };
});
