import type { ThemePreference } from "./types";

export function applyTheme(theme: ThemePreference): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export async function initPageTheme(): Promise<void> {
  const stored = await chrome.storage.sync.get("theme");
  const theme: ThemePreference = stored.theme === "light" ? "light" : "dark";
  applyTheme(theme);
}

/** Keep popup/options in sync if the user toggles theme in another view. */
export function subscribeTheme(
  onChange: (theme: ThemePreference) => void,
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ): void => {
    if (area !== "sync" || !changes.theme) return;
    const value = changes.theme.newValue;
    if (value !== "light" && value !== "dark") return;
    applyTheme(value);
    onChange(value);
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
