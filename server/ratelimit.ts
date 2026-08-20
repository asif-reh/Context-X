import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DAILY_EXPLAIN_LIMIT } from "../src/lib/limits";

const dataDir = process.env.VERCEL
  ? "/tmp/context-x"
  : path.join(path.dirname(fileURLToPath(import.meta.url)), ".data");
const quotaFile = path.join(dataDir, "quota.json");

interface QuotaFile {
  [installId: string]: { day: string; count: number };
}

export interface QuotaSnapshot {
  used: number;
  limit: number;
  remaining: number;
  day: string;
}

function utcDay(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

async function load(): Promise<QuotaFile> {
  try {
    const raw = await readFile(quotaFile, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as QuotaFile;
  } catch {
    return {};
  }
}

async function save(data: QuotaFile): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await writeFile(quotaFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function snapshotFor(row: { day: string; count: number } | undefined): QuotaSnapshot {
  const day = utcDay();
  const used = row && row.day === day ? row.count : 0;
  return {
    used,
    limit: DAILY_EXPLAIN_LIMIT,
    remaining: Math.max(0, DAILY_EXPLAIN_LIMIT - used),
    day,
  };
}

export async function getQuota(installId: string): Promise<QuotaSnapshot> {
  const data = await load();
  return snapshotFor(data[installId]);
}

/** Increments usage. Returns null when the daily cap is already reached. */
export async function consumeQuota(
  installId: string,
): Promise<QuotaSnapshot | null> {
  const data = await load();
  const day = utcDay();
  const current = data[installId];
  const used = current && current.day === day ? current.count : 0;
  if (used >= DAILY_EXPLAIN_LIMIT) {
    return null;
  }
  const next = { day, count: used + 1 };
  data[installId] = next;
  await save(data);
  return snapshotFor(next);
}
