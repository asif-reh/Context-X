import { Hono } from "hono";
import { handle } from "hono/vercel";
import app from "../server/app";

const vercelApp = new Hono();
vercelApp.route("/api", app);

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

export default handle(vercelApp);
