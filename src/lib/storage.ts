import type { OpenAIModel, Settings, ThemePreference } from "./types";

const API_KEY_KEY = "openaiApiKey";
const MODEL_KEY = "model";
const THEME_KEY = "theme";

export const DEFAULT_SETTINGS: Settings = {
  openaiApiKey: "",
  model: "gpt-4o-mini",
  theme: "dark",
};

function envApiKey(): string {
  const value = import.meta.env.VITE_OPENAI_API_KEY;
  return typeof value === "string" ? value.trim() : "";
}

const MODELS: OpenAIModel[] = ["gpt-4o-mini", "gpt-4o"];

function isModel(value: unknown): value is OpenAIModel {
  return typeof value === "string" && MODELS.includes(value as OpenAIModel);
}

function isTheme(value: unknown): value is ThemePreference {
  return value === "dark" || value === "light";
}

/**
 * Read user settings from `chrome.storage.sync` so the API key follows
 * the Chrome profile across devices.
 */
export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get([
    API_KEY_KEY,
    MODEL_KEY,
    THEME_KEY,
  ]);
  return {
    openaiApiKey:
      typeof stored[API_KEY_KEY] === "string" && stored[API_KEY_KEY].trim()
        ? stored[API_KEY_KEY].trim()
        : envApiKey() || DEFAULT_SETTINGS.openaiApiKey,
    model: isModel(stored[MODEL_KEY])
      ? stored[MODEL_KEY]
      : DEFAULT_SETTINGS.model,
    theme: isTheme(stored[THEME_KEY])
      ? stored[THEME_KEY]
      : DEFAULT_SETTINGS.theme,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({
    [API_KEY_KEY]: settings.openaiApiKey.trim(),
    [MODEL_KEY]: settings.model,
    [THEME_KEY]: settings.theme,
  });
}

export async function saveTheme(theme: ThemePreference): Promise<void> {
  await chrome.storage.sync.set({ [THEME_KEY]: theme });
}

export async function hasApiKey(): Promise<boolean> {
  const { openaiApiKey } = await getSettings();
  return openaiApiKey.length > 0;
}
