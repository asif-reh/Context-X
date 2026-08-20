import type { JSX, MouseEvent } from "react";
import { cn } from "@/lib/utils";
import type { QuickAction } from "@/lib/quickActions";

interface QuickActionsProps {
  actions: QuickAction[];
  disabled: boolean;
  onAction: (prompt: string, label: string) => void;
}

/** Compact chips under the explanation — one click, same follow-up path. */
export function QuickActions({
  actions,
  disabled,
  onAction,
}: QuickActionsProps): JSX.Element | null {
  if (actions.length === 0) return null;

  function keepSelection(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div className="flex flex-wrap gap-1.5 border-t border-white/8 px-3.5 py-2">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={disabled}
          onMouseDown={keepSelection}
          onClick={(event) => {
            keepSelection(event);
            if (disabled) return;
            onAction(action.prompt, action.label);
          }}
          className={cn(
            "h-6 rounded-full border border-white/12 bg-white/[0.04] px-2.5",
            "text-[11px] font-medium tracking-wide text-zinc-300",
            "transition-colors duration-150",
            "hover:border-violet-400/40 hover:bg-white/[0.08] hover:text-zinc-50",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/12 disabled:hover:bg-white/[0.04] disabled:hover:text-zinc-300",
            "focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:outline-none",
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
