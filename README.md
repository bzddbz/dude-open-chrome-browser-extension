# Dude — AI-powered Chrome Extension

Dude is a Chrome sidepanel extension that uses either the browser's built-in AI
APIs or a cloud Gemini client to summarize, translate, validate, and rewrite web
content. It includes features like speech output, session history, export functionality,
and API key obfuscation for enhanced security.

## Features

- **🧠 AI-Powered Text Processing**: Summarize, translate, validate, and rewrite selected text
- **🔊 Voice Output**: Listen to AI results with text-to-speech in multiple languages
- **💾 Session History**: Save and manage your AI processing history
- **📤 Export Functionality**: Export results in JSON or Markdown format
- **🎨 Dual Theme Support**: Automatic dark/light mode based on system preferences
- **🔐 Secure API Key Storage**: XOR-based obfuscation for Gemini API keys
- **⚡ Dual AI Provider**: Seamlessly switch between Chrome Built-in AI and Gemini API

## Project structure

- `manifest.json` — extension manifest.
- `src/` — TypeScript source files.
  - `core/` — low-level adapters and clients (Chrome built-in, Gemini client).
  - `services/` — higher-level services (AI orchestration, storage, session, UI helpers).
  - `ui/` — sidepanel UI controllers and components (Sidebar, VoiceHandler).
  - `utils/` — utility helpers (error handling, retry, crypto for API keys).
  - `components/` — reusable UI components (prompt-input, result-card, loading-indicator).

## Prerequisites

- Node.js >= 18
- npm >= 9
- A Chromium-based browser with version >= 127 (Chrome Canary recommended for Built-in AI)

## Installation

From the project root:

```powershell
npm install
```

If you plan to use Gemini (cloud), configure your API key in the extension
settings after loading the extension. The API key is securely obfuscated in local storage.

## Development

Build the extension for development or distribution:

```powershell
npm run build
```

To load the extension in Chrome during development:

1. Build (`npm run build`) to produce a `dist/` folder.
2. Open `chrome://extensions/` in Chrome.
3. Enable "Developer mode".
4. Click "Load unpacked" and select the `dist/` folder produced by the build.

## Chrome Built-in AI Setup

For full AI functionality with Chrome's built-in APIs, enable these flags in `chrome://flags/`:

1. `#prompt-api-for-gemini-nano` - Enable Gemini Nano for prompts
2. `#summarization-api-for-gemini-nano` - Enable summarization
3. `#translation-api` - Enable translation
4. `#ai-features` - Enable general AI features

**Note**: Chrome Built-in AI requires Chrome Canary or Dev channel.

## Configuration

### Settings Panel

Access settings via the ⚙️ icon in the extension:

- **Target Language**: Select translation target language (15+ languages supported)
- **Auto-translate Results**: Automatically translate all AI results to target language
- **Summary Length**: Choose short, medium, or long summaries
- **Rewrite Style**: Select formal or informal tone
- **Gemini API Key**: Optional cloud AI fallback (securely stored)

## Type checking & linting

Run TypeScript check:

```powershell
npm run type-check
```

Run ESLint:

```powershell
npm run lint
```

## Usage

1. **Select text** on any webpage
2. **Open Dude** via toolbar icon or `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`)
3. **Choose operation**: Summarize, Translate, Validate, or Rewrite
4. **View results** with option to:
   - 🔊 Listen via text-to-speech
   - 💾 Save to history
   - 📤 Export as JSON/Markdown

## Security Features

- **API Key Obfuscation**: Gemini API keys are XOR-encoded + base64 in storage
- **No Plain Text Keys**: Keys never appear in console logs or unencrypted storage
- **Local Processing**: Chrome Built-in AI processes data entirely on-device
- **Minimal Permissions**: Only essential browser permissions requested

## Contributing

- Keep code small and modular — prefer single-responsibility functions.
- Add type annotations for all function parameters and returns.
- Run `npm run lint` and `npm run type-check` before opening PRs.
- Test with both Chrome Built-in AI and Gemini API modes.

## Where to look in the code

- `src/services/ai.service.ts` — orchestrates built-in vs Gemini clients with auto-translate logic.
- `src/core/ai-gemini-client.ts` — Gemini HTTP wrapper (generate/write).
- `src/core/chrome-builtin.ts` — adapter for browser-provided AI APIs.
- `src/ui/sidebar.ts` — main UI controller with voice synthesis integration.
- `src/utils/crypto.ts` — API key obfuscation utilities.

## Known Limitations

- Chrome Built-in AI requires Chrome Canary/Dev with feature flags enabled
- Voice synthesis availability depends on system TTS support
- Large text processing (>5000 chars) may take longer

## License

Apache-2.0
