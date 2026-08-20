import { useState, type FormEvent, type JSX } from "react";
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Highlighter,
  Keyboard,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setOnboardingComplete } from "@/lib/onboarding";
import { testApiKey } from "@/lib/openai";
import { shortcutLabel } from "@/lib/shortcut";
import { saveSettings } from "@/lib/storage";
import type { Settings } from "@/lib/types";

interface OnboardingProps {
  settings: Settings;
  onComplete: (settings: Settings) => void;
}

type Step = 0 | 1 | 2;

export function Onboarding({
  settings,
  onComplete,
}: OnboardingProps): JSX.Element {
  const [step, setStep] = useState<Step>(0);
  const [apiKey, setApiKey] = useState(settings.openaiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keys = shortcutLabel();

  async function finish(next: Settings): Promise<void> {
    await setOnboardingComplete();
    onComplete(next);
  }

  async function handleSaveKey(event: FormEvent): Promise<void> {
    event.preventDefault();
    const key = apiKey.trim();
    if (!key) {
      setError("Paste your OpenAI API key to continue, or skip for now.");
      return;
    }
    setBusy(true);
    setError(null);
    const next = { ...settings, openaiApiKey: key };
    await saveSettings(next);
    const result = await testApiKey(key, settings.model);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await finish(next);
  }

  async function handleSkip(): Promise<void> {
    await finish(settings);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,oklch(0.45_0.18_292/0.28),transparent_70%)]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center px-4 py-12">
        <div key={step} className="cx-welcome-in">
          {step === 0 ? (
            <WelcomeStep onNext={() => setStep(1)} />
          ) : null}
          {step === 1 ? (
            <ExampleStep shortcut={keys} onNext={() => setStep(2)} />
          ) : null}
          {step === 2 ? (
            <KeyStep
              apiKey={apiKey}
              showKey={showKey}
              busy={busy}
              error={error}
              onApiKeyChange={setApiKey}
              onToggleShow={() => setShowKey((value) => !value)}
              onSubmit={(event) => void handleSaveKey(event)}
              onSkip={() => void handleSkip()}
            />
          ) : null}
        </div>

        <div
          className="mt-8 flex items-center justify-center gap-2"
          aria-label={`Step ${step + 1} of 3`}
        >
          {([0, 1, 2] as const).map((index) => (
            <span
              key={index}
              className={
                index === step
                  ? "h-1.5 w-6 rounded-full bg-primary"
                  : "size-1.5 rounded-full bg-muted-foreground/35"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }): JSX.Element {
  return (
    <div className="text-center">
      <BrandMark size={48} className="mx-auto shadow-lg" />
      <p className="mt-5 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
        Context-X
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Technical terms, explained in place.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Highlight a word on any page. Context-X reads the nearby sentences and
        returns a definition, a page-aware explanation, and a short analogy.
      </p>
      <Button type="button" className="mt-8 w-full" onClick={onNext}>
        Get started
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function ExampleStep({
  shortcut,
  onNext,
}: {
  shortcut: string;
  onNext: () => void;
}): JSX.Element {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">How it works</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Three steps. About a second of your time, whenever a term is unclear.
      </p>

      <ExamplePreview shortcut={shortcut} />

      <ol className="mt-5 space-y-3">
        <HowRow
          icon={<Highlighter className="size-3.5" />}
          title="Highlight a term"
          body="Select a word or short phrase on the page."
        />
        <HowRow
          icon={<Sparkles className="size-3.5" />}
          title="Click Explain"
          body={`The chip appears beside the selection. Or press ${shortcut}.`}
        />
        <HowRow
          icon={<Keyboard className="size-3.5" />}
          title="Read, then ask"
          body="Definition, context, analogy — plus a short follow-up if you need it."
        />
      </ol>

      <Button type="button" className="mt-6 w-full" onClick={onNext}>
        Add your API key
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function HowRow({
  icon,
  title,
  body,
}: {
  icon: JSX.Element;
  title: string;
  body: string;
}): JSX.Element {
  return (
    <li className="flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-secondary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

function ExamplePreview({ shortcut }: { shortcut: string }): JSX.Element {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border bg-zinc-950 text-zinc-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
        <p className="text-[11px] text-zinc-500">docs.example.com</p>
        <p className="text-[10px] tracking-wide text-zinc-600">{shortcut}</p>
      </div>
      <p className="px-3 pt-3 text-[13px] leading-relaxed text-zinc-400">
        The service is limited by{" "}
        <span className="rounded-sm bg-violet-500/25 px-1 py-0.5 font-medium text-violet-100">
          throughput
        </span>
        <span className="ml-2 inline-flex h-6 items-center gap-1 rounded-full border border-white/12 bg-zinc-900 px-2 align-middle text-[11px] font-medium">
          <Sparkles className="size-3 text-violet-400" />
          Explain
        </span>
      </p>
      <div className="m-3 rounded-lg border border-white/10 bg-zinc-900/90 px-3 py-2.5">
        <p className="text-[10px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
          Definition
        </p>
        <p className="mt-1 text-[12.5px] leading-snug text-zinc-200">
          How much work a system can finish in a given time.
        </p>
        <p className="mt-2.5 text-[10px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
          On this page
        </p>
        <p className="mt-1 text-[12.5px] leading-snug text-zinc-300">
          Here it means the API’s request capacity — not network bandwidth.
        </p>
      </div>
    </div>
  );
}

function KeyStep({
  apiKey,
  showKey,
  busy,
  error,
  onApiKeyChange,
  onToggleShow,
  onSubmit,
  onSkip,
}: {
  apiKey: string;
  showKey: boolean;
  busy: boolean;
  error: string | null;
  onApiKeyChange: (value: string) => void;
  onToggleShow: () => void;
  onSubmit: (event: FormEvent) => void;
  onSkip: () => void;
}): JSX.Element {
  return (
    <form onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold tracking-tight">Add your OpenAI key</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Context-X calls OpenAI from the background worker. The key stays in your
        Chrome profile and is never sent to us. Get one from{" "}
        <a
          className="text-primary underline-offset-4 hover:underline"
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
        >
          platform.openai.com/api-keys
        </a>
        .
      </p>

      <div className="mt-5 space-y-2">
        <Label htmlFor="onboarding-key">API key</Label>
        <div className="relative">
          <Input
            id="onboarding-key"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            type={showKey ? "text" : "password"}
            placeholder="sk-..."
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
            className="pr-10 font-mono"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1 right-1 text-muted-foreground"
            onClick={onToggleShow}
            aria-label={showKey ? "Hide API key" : "Show API key"}
          >
            {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="mt-6 w-full" disabled={busy}>
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        {busy ? "Checking key" : "Save and continue"}
      </Button>
      <button
        type="button"
        onClick={onSkip}
        disabled={busy}
        className="mt-3 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        I’ll add this later
      </button>
    </form>
  );
}
