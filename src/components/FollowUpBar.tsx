import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type JSX,
  type KeyboardEvent,
} from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FollowUpBarProps {
  disabled: boolean;
  pending: boolean;
  capped: boolean;
  onSubmit: (question: string) => void;
}

export function FollowUpBar({
  disabled,
  pending,
  capped,
  onSubmit,
}: FollowUpBarProps): JSX.Element {
  const [value, setValue] = useState("");
  const inputId = useId();
  const locked = disabled || pending || capped;

  useEffect(() => {
    if (locked) setValue("");
  }, [locked]);

  function submit(): void {
    const question = value.trim();
    if (!question || locked) return;
    onSubmit(question);
    setValue("");
  }

  function onFormSubmit(event: FormEvent): void {
    event.preventDefault();
    submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  const placeholder = capped
    ? "Highlight something new to continue"
    : pending
      ? "Thinking…"
      : disabled
        ? "Ask a follow-up…"
        : "Ask a follow-up…";

  return (
    <form
      onSubmit={onFormSubmit}
      className="flex items-center gap-2 border-t border-white/8 bg-black/35 px-3 py-2"
    >
      <label htmlFor={inputId} className="sr-only">
        Ask a follow-up
      </label>
      <Input
        id={inputId}
        value={value}
        disabled={locked}
        onKeyDown={onKeyDown}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-8 border-0 bg-transparent shadow-none md:text-[13px]",
          "placeholder:text-zinc-500 focus-visible:border-transparent focus-visible:ring-0",
        )}
      />
      <Button
        type="submit"
        size="icon-sm"
        disabled={locked || value.trim().length === 0}
        aria-label="Send follow-up"
        className="rounded-full"
      >
        <ArrowUp className="size-3.5" />
      </Button>
    </form>
  );
}
