import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type MouseEvent,
} from "react";
import { BrandMark } from "@/components/BrandMark";
import { BUTTON_FALLBACK, placeButton } from "@/lib/position";
import { cn } from "@/lib/utils";
import type { AnchorRect, OverlayPosition } from "@/lib/types";

interface ExplainButtonProps {
  anchor: AnchorRect;
  onClick: () => void;
}

const ORIGIN: Record<OverlayPosition["side"], string> = {
  end: "left center",
  start: "right center",
  below: "top center",
  above: "bottom center",
};

export function ExplainButton({
  anchor,
  onClick,
}: ExplainButtonProps): JSX.Element {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<OverlayPosition>(() =>
    placeButton(anchor),
  );
  const [settled, setSettled] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    const size = node
      ? { width: node.offsetWidth, height: node.offsetHeight }
      : BUTTON_FALLBACK;
    setPosition(placeButton(anchor, size));
  }, [anchor]);

  useLayoutEffect(() => {
    const id = window.requestAnimationFrame(() => setSettled(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  function keepSelection(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    event.stopPropagation();
  }

  const wrapStyle: CSSProperties = {
    top: position.top,
    left: position.left,
    transformOrigin: ORIGIN[position.side],
  };

  return (
    <div
      className={cn(
        "pointer-events-auto fixed z-[2147483647]",
        settled ? "cx-chip-in" : "opacity-0",
      )}
      style={wrapStyle}
    >
      <button
        ref={ref}
        type="button"
        onMouseDown={keepSelection}
        onClick={(event) => {
          keepSelection(event);
          onClick();
        }}
        className={cn(
          "cx-chip relative inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 pr-3",
          "text-[12px] font-medium tracking-wide text-zinc-50",
          "backdrop-blur-md",
          "transition-[transform,box-shadow] duration-200 ease-out",
          "hover:-translate-y-px hover:scale-[1.04]",
          "active:translate-y-0 active:scale-[1.01]",
          "focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:outline-none",
        )}
        aria-label="Explain selected text with Context-X"
        data-context-x="chip"
      >
        <BrandMark size={16} className="rounded-[4px]" />
        Explain
      </button>
    </div>
  );
}
