import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  Clock,
  Copy,
  KeyRound,
  Lightbulb,
  Quote,
  RefreshCw,
  Settings,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { FollowUpBar } from "@/components/FollowUpBar";
import { FollowUpChat } from "@/components/FollowUpChat";
import { QuickActions } from "@/components/QuickActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { copyText } from "@/lib/clipboard";
import { formatCostHint } from "@/lib/pricing";
import {
  activeStreamingSection,
  formatExplanation,
  hasAnySection,
} from "@/lib/parseExplanation";
import { PANEL_WIDTH, placePanel } from "@/lib/position";
import { cn } from "@/lib/utils";
import {
  MAX_FOLLOW_UPS,
  type AnchorRect,
  type ExplainFailure,
  type Explanation,
  type FollowUpTurn,
  type OverlayPosition,
} from "@/lib/types";
import type { QuickAction } from "@/lib/quickActions";

interface ExplanationPanelProps {
  term: string;
  anchor: AnchorRect;
  loading: boolean;
  streaming: boolean;
  explanation: Explanation | null;
  error: ExplainFailure | null;
  followUps: FollowUpTurn[];
  costUsd: number | null;
  closing: boolean;
  onClose: () => void;
  onFollowUp: (question: string, displayText?: string) => void;
  onOpenSettings: () => void;
  onRegenerate: () => void;
  quickActions: QuickAction[];
}

export function ExplanationPanel({
  term,
  anchor,
  loading,
  streaming,
  explanation,
  error,
  followUps,
  costUsd,
  closing,
  onClose,
  onFollowUp,
  onOpenSettings,
  onRegenerate,
  quickActions,
}: ExplanationPanelProps): JSX.Element {
  const panelRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<OverlayPosition>(() =>
    placePanel(anchor, { width: PANEL_WIDTH, height: 360 }),
  );
  const [copied, setCopied] = useState(false);
  const displayTerm = explanation?.term || term;
  const canCopy = hasAnySection(explanation);
  const followUpReady =
    Boolean(explanation?.definition) && !loading && !streaming && !error;
  const followUpPending = followUps.some((turn) => turn.pending);
  const followUpCapped = followUps.length >= MAX_FOLLOW_UPS;
  const busy = loading || streaming;
  const statusLabel = loading
    ? "Reading the page"
    : streaming
      ? "Writing"
      : null;

  useLayoutEffect(() => {
    const place = (): void => {
      const node = panelRef.current;
      const height = node?.offsetHeight ?? 360;
      setPosition(placePanel(anchor, { width: PANEL_WIDTH, height }));
    };

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor, loading, streaming, explanation, error, followUps.length]);

  useEffect(() => {
    if (loading) setCopied(false);
  }, [loading, term]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  function keepPageSelection(event: MouseEvent<HTMLElement>): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea")) return;
    event.preventDefault();
  }

  async function handleCopy(): Promise<void> {
    if (!explanation) return;
    const ok = await copyText(formatExplanation(explanation));
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="context-x-term"
      tabIndex={-1}
      onMouseDown={keepPageSelection}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
      }}
      className={cn(
        "cx-panel pointer-events-auto fixed z-[2147483647]",
        closing ? "cx-panel-out" : "cx-panel-in",
        "flex flex-col overflow-hidden rounded-[18px]",
        "border border-white/10 text-zinc-50 shadow-none",
        "backdrop-blur-xl",
        "focus:outline-none",
      )}
    >
      <header className="flex items-start gap-2.5 px-3.5 pt-3 pb-2">
        <BrandMark size={24} />
        <div className="min-w-0 flex-1 pt-px">
          <p className="text-[10px] font-medium tracking-[0.16em] text-zinc-500 uppercase">
            Context-X
          </p>
          <h2
            id="context-x-term"
            className="truncate font-mono text-[13px] font-semibold text-zinc-50"
            title={displayTerm}
          >
            {displayTerm}
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close explanation"
          className="-mr-1 text-zinc-400 hover:text-zinc-50"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex items-center gap-1 px-3.5 pb-2">
        <p className="mr-auto min-h-[16px] text-[11px] tabular-nums text-zinc-500">
          {statusLabel ? (
            <span className="cx-reading">{statusLabel}</span>
          ) : costUsd !== null ? (
            formatCostHint(costUsd)
          ) : null}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={busy || closing || Boolean(error)}
          aria-label="Regenerate explanation"
          className="h-7 gap-1 px-2 text-[11px] text-zinc-400 hover:text-zinc-50"
        >
          <RefreshCw className={cn("size-3", busy && "animate-spin")} />
          Regenerate
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            void handleCopy();
          }}
          disabled={!canCopy || closing}
          aria-label={copied ? "Copied" : "Copy explanation"}
          className="h-7 gap-1 px-2 text-[11px] text-zinc-400 hover:text-zinc-50"
        >
          {copied ? (
            <Check className="size-3 text-emerald-400" />
          ) : (
            <Copy className="size-3" />
          )}
          {copied ? "Copied" : "Copy explanation"}
        </Button>
      </div>

      <Separator className="bg-white/8" />

      <div className="cx-scroll min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        {loading ? <LoadingBody /> : null}
        {!loading && error ? (
          <ErrorBody
            error={error}
            onOpenSettings={onOpenSettings}
            onRetry={onRegenerate}
          />
        ) : null}
        {!loading && !error && explanation ? (
          <ResultBody data={explanation} streaming={streaming} />
        ) : null}
        {!loading && !error && !explanation ? (
          <EmptyBody onRetry={onRegenerate} />
        ) : null}
      </div>

      {followUpReady ? (
        <QuickActions
          actions={quickActions}
          disabled={followUpPending || followUpCapped || closing}
          onAction={onFollowUp}
        />
      ) : null}

      <FollowUpChat turns={followUps} />

      {followUpReady || followUps.length > 0 ? (
        <FollowUpBar
          disabled={!followUpReady || closing}
          pending={followUpPending}
          capped={followUpCapped}
          onSubmit={onFollowUp}
        />
      ) : null}
    </section>
  );
}

