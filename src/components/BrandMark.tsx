import type { JSX } from "react";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  size?: number;
}

/** Inline SVG mark so it works in extension pages and Shadow DOM without extra assets. */
export function BrandMark({
  className,
  size = 28,
}: BrandMarkProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0 rounded-[8px]", className)}
    >
      <rect width="32" height="32" rx="8" fill="#18181B" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        stroke="#8B5CF6"
        strokeOpacity="0.35"
      />
      <path
        d="M9 8.5 16 16 9 23.5"
        stroke="#22D3EE"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 8.5 16 16 23 23.5"
        stroke="#8B5CF6"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
