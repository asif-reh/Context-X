# Context-X

Context-X is a Chrome extension that explains technical terms **in the context of the page you are reading**.

Highlight a word or short phrase — *throughput*, *goroutine*, *idempotent* — and Context-X returns a short definition, a page-aware explanation, and an analogy. It is not a generic dictionary lookup.

The key never enters the page. Hosted explanations go through the Context-X API; optional BYOK calls OpenAI from the background worker.

## Current features

- Floating **Explain** chip next to a text selection
- Keyboard shortcut: **Option+X** (Mac) or **Alt+X** (Windows/Linux)
- Page-aware prompt (nearby sentences or a small window of code)
- Streaming overlay: definition, context, analogy
- Follow-up questions in the same popup (with quick actions)
- Hosted API: users do not paste an OpenAI key (20 free explains / day)
- Optional BYOK in Settings for unlimited use
- First-run onboarding
- Options page: hosted status, optional key, model, dark mode, usage
- Overlay lives in Shadow DOM so host-page CSS cannot restyle it

## Install (Load unpacked)

You load the **built** extension from `dist/`, not the repository root. Run the **API and the extension** together.

```bash
git clone https://github.com/asif-reh/Context-X.git
cd Context-X
npm install
cp .env.example .env   # then paste OPENAI_API_KEY in .env — server only
```

Terminal 1 — API (holds the OpenAI key):

```bash
npm run server
```

Terminal 2 — extension:

```bash
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder inside this project
5. Pin Context-X from the puzzle-piece menu if you want the toolbar icon visible

While developing, use `npm run dev` instead of `npm run build`. Keep `npm run server` running. After a rebuild, click **Reload** on the extension card if the overlay does not update.

The OpenAI key in `.env` is read **only** by `npm run server`. It is never written into `dist/`.

## Optional: your own OpenAI key

Hosted mode is the default. If you want to skip the daily cap, paste a key in **Settings**. That key stays in your Chrome profile and is sent only to `https://api.openai.com`.

Public privacy policy: https://asif-reh.github.io/Context-X/privacy.html
Landing page: https://asif-reh.github.io/Context-X/

## How to use

1. Open any `http` or `https` page (not `chrome://`, the Web Store, or most PDFs)
2. Highlight a term
3. Click **Explain**, or press **Option+X** / **Alt+X**
4. Read the overlay, copy it, regenerate, or ask a follow-up

## Project structure

```
Context-X/
├── server/                  # Hosted API — OpenAI key stays here
├── manifest.config.ts       # MV3 manifest (source of truth)
├── vite.config.ts
├── public/icons/            # 16 / 32 / 48 / 128 toolbar icons
└── src/
    ├── background/          # Service worker — talks to the API or OpenAI
    ├── content/             # Selection overlay (Shadow DOM)
    ├── popup/               # Toolbar popup
    ├── options/             # Welcome flow + settings
    ├── components/          # Overlay UI and shared primitives
    ├── hooks/
    ├── lib/                 # Storage, prompts, selection, messaging
    └── styles/
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run server` | Hosted API on http://127.0.0.1:8787 (reads `.env`) |
| `npm run start` | Same API without `--env-file` (cloud hosts inject env) |
| `npm run dev` | Development build into `dist/` with live reload |
| `npm run build` | Typecheck and production bundle into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |

## Privacy

- The hosted OpenAI key stays in server `.env`, never in the extension zip
- Selected text and nearby context go to the Context-X API, then OpenAI
- Optional BYOK stays in your Chrome profile and is sent only to OpenAI
- Usage totals stay in this browser (`chrome.storage.local`)

Public privacy policy (Chrome Web Store URL):

https://asif-reh.github.io/Context-X/privacy.html

Landing page:

https://asif-reh.github.io/Context-X/

## Roadmap

- Auth + Stripe for Pro (unlimited explains)
- Chrome Web Store publish after the hosted API is live
- Firefox / Edge store packages
- Better support for PDFs and more same-origin documents
- Caching repeated terms on the same page
- i18n for the overlay and settings

## License

Private / unpublished unless you add a license before distributing.
