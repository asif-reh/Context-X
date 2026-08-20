# Privacy policy — Context-X

Last updated: 20 August 2026

Context-X is a Chrome extension that explains highlighted text using OpenAI. This policy describes what the extension and the Context-X API handle. It is written for users and for Chrome Web Store review.

## What Context-X stores

- **Anonymous install id** in `chrome.storage.local` (this browser only). Used to enforce the free daily limit.
- **Theme preference** in `chrome.storage.sync`.
- **Onboarding completion** and **monthly usage estimates** in `chrome.storage.local`.
- **Optional OpenAI API key** in `chrome.storage.sync` only if you choose to paste your own key.

The OpenAI key used for the free hosted plan lives on the Context-X server. It is not stored in the extension.

## What is sent to third parties

When you click **Explain** (or use the shortcut) in hosted mode, the background worker sends the selected term, a short window of nearby page text, the page title, and the page URL to the **Context-X API**. The API then sends that prompt to **OpenAI** (`https://api.openai.com`).

If you paste your own OpenAI key in Settings, the extension sends that request **directly to OpenAI** and does not use the Context-X API for explanations.

OpenAI’s handling of the prompt is governed by [OpenAI’s privacy policy](https://openai.com/policies/privacy-policy).

Page JavaScript cannot read your key or the install id from extension storage.

## What Context-X does not do

- It does not sell or rent personal data
- It does not run ads or analytics SDKs
- It does not collect accounts, emails, or browsing history beyond the current explanation request
- It does not persist page content after the request finishes, other than a short local usage preview you can see in Settings

## Permissions

- **storage** — save theme, optional API key, install id, and local usage
- **clipboardWrite** — copy an explanation when you choose Copy
- **Host access to the Context-X API and api.openai.com** — network destinations for explanations

A content script runs on `http` and `https` pages so the overlay can appear next to your selection. It does not scrape the page in the background.

## Your choices

- Add, remove, or replace an OpenAI API key in Settings at any time
- Uninstall the extension to delete its `chrome.storage` data for this profile
- Disable the extension to stop all overlay and network activity

## Contact

Contact the maintainer through the project repository: [github.com/asif-reh/Context-X](https://github.com/asif-reh/Context-X).