function LoadingBody(): JSX.Element {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 1600);
    return () => window.clearInterval(timer);
  }, []);

  const messages = [
    "Reading the page",
    "Gathering nearby context",
    "Writing an explanation",
  ] as const;
  const label = messages[tick % messages.length];

  return (
    <div
      className="space-y-3.5"
      aria-busy="true"
      aria-label="Loading explanation"
    >
      <div className="flex items-center gap-2 text-[12px] text-zinc-400">
        <Sparkles className="cx-sparkle size-3.5 text-violet-400" />
        <span key={label} className="cx-status-in">
          {label}
        </span>
      </div>
      <ShimmerSection label="Definition" wide={false} delay={1} />
      <ShimmerSection label="Context-aware explanation" wide delay={2} />
      <ShimmerSection label="Analogy" wide={false} delay={3} />
    </div>
  );
}

function EmptyBody({ onRetry }: { onRetry: () => void }): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-2.5 py-1">
      <div className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-zinc-400">
        <Sparkles className="size-3.5" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-zinc-100">
          No explanation yet
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
          Nothing came back for this selection. Try again in a moment.
        </p>
      </div>
      <Button type="button" size="sm" onClick={onRetry}>
        <RefreshCw className="size-3.5" />
        Retry
      </Button>
    </div>
  );
}

function ErrorBody({
  error,
  onOpenSettings,
  onRetry,
}: {
  error: ExplainFailure;
  onOpenSettings: () => void;
  onRetry: () => void;
}): JSX.Element {
  const needsKey = error.code === "NO_API_KEY" || error.code === "INVALID_KEY";
  const Icon =
    error.code === "NETWORK"
      ? WifiOff
      : error.code === "TIMEOUT" ||
          error.code === "RATE_LIMIT" ||
          error.code === "QUOTA"
        ? Clock
        : needsKey
          ? KeyRound
          : AlertCircle;

  const title =
    error.code === "NO_API_KEY"
      ? "API not ready"
      : error.code === "INVALID_KEY"
        ? "Check your API key"
        : error.code === "NETWORK"
          ? "Connection problem"
          : error.code === "TIMEOUT"
            ? "That took too long"
            : error.code === "QUOTA"
              ? "Daily free limit reached"
              : error.code === "RATE_LIMIT"
                ? "Please wait a moment"
                : "Could not explain that";

  return (
    <div className="flex flex-col items-start gap-2.5 py-1">
      <div className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-zinc-300">
        <Icon className="size-3.5" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-zinc-100">{title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
          {error.message}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
        {needsKey ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onOpenSettings}
          >
            <Settings className="size-3.5" />
            Open settings
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ShimmerSection({
  label,
  wide,
  delay,
}: {
  label: string;
  wide: boolean;
  delay: 1 | 2 | 3;
}): JSX.Element {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
        {label}
      </p>
      <div className="space-y-1.5">
        <div className={cn("cx-shimmer h-3 w-full rounded-md", `cx-shimmer-d${delay}`)} />
        <div
          className={cn(
            "cx-shimmer h-3 rounded-md",
            wide ? "w-11/12" : "w-2/3",
            `cx-shimmer-d${delay}`,
          )}
        />
        {wide ? (
          <div className={cn("cx-shimmer cx-shimmer-d2 h-3 w-4/5 rounded-md")} />
        ) : null}
      </div>
    </div>
  );
}

function ResultBody({
  data,
  streaming,
}: {
  data: Explanation;
  streaming: boolean;
}): JSX.Element {
  const active = streaming ? activeStreamingSection(data) : null;

  return (
    <div className="space-y-3.5">
      <Section icon={<BookOpen className="size-3.5" />} label="Definition">
        <StreamText text={data.definition} caret={active === "definition"} />
      </Section>

      <Section
        icon={<Lightbulb className="size-3.5" />}
        label="Context-aware explanation"
      >
        <StreamText
          text={data.explanation}
          caret={active === "explanation"}
          placeholder={streaming && !data.explanation && Boolean(data.definition)}
        />
      </Section>

      <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.07] px-2.5 py-2">
        <div className="mb-1 flex items-center gap-1.5">
          <Quote className="size-3.5 text-violet-300" />
          <Badge className="border-violet-500/25 bg-violet-500/15 text-[10px] tracking-wide text-violet-200 uppercase">
            Analogy
          </Badge>
        </div>
        <StreamText
          text={data.analogy}
          caret={active === "analogy"}
          placeholder={streaming && !data.analogy && Boolean(data.explanation)}
        />
      </div>
    </div>
  );
}

function StreamText({
  text,
  caret,
  placeholder = false,
}: {
  text: string;
  caret: boolean;
  placeholder?: boolean;
}): JSX.Element {
  if (!text && (caret || placeholder)) {
    return <div className="cx-shimmer h-3 w-2/3 rounded-md" />;
  }

  return (
    <p
      className={cn(
        "text-[13px] leading-[1.55] text-zinc-200",
        caret && text && "cx-caret",
      )}
    >
      {text}
    </p>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section>
      <div className="mb-1 flex items-center gap-1.5 text-zinc-500">
        {icon}
        <span className="text-[10px] font-medium tracking-[0.14em] uppercase">
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}
