import { getRequestListener } from "@hono/node-server";
import app from "../server/app";

/**
 * Classic Vercel Node functions pass IncomingMessage, not a Web Request.
 * Hono's vercel `handle()` expects fetch Request, which crashes here.
 */
export default getRequestListener((request) => {
  const url = new URL(request.url);
  const restored = url.searchParams.get("__path");
  if (restored) {
    url.pathname = restored;
    url.searchParams.delete("__path");
  } else if (url.pathname === "/api" || url.pathname === "/api/") {
    url.pathname = "/";
  }
  return app.fetch(new Request(url, request));
});
