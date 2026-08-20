import { serve } from "@hono/node-server";
import { DEFAULT_API_PORT } from "../src/lib/limits";
import app from "./app";

const port = Number.parseInt(process.env.PORT ?? String(DEFAULT_API_PORT), 10);

if (!process.env.VERCEL) {
  serve({ fetch: app.fetch, hostname: "0.0.0.0", port }, (info) => {
    console.log(`Context-X API listening on http://127.0.0.1:${info.port}`);
  });
}

export default app;
