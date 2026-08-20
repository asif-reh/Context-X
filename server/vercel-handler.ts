import { getRequestListener } from "@hono/node-server";
import app from "./app";

/**
 * Bundled into api/index.js for Vercel. Classic Node functions use
 * IncomingMessage; getRequestListener adapts them to fetch().
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
