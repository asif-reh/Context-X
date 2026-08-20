import { getHostedApiUrl, isHostedMode } from "./hosted";
import { getOrCreateInstallId } from "./installId";
import { DAILY_EXPLAIN_LIMIT } from "./limits";

export interface HostedQuota {
  used: number;
  limit: number;
  remaining: number;
  day: string;
}

export async function fetchHostedQuota(): Promise<HostedQuota | null> {
  if (!isHostedMode()) return null;
  try {
    const installId = await getOrCreateInstallId();
    const response = await fetch(`${getHostedApiUrl()}/v1/quota`, {
      headers: { "X-Install-Id": installId },
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    if (typeof json !== "object" || json === null) return null;
    const row = json as Record<string, unknown>;
    if (
      typeof row.used !== "number" ||
      typeof row.limit !== "number" ||
      typeof row.remaining !== "number"
    ) {
      return null;
    }
    return {
      used: row.used,
      limit: row.limit,
      remaining: row.remaining,
      day: typeof row.day === "string" ? row.day : "",
    };
  } catch {
    return null;
  }
}

export async function fetchHostedHealth(): Promise<boolean> {
  if (!isHostedMode()) return false;
  try {
    const response = await fetch(`${getHostedApiUrl()}/v1/health`, {
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) return false;
    const json: unknown = await response.json();
    return (
      typeof json === "object" &&
      json !== null &&
      (json as { ok?: unknown }).ok === true
    );
  } catch {
    return false;
  }
}

export { DAILY_EXPLAIN_LIMIT };
