# Privacy policy — Context-X

Last updated: 20 August 2026

Context-X is a Chrome extension that explains highlighted text using OpenAI. This policy describes what the extension handles. It is written for users and for Chrome Web Store review.

## What Context-X stores

- **OpenAI API key** in `chrome.storage.sync` (your Chrome profile, optionally synced across your devices).
- **Theme preference** (light or dark) in `chrome.storage.sync`.
- **Onboarding completion** and **monthly usage estimates** in `chrome.storage.local` (this browser only).

Nothing is stored on a Context-X server. The extension has no backend.

## What is sent to third parties

When you click **Explain** (or use the shortcut), the background worker sends the selected term, a short window of nearby page text, the page title, and the page URL to **OpenAI** (`https://api.openai.com`) so the model can write a context-aware explanation.

That request uses **your** API key. OpenAI’s handling of the prompt is governed by [OpenAI’s privacy policy](https://openai.com/policies/privacy-policy).

The key is not sent to any other host. Page JavaScript cannot read it.

## What Context-X does not do

- It does not sell or rent personal data
- It does not run ads or analytics SDKs
- It does not collect accounts, emails, or browsing history beyond the current explanation request
- It does not persist page content after the request finishes

## Permissions

- **storage** — save the API key, theme, and local usage
- **clipboardWrite** — copy an explanation when you choose Copy
- **Host access to api.openai.com** — the only network destination for explanations

A content script runs on `http` and `https` pages so the overlay can appear next to your selection. It does not scrape the page in the background.

## Your choices

- Remove or replace the API key in Settings at any time
- Uninstall the extension to delete its `chrome.storage` data for this profile
- Disable the extension to stop all overlay and network activity

## Contact

If you publish Context-X, replace this paragraph with a support email or site. Until then, contact the maintainer through the project repository.
