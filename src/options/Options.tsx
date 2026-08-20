import { useEffect, useState, type FormEvent, type JSX, type ReactNode } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Highlighter,
  LoaderCircle,
  MessageCircle,
  Moon,
  Shield,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { testApiKey } from "@/lib/openai";
import { shortcutLabel } from "@/lib/shortcut";
import { getOnboardingComplete } from "@/lib/onboarding";
import { DEFAULT_SETTINGS, getSettings, saveSettings, saveTheme } from "@/lib/storage";
import { applyTheme, subscribeTheme } from "@/lib/theme";
import { Onboarding } from "./Onboarding";
import { UsageSection } from "./UsageSection";
import type { OpenAIModel, Settings } from "@/lib/types";

type Status =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "testing" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

export function Options(): JSX.Element {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    void Promise.all([getSettings(), getOnboardingComplete()]).then(
      ([value, complete]) => {
        setSettings(value);
        applyTheme(value.theme);
        setOnboarded(complete);
        setLoaded(true);
      },
    );
    return subscribeTheme((theme) => {
      setSettings((current) => ({ ...current, theme }));
    });
  }, []);

  async function handleSave(event: FormEvent): Promise<void> {
    event.preventDefault();
    await saveSettings(settings);
    applyTheme(settings.theme);
    setStatus({ kind: "saved" });
    window.setTimeout(() => {
      setStatus((current) =>
        current.kind === "saved" ? { kind: "idle" } : current,
      );
    }, 2000);
  }

  async function handleTest(): Promise<void> {
    setStatus({ kind: "testing" });
    const result = await testApiKey(settings.openaiApiKey, settings.model);
    if (result.ok) {
      setStatus({ kind: "ok", message: "Connection succeeded." });
      return;
    }
    setStatus({ kind: "error", message: result.message });
  }

  async function handleTheme(dark: boolean): Promise<void> {
    const theme = dark ? "dark" : "light";
    setSettings((current) => ({ ...current, theme }));
    applyTheme(theme);
    await saveTheme(theme);
  }

  const keys = shortcutLabel();

  if (!loaded || onboarded === null) {
    return (
      <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading" />
    );
  }

  if (!onboarded) {
    return (
      <Onboarding
        settings={settings}
        onComplete={(next) => {
          setSettings(next);
          applyTheme(next.theme);
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,oklch(0.45_0.18_292/0.16),transparent_70%)]"
      />
      <div className="relative mx-auto w-full max-w-xl">
        <header className="mb-8 flex items-start gap-3">
          <BrandMark size={40} />
          <div className="min-w-0 pt-0.5">
            <h1 className="text-xl font-semibold tracking-tight">Context-X</h1>
            <p className="text-sm text-muted-foreground">
              Highlight a term, explain it in context, then ask a quick follow-up.
            </p>
          </div>
        </header>

        <Card className="gap-5 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-[15px]">How it works</CardTitle>
            <CardDescription>
              A lightweight technical companion for whatever page you are reading.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 sm:grid-cols-3">
            <HowStep
              icon={<Highlighter className="size-3.5" />}
              title="Highlight"
              body="Select a word or phrase on any webpage."
            />
            <HowStep
              icon={<Sparkles className="size-3.5" />}
              title="Explain"
              body={`Click Explain or press ${keys} for a definition, page-aware explanation, and analogy.`}
            />
            <HowStep
              icon={<MessageCircle className="size-3.5" />}
              title="Follow up"
              body="Ask short questions in the same popup. Context-X keeps the original highlight."
            />
          </CardContent>
        </Card>

        <Card className="mt-5 gap-5 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-[15px]">OpenAI access</CardTitle>
            <CardDescription>
              Paste a secret key from{" "}
              <a
                className="text-primary underline-offset-4 hover:underline"
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
              >
                platform.openai.com/api-keys
              </a>
              . It stays in your Chrome profile and is sent only to OpenAI from
              the background worker.
            </CardDescription>
          </CardHeader>

          <form onSubmit={(event) => void handleSave(event)}>
            <CardContent className="space-y-4 px-5">
              <div className="space-y-2">
                <Label htmlFor="api-key">API key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={!loaded}
                    type={showKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={settings.openaiApiKey}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        openaiApiKey: event.target.value,
                      }))
                    }
                    className="pr-10 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1 right-1 text-muted-foreground"
                    onClick={() => setShowKey((value) => !value)}
                    aria-label={showKey ? "Hide API key" : "Show API key"}
                  >
                    {showKey ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <select
                  id="model"
                  disabled={!loaded}
                  value={settings.model}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      model: event.target.value as OpenAIModel,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="gpt-4o-mini">
                    gpt-4o-mini — fast & inexpensive
                  </option>
                  <option value="gpt-4o">gpt-4o — higher quality</option>
                </select>
              </div>

              {status.kind === "error" ? (
                <p className="text-sm text-destructive">{status.message}</p>
              ) : null}
              {status.kind === "ok" ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {status.message}
                </p>
              ) : null}
            </CardContent>

            <CardFooter className="mt-5 justify-between gap-3 px-5">
              <Button
                type="button"
                variant="outline"
                disabled={!loaded || status.kind === "testing"}
                onClick={() => void handleTest()}
              >
                {status.kind === "testing" ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                Test connection
              </Button>
              <Button type="submit" disabled={!loaded}>
                {status.kind === "saved" ? (
                  <>
                    <Check className="size-4" />
                    Saved
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="mt-5 gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-[15px]">Appearance</CardTitle>
            <CardDescription>
              Applies to this settings page and the toolbar popup. The on-page
              overlay stays dark so it remains readable on any site.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <Moon className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Dark mode</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.theme === "dark" ? "On" : "Off"}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.theme === "dark"}
                disabled={!loaded}
                label="Dark mode"
                onCheckedChange={(checked) => {
                  void handleTheme(checked);
                }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-5">
          <UsageSection />
        </div>

        <div className="mt-8 flex gap-3 text-sm text-muted-foreground">
          <Shield className="mt-0.5 size-4 shrink-0" />
          <p>
            Your API key is sent only to{" "}
            <span className="text-foreground">api.openai.com</span>. Usage
            history stays in this browser. Shortcut: {keys}.
          </p>
        </div>
      </div>
    </div>
  );
}

function HowStep({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-3 py-3">
      <div className="mb-2 flex size-7 items-center justify-center rounded-md border border-border bg-background">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
