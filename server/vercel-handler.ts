import { getRequestListener } from "@hono/node-server";
import app from "./app";

/**
 * Bundled into api/index.js for Vercel. Classic Node functions use
 * IncomingMessage; getRequestListener adapts them to fetch().
 */
export default getRequestListener(async (request) => {
  const url = new URL(request.url);
  const restored = url.searchParams.get("__path");
  if (restored) {
    url.pathname = restored;
    url.searchParams.delete("__path");
  } else if (url.pathname === "/api" || url.pathname === "/api/") {
    url.pathname = "/";
  }

  const method = request.method.toUpperCase();
  const headers = new Headers(request.headers);
  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.text();

  return app.fetch(
    new Request(url, {
      method,
      headers,
      body: body === undefined || body.length === 0 ? undefined : body,
    }),
  );
});
