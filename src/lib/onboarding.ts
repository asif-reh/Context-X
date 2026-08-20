/** First-run welcome. Stored locally so each browser can complete setup once. */
const ONBOARDING_KEY = "onboardingComplete";

export async function getOnboardingComplete(): Promise<boolean> {
  const stored = await chrome.storage.local.get(ONBOARDING_KEY);
  return stored[ONBOARDING_KEY] === true;
}

export async function setOnboardingComplete(): Promise<void> {
  await chrome.storage.local.set({ [ONBOARDING_KEY]: true });
}
