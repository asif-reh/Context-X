import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  ...props
}: React.ComponentProps<"span">): React.JSX.Element {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex w-fit items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
