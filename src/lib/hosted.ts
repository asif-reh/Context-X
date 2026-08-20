import { DEFAULT_API_ORIGIN } from "./limits";

export function getHostedApiUrl(): string {
  const value = import.meta.env.VITE_CONTEXT_X_API_URL;
  const raw =
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : DEFAULT_API_ORIGIN;
  return raw.replace(/\/$/, "");
}

export function isHostedMode(): boolean {
  return getHostedApiUrl().length > 0;
}
