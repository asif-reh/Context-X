# Context-X

Context-X is a Chrome extension that explains technical terms **in the context of the page you are reading**.

Highlight a word or short phrase — *throughput*, *goroutine*, *idempotent* — and Context-X returns a short definition, a page-aware explanation, and an analogy. It is not a generic dictionary lookup.

The API key never enters the page. OpenAI calls run in the background service worker.

## Current features

- Floating **Explain** chip next to a text selection
- Keyboard shortcut: **Option+X** (Mac) or **Alt+X** (Windows/Linux)
- Page-aware prompt (nearby sentences or a small window of code)
- Streaming overlay: definition, context, analogy
- Follow-up questions in the same popup (with quick actions)
- First-run onboarding that walks through setup and the API key
- Options page: key, model (`gpt-4o-mini` / `gpt-4o`), dark mode, monthly usage
- Retry and plain-language errors for missing keys, network, timeout, and rate limits
- Overlay lives in Shadow DOM so host-page CSS cannot restyle it

## Install (Load unpacked)

You load the **built** extension from `dist/`, not the repository root.

```bash
git clone <your-repo-url> Context-X
cd Context-X
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder inside this project
5. Pin Context-X from the puzzle-piece menu if you want the toolbar icon visible

While developing, use `npm run dev` instead of `npm run build`. CRXJS still writes to `dist/` and supports live reload. After a rebuild, click **Reload** on the extension card if the overlay does not update.

## Get an OpenAI API key

1. Create an account at [platform.openai.com](https://platform.openai.com/)
2. Open [API keys](https://platform.openai.com/api-keys)
3. Create a secret key and copy it (it starts with `sk-`)
4. Install Context-X, then paste the key in the welcome screen or **Settings**
5. Optionally click **Test connection**

The key is stored in `chrome.storage.sync` (your Chrome profile) and is sent only to `https://api.openai.com` from the background worker.

For local development you can also put the key in a gitignored `.env` file. That file is used only by `npm run dev`. Production builds (`npm run build`) never embed the key — paste it in Settings before you zip `dist/` for the store.

```bash
cp .env.example .env
```

```
OPENAI_API_KEY=sk-your-key-here
```

Restart `npm run dev` after changing `.env`. A key saved in Settings still takes priority.

You need an OpenAI account with billing enabled. Context-X uses `gpt-4o-mini` by default, which is inexpensive for short explanations.

## How to use

1. Open any `http` or `https` page (not `chrome://`, the Web Store, or most PDFs)
2. Highlight a term
3. Click **Explain**, or press **Option+X** / **Alt+X**
4. Read the overlay, copy it, regenerate, or ask a follow-up

## Project structure

```
Context-X/
├── manifest.config.ts       # MV3 manifest (source of truth)
├── vite.config.ts
├── public/icons/            # 16 / 32 / 48 / 128 toolbar icons
└── src/
    ├── background/          # Service worker — OpenAI calls live here
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
| `npm run dev` | Development build into `dist/` with live reload |
| `npm run build` | Typecheck and production bundle into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |

## Privacy

- The API key stays in your Chrome profile (`chrome.storage.sync`)
- Selected text and nearby context are sent to OpenAI only for the current request
- Usage totals stay in this browser (`chrome.storage.local`)
- Context-X does not operate a backend and does not sell data

Public privacy policy (Chrome Web Store URL):

https://asif-reh.github.io/Context-X/

## Roadmap

- Firefox / Edge store packages
- Optional local or non-OpenAI models
- Better support for PDFs and more same-origin documents
- Caching repeated terms on the same page
- Team / shared key support
- i18n for the overlay and settings

## License

Private / unpublished unless you add a license before distributing.
