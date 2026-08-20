import { useEffect, useRef, type JSX } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FollowUpTurn } from "@/lib/types";

interface FollowUpChatProps {
  turns: FollowUpTurn[];
}

/** Compact Q&A thread pinned above the composer — not a full chatbot. */
export function FollowUpChat({ turns }: FollowUpChatProps): JSX.Element | null {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  if (turns.length === 0) return null;

  return (
    <div className="border-t border-white/8">
      <p className="px-3.5 pt-2 text-[10px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
        Follow-up
      </p>
      <div className="cx-chat cx-scroll max-h-[148px] space-y-2 overflow-y-auto px-3.5 py-2">
        {turns.map((turn) => (
          <FollowUpTurnView key={turn.id} turn={turn} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function FollowUpTurnView({ turn }: { turn: FollowUpTurn }): JSX.Element {
  return (
    <div className="space-y-1.5">
      <p className="ml-8 rounded-2xl rounded-br-md bg-white/8 px-2.5 py-1.5 text-[12.5px] leading-snug text-zinc-100">
        {turn.question}
      </p>
      {turn.pending && !turn.answer ? (
        <div className="flex items-center gap-1.5 text-[12px] text-zinc-500">
          <Sparkles className="size-3 animate-pulse text-violet-400" />
          Thinking
        </div>
      ) : (
        <p
          className={cn(
            "mr-4 text-[12.5px] leading-[1.5] text-zinc-200",
            turn.pending && turn.answer && "cx-caret",
          )}
        >
          {turn.answer}
        </p>
      )}
    </div>
  );
}
