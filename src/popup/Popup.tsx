import { useEffect, useState, type JSX, type ReactNode } from "react";
import { Highlighter, Keyboard, Settings, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchHostedHealth } from "@/lib/quota";
import { shortcutLabel } from "@/lib/shortcut";
import { hasApiKey } from "@/lib/storage";
import { subscribeTheme } from "@/lib/theme";

export function Popup(): JSX.Element {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      if (await hasApiKey()) {
        setReady(true);
        return;
      }
      setReady(await fetchHostedHealth());
    })();
    return subscribeTheme(() => undefined);
  }, []);

  const keys = shortcutLabel();

  return (
    <div className="w-[320px] bg-background text-foreground">
      <div className="relative overflow-hidden px-3.5 pt-3.5 pb-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120px_80px_at_0%_0%,oklch(0.55_0.2_292/0.22),transparent_70%)]"
        />
        <div className="relative flex items-center gap-2.5">
          <BrandMark size={28} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[13px] font-semibold tracking-tight">
              Context-X
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Explain any term in context
            </p>
          </div>
          {ready === null ? (
            <span className="h-5 w-14 animate-pulse rounded-full bg-muted" />
          ) : ready ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              Ready
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300">
              API offline
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2.5 border-t border-border px-3.5 py-3">
        <Step
          icon={<Highlighter className="size-3.5" />}
          title="Highlight"
          body="Select a word or short phrase on the page."
        />
        <Step
          icon={<Sparkles className="size-3.5" />}
          title="Explain"
          body="Click the chip, or press the shortcut."
        />
        <Step
          icon={<Keyboard className="size-3.5" />}
          title={keys}
          body="Opens the explanation for the current selection."
        />
      </div>

      <div className="border-t border-border px-3.5 py-3">
        <Button
          type="button"
          className="w-full"
          size="sm"
          variant={ready ? "outline" : "default"}
          onClick={() => {
            void chrome.runtime.openOptionsPage();
          }}
        >
          <Settings className="size-3.5" />
          {ready ? "Settings" : "Open settings"}
        </Button>
      </div>
    </div>
  );
}

function Step({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}): JSX.Element {
  return (
    <div className="flex gap-2.5">
      <div className="mt-px flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
