import type { CompletionUsage } from "./pricing";

const USAGE_KEY = "usageRecords";
const MAX_RECORDS = 200;
const PREVIEW_CHARS = 80;

export interface UsageRecord extends CompletionUsage {
  id: string;
  timestamp: number;
  preview: string;
}

export interface UsageSummary {
  monthLabel: string;
  explanationCount: number;
  totalCostUsd: number;
  averageCostUsd: number;
  recent: UsageRecord[];
}

function previewText(selected: string): string {
  const trimmed = selected.replace(/\s+/g, " ").trim();
  if (trimmed.length <= PREVIEW_CHARS) return trimmed;
  return `${trimmed.slice(0, PREVIEW_CHARS - 1).trimEnd()}…`;
}

function isRecord(value: unknown): value is UsageRecord {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Partial<UsageRecord>;
  return (
    typeof row.id === "string" &&
    typeof row.timestamp === "number" &&
    typeof row.preview === "string" &&
    typeof row.inputTokens === "number" &&
    typeof row.outputTokens === "number" &&
    typeof row.costUsd === "number"
  );
}

export async function getUsageRecords(): Promise<UsageRecord[]> {
  const stored = await chrome.storage.local.get(USAGE_KEY);
  const raw = stored[USAGE_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord);
}

export async function recordExplanationUsage(args: {
  selectedText: string;
  usage: CompletionUsage;
  timestamp?: number;
}): Promise<UsageRecord> {
  const entry: UsageRecord = {
    id: crypto.randomUUID(),
    timestamp: args.timestamp ?? Date.now(),
    preview: previewText(args.selectedText),
    inputTokens: args.usage.inputTokens,
    outputTokens: args.usage.outputTokens,
    costUsd: args.usage.costUsd,
  };

  const existing = await getUsageRecords();
  const next = [entry, ...existing].slice(0, MAX_RECORDS);
  await chrome.storage.local.set({ [USAGE_KEY]: next });
  return entry;
}

export function isSameLocalMonth(timestamp: number, now: number): boolean {
  const a = new Date(timestamp);
  const b = new Date(now);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function summarizeUsage(
  records: UsageRecord[],
  now = Date.now(),
): UsageSummary {
  const month = records.filter((row) => isSameLocalMonth(row.timestamp, now));
  const totalCostUsd = month.reduce((sum, row) => sum + row.costUsd, 0);
  const explanationCount = month.length;

  return {
    monthLabel: new Date(now).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    }),
    explanationCount,
    totalCostUsd,
    averageCostUsd:
      explanationCount === 0 ? 0 : totalCostUsd / explanationCount,
    recent: records.slice(0, 12),
  };
}
