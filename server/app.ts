import { Hono } from "hono";
import { cors } from "hono/cors";
import { pingOpenAi, streamExplain, streamFollowUp } from "./openai";
import { consumeQuota, getQuota } from "./ratelimit";
import {
  isInstallId,
  parseExplainBody,
  parseFollowUpBody,
} from "./validate";
import { addWaitlistEmail } from "./waitlist";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      if (origin.startsWith("chrome-extension://")) return origin;
      if (origin.startsWith("http://127.0.0.1")) return origin;
      if (origin.startsWith("http://localhost")) return origin;
      if (origin === "https://asif-reh.github.io") return origin;
      return origin;
    },
    allowHeaders: ["Content-Type", "X-Install-Id"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installIdFrom(request: Request): string | null {
  const value = request.headers.get("X-Install-Id")?.trim() ?? "";
  return isInstallId(value) ? value : null;
}

function pipeOpenAi(upstream: Response): Response {
  if (!upstream.body) {
    return jsonError(502, "NETWORK", "OpenAI returned an empty response.");
  }
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

app.get("/", (c) =>
  c.json({
    name: "Context-X API",
    health: "/v1/health",
    site: "https://asif-reh.github.io/Context-X/",
  }),
);

app.get("/v1/health", (c) => {
  const configured = Boolean(process.env.OPENAI_API_KEY?.trim());
  return c.json({ ok: configured, hosted: true });
});

app.get("/v1/quota", async (c) => {
  const installId = installIdFrom(c.req.raw);
  if (!installId) {
    return jsonError(400, "INVALID_KEY", "Missing or invalid install id.");
  }
  return c.json(await getQuota(installId));
});

app.post("/v1/waitlist", async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return jsonError(400, "BAD_RESPONSE", "Email is required.");
  }
  const email =
    typeof raw === "object" && raw !== null
      ? String((raw as { email?: unknown }).email ?? "")
      : "";
  const result = await addWaitlistEmail(email);
  if (!result.ok) {
    return jsonError(400, "BAD_RESPONSE", result.message);
  }
  return c.json({ ok: true });
});

app.post("/v1/explain", async (c) => {
  const installId = installIdFrom(c.req.raw);
  if (!installId) {
    return jsonError(400, "INVALID_KEY", "Missing or invalid install id.");
  }

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return jsonError(400, "BAD_RESPONSE", "Request body must be JSON.");
  }

  const body = parseExplainBody(raw);
  if (!body) {
    return jsonError(400, "BAD_RESPONSE", "Highlight a short term and try again.");
  }

  const quota = await consumeQuota(installId);
  if (!quota) {
    return jsonError(
      429,
      "QUOTA",
      "You've used today's 20 free explanations. Come back tomorrow, or add your own OpenAI key in Settings for unlimited use.",
    );
  }

  try {
    const upstream = await streamExplain(body);
    if (!upstream.ok) {
      return jsonError(
        upstream.status,
        upstream.status === 429 ? "RATE_LIMIT" : "UNKNOWN",
        "The explanation service is busy. Tap Retry in a moment.",
      );
    }
    return pipeOpenAi(upstream);
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_SERVER_KEY") {
      return jsonError(
        503,
        "NO_API_KEY",
        "Context-X is not configured on the server yet.",
      );
    }
    return jsonError(502, "NETWORK", "Could not reach OpenAI from the server.");
  }
});

app.post("/v1/follow-up", async (c) => {
  const installId = installIdFrom(c.req.raw);
  if (!installId) {
    return jsonError(400, "INVALID_KEY", "Missing or invalid install id.");
  }

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return jsonError(400, "BAD_RESPONSE", "Request body must be JSON.");
  }

  const body = parseFollowUpBody(raw);
  if (!body) {
    return jsonError(400, "BAD_RESPONSE", "That follow-up could not be sent.");
  }

  const quota = await consumeQuota(installId);
  if (!quota) {
    return jsonError(
      429,
      "QUOTA",
      "You've used today's 20 free explanations. Come back tomorrow, or add your own OpenAI key in Settings for unlimited use.",
    );
  }

  try {
    const upstream = await streamFollowUp(body);
    if (!upstream.ok) {
      return jsonError(
        upstream.status,
        upstream.status === 429 ? "RATE_LIMIT" : "UNKNOWN",
        "The explanation service is busy. Tap Retry in a moment.",
      );
    }
    return pipeOpenAi(upstream);
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_SERVER_KEY") {
      return jsonError(
        503,
        "NO_API_KEY",
        "Context-X is not configured on the server yet.",
      );
    }
    return jsonError(502, "NETWORK", "Could not reach OpenAI from the server.");
  }
});

app.post("/v1/test", async (c) => {
  try {
    const ok = await pingOpenAi();
    if (!ok) {
      return jsonError(401, "INVALID_KEY", "The server OpenAI key was not accepted.");
    }
    return c.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_SERVER_KEY") {
      return jsonError(
        503,
        "NO_API_KEY",
        "Context-X is not configured on the server yet.",
      );
    }
    return jsonError(502, "NETWORK", "Could not reach OpenAI from the server.");
  }
});

export default app;
