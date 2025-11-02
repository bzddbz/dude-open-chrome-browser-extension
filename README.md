# Dude — AI-powered Chrome Extension

Dude is a Chrome sidepanel extension that provides intelligent text processing with **three AI provider options**: Chrome Built-in AI (Gemini Nano), Google Gemini API, or OpenAI-compatible APIs (Ollama, LM Studio, etc.). It features summarization, translation, validation, and rewriting with voice output, session history, and secure API key storage.

## Features

- **🧠 Multi-Provider AI Support**: Choose between Chrome Built-in AI, Gemini, or OpenAI-compatible providers
- **📄 Smart Text Processing**: Summarize, translate, validate, and rewrite selected text
- **🔊 Voice Output**: Listen to AI results with text-to-speech in 15+ languages
- **🌍 Auto-Translation**: Automatically translate all AI responses to your target language
- **💾 Session History**: Save and manage your AI processing history locally
- **📤 Export Functionality**: Export results in JSON or Markdown format
- **🎨 Dual Theme Support**: Automatic dark/light mode based on system preferences
- **🔐 Secure API Key Storage**: XOR-based obfuscation for API keys
- **⚡ Intelligent Fallback**: Seamless provider switching based on availability
- **🔧 Temporal Context Fix**: Validates content with current date awareness (no false speculation flags)

## Project structure

- `manifest.json` — extension manifest (v0.0.2 - Store compliant, 3 permissions).
- `src/` — TypeScript source files.
  - `core/` — low-level adapters and clients (Chrome Built-in, Gemini, OpenAI-compatible).
  - `services/` — higher-level services (AI orchestration, storage, session, UI helpers).
  - `ui/` — sidepanel UI controllers and components (Sidebar, VoiceHandler).
  - `utils/` — utility helpers (error handling, retry, crypto for API keys).
  - `types/` — TypeScript type definitions.

## Prerequisites

- Node.js >= 18
- npm >= 9
- A Chromium-based browser with version >= 127
- **Chrome Canary** recommended for Chrome Built-in AI features

## Installation

From the project root:

```powershell
npm install
```

### AI Provider Configuration

**Option 1: Chrome Built-in AI (Recommended)**
- Enable flags in `chrome://flags/`:
  - `#prompt-api-for-gemini-nano`
  - `#summarization-api-for-gemini-nano`
  - `#translation-api`
  - `#ai-features`
- Restart Chrome and wait for model downloads (5-10 minutes first time)
- **Note**: Output limited to English, Spanish, Japanese - auto-translate workaround enabled

**Option 2: Google Gemini API**
- Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Configure in extension Settings (⚙️)
- Supports all languages natively
- Fallback when Built-in AI unavailable

**Option 3: OpenAI-Compatible (Ollama, LM Studio, etc.)**
- Install local LLM server (e.g., Ollama with `llama2` model)
- Configure base URL and model in Settings
- Fully offline operation
- No API key required for local servers

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

**Note**: 
- Chrome Built-in AI requires Chrome Canary or Dev channel
- Output languages limited to English, Spanish, Japanese (auto-translate workaround implemented)
- First use requires model download (5-10 minutes)

## Configuration

### Settings Panel

Access settings via the ⚙️ icon in the extension:

- **AI Provider Priority**: Choose Built-in AI, Gemini, or OpenAI-compatible
- **Target Language**: Select translation target language (15+ languages supported)
- **Auto-translate Results**: Automatically translate all AI results to target language
- **Summary Length**: Choose short, medium, or long summaries
- **Summary Type**: Key points, paragraph, or bullets format
- **Rewrite Style/Tone**: Select style (neutral/creative/academic) and tone (professional/casual/formal)
- **Validation Strictness**: Strict, medium, or lenient credibility analysis
- **Gemini API Key**: Optional cloud AI fallback (securely obfuscated with XOR + Base64)
- **OpenAI-Compatible**: Configure base URL, model, and API key for local LLMs

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

- **API Key Obfuscation**: All API keys XOR-encoded + Base64 in storage
- **No Plain Text Keys**: Keys never appear in console logs or unencrypted storage
- **Local Processing**: Chrome Built-in AI processes data entirely on-device
- **Minimal Permissions**: Only 3 essential browser permissions (activeTab, storage, sidePanel)
  - **v0.0.2**: Removed unused `scripting` permission for Chrome Web Store compliance
- **Privacy-First**: No external servers, no tracking, no analytics
- **Temporal Context**: Validate function injects current date to prevent false speculation flags

## Contributing

- Keep code small and modular — prefer single-responsibility functions.
- Add type annotations for all function parameters and returns.
- Run `npm run lint` and `npm run type-check` before opening PRs.
- Test with both Chrome Built-in AI and Gemini API modes.

## Where to look in the code

- `src/services/ai.service.ts` — orchestrates all 3 AI providers with auto-translate and provider selection logic.
- `src/core/ai-gemini-client.ts` — Gemini API HTTP wrapper (generate/stream/write).
- `src/core/ai-openai-client.ts` — OpenAI-compatible client for local LLMs (Ollama, LM Studio, etc.).
- `src/core/chrome-builtin.ts` — adapter for Chrome Built-in AI APIs with language workaround.
- `src/ui/sidebar.ts` — main UI controller with voice synthesis integration (1200+ lines).
- `src/utils/crypto.ts` — API key obfuscation utilities (XOR + Base64).
- `src/services/preferences.service.ts` — settings management and persistence.

## Known Limitations

- Chrome Built-in AI requires Chrome Canary/Dev with feature flags enabled
- Built-in AI output limited to English, Spanish, Japanese (auto-translate workaround active)
- Voice synthesis availability depends on system TTS support
- Large text processing (>5000 chars) may take longer
- First Built-in AI use requires model download (5-10 minutes)

## Recent Updates (v0.0.2)

- **🚨 Chrome Web Store Fix**: Removed unused `scripting` permission (Purple Potassium violation)
- **🌍 Auto-Translate**: Workaround for Built-in AI's en/es/ja limitation
- **📅 Temporal Context**: Validate function now injects current date to prevent false speculation flags
- **🔧 All Providers Fixed**: Knowledge cutoff fix applied to Built-in AI, Gemini, and OpenAI-compatible

## Version

**Current**: v0.0.2 (November 2, 2025)  
**Status**: Chrome Web Store compliant, ready for submission

## License

Apache-2.0
