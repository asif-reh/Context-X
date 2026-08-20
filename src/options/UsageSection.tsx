import { useEffect, useState, type JSX } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatUsd } from "@/lib/pricing";
import {
  getUsageRecords,
  summarizeUsage,
  type UsageRecord,
  type UsageSummary,
} from "@/lib/usage";

function formatRelative(timestamp: number, now: number): string {
  const delta = Math.max(0, now - timestamp);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function UsageSection(): JSX.Element {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const records = await getUsageRecords();
      if (!cancelled) setSummary(summarizeUsage(records, Date.now()));
    }

    void load();

    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ): void => {
      if (area === "local" && changes.usageRecords) void load();
    };

    chrome.storage.onChanged.addListener(onChange);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);

  const stats = summary ?? {
    monthLabel: new Date(now).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    }),
    explanationCount: 0,
    totalCostUsd: 0,
    averageCostUsd: 0,
    recent: [] as UsageRecord[],
  };

  return (
    <Card className="gap-5 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-[15px]">This month</CardTitle>
        <CardDescription>
          {stats.monthLabel} · estimated from gpt-4o-mini rates, stored only on
          this device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Explanations" value={String(stats.explanationCount)} />
          <Stat label="Est. cost" value={formatUsd(stats.totalCostUsd)} />
          <Stat
            label="Avg / explain"
            value={
              stats.explanationCount === 0
                ? "—"
                : formatUsd(stats.averageCostUsd)
            }
          />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Recent
          </p>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No explanations yet on this device.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recent.map((row) => (
                <li
                  key={row.id}
                  className="flex items-baseline gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <p className="min-w-0 flex-1 truncate font-mono text-[13px]">
                    {row.preview}
                  </p>
                  <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {formatUsd(row.costUsd)}
                  </p>
                  <p className="w-14 shrink-0 text-right text-[11px] text-muted-foreground">
                    {formatRelative(row.timestamp, now)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums">{value}</p>
    </div>
  );
}
