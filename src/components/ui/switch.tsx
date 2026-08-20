import type { JSX } from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

/** Compact accessible toggle — no extra Radix dependency. */
export function Switch({
  checked,
  disabled = false,
  label,
  onCheckedChange,
}: SwitchProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent",
        "transition-colors outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm",
          "transition-transform duration-200 ease-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
