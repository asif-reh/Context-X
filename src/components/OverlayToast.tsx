import { useEffect, type JSX } from "react";
import { cn } from "@/lib/utils";

interface OverlayToastProps {
  message: string;
  onDone: () => void;
}

/** Brief, non-blocking notice — used when the shortcut fires with no selection. */
export function OverlayToast({
  message,
  onDone,
}: OverlayToastProps): JSX.Element {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      role="status"
      className={cn(
        "cx-toast pointer-events-none fixed bottom-8 left-1/2 z-[2147483647]",
        "-translate-x-1/2 rounded-full border border-white/12 bg-zinc-950/94",
        "px-3.5 py-2 text-[12px] font-medium text-zinc-100 shadow-lg backdrop-blur-md",
      )}
    >
      {message}
    </div>
  );
}
