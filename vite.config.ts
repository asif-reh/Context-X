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
 * `OPENAI_API_KEY` from `.env` is inlined only during `npm run dev`.
 * Production builds never embed the key — users enter it in Settings.
 */
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const openaiApiKey =
    command === "serve"
      ? (env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || "").trim()
      : "";

  return {
    plugins: [react(), tailwindcss(), crx({ manifest })],
    define: {
      "import.meta.env.VITE_OPENAI_API_KEY": JSON.stringify(openaiApiKey),
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
