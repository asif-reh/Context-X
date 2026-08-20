import { isFormField } from "@/lib/selection";

export function isExplainShortcut(event: KeyboardEvent): boolean {
  if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
    return false;
  }
  return event.key === "x" || event.key === "X";
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;
  return isFormField(target);
}

export function shortcutLabel(platform = navigator.platform): string {
  return /mac/i.test(platform) ? "Option+X" : "Alt+X";
}
