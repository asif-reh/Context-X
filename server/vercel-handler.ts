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
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: request.headers,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }
  return app.fetch(new Request(url, init));
});
