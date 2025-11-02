# Privacy Policy for Dude Chrome Extension

**Last Updated**: November 2, 2025  
**Version**: 0.0.2

## 1. Information We Collect

### Local Storage Data
- **Text selections**: Content you choose to process with AI
- **Processing results**: AI-generated summaries, translations, validations, and rewrites
- **User preferences**: Settings like target language, summary length, AI provider choice
- **Session history**: Saved results for your reference (stored locally on your device)

### API Keys (Optional)
- **Google Gemini API Key**: If you choose to use Gemini API (encrypted with XOR + Base64)
- **OpenAI-Compatible API Key**: If you configure local LLM integration (encrypted with XOR + Base64)

### No Personal Information
- We do **NOT** collect personally identifiable information
- We do **NOT** collect browsing history
- We do **NOT** collect demographic data
- We do **NOT** use cookies or tracking pixels

### No Usage Analytics
- No tracking or analytics data collected
- No telemetry or crash reports sent
- No performance metrics transmitted

## 2. How We Use Your Information

### Local Processing Only
- All data processing happens on your device when using Chrome Built-in AI
- Text selections never leave your browser unless you explicitly use cloud APIs (Gemini)
- Session history stored only in `chrome.storage.local` (never on external servers)

### Cloud API Usage (Optional)
If you choose to use Google Gemini API or OpenAI-compatible providers:
- Text is sent to the respective API endpoint for processing
- API keys are obfuscated before storage (XOR cipher + Base64 encoding)
- You control which provider to use via Settings

### User-Controlled
- You control what data is saved to history
- You can clear all data anytime via Settings → Clear All Data
- You can export your data in JSON or Markdown format
- You can disable history saving entirely

## 3. Data Sharing and Disclosure

### Third-Party Services
The extension **may** interact with these third-party services **only if you configure them**:

1. **Google Gemini API** (optional)
   - Used when: You add Gemini API key and enable cloud-first mode
   - Data sent: Selected text for AI processing
   - Privacy policy: [Google AI Terms](https://ai.google.dev/terms)

2. **OpenAI-Compatible APIs** (optional)
   - Used when: You configure local LLM server (Ollama, LM Studio, etc.)
   - Data sent: Selected text for AI processing
   - Privacy: Fully local if using localhost servers

3. **Chrome Built-in AI APIs** (default)
   - Used when: No explicit configuration needed, works offline
   - Data sent: Processed entirely on-device (no external transmission)
   - Privacy: Complete privacy, no data leaves your machine

### No Selling
- We **NEVER** sell user data
- We **NEVER** share data with advertisers
- We **NEVER** monetize your information

### No Advertising
- No advertising networks involved
- No third-party trackers
- No affiliate links

## 4. Data Security

### Local Storage
- Data stored in Chrome's secure `chrome.storage.local` API
- Protected by Chrome's sandboxing and permission system
- Only accessible to the Dude extension

### Encryption
- API keys encrypted with XOR cipher + Base64 encoding before storage
- Keys never appear in console logs or plain text
- Extension ID used as part of obfuscation key

### No Server Storage
- We do **NOT** operate any servers
- We do **NOT** maintain any databases
- We do **NOT** have access to your data

### Minimal Permissions
The extension requests only **3 essential permissions**:
1. **`activeTab`**: Access current tab for text selection
2. **`storage`**: Save preferences and history locally
3. **`sidePanel`**: Display extension UI in side panel

**Note**: Version 0.0.2 removed the unused `scripting` permission to comply with Chrome Web Store policies.

## 5. User Rights

### Access
- View all your stored data anytime via History tab
- Inspect extension storage via Chrome DevTools

### Deletion
- Clear all data with one click in Settings
- Delete individual history items
- Uninstall extension to remove all local data

### Export
- Export your data in JSON format (structured data)
- Export your data in Markdown format (readable text)
- Download includes timestamps and metadata

### Opt-out
- Disable data storage via Settings
- Use "Incognito Mode" for no history saving
- Configure AI provider preferences

## 6. Children's Privacy

- This extension is not intended for users under 13 years of age
- We do not knowingly collect information from children
- If you believe a child has provided data, contact us immediately

## 7. Changes to This Policy

- Updates will be posted on this page and in the GitHub repository
- Significant changes will be highlighted in CHANGELOG.md
- Effective date included at the top of this document
- Continued use after changes constitutes acceptance

## 8. International Users

### GDPR Compliance (EU)
- Right to access: Export your data anytime
- Right to deletion: Clear all data in Settings
- Right to portability: Export in JSON/Markdown
- No automated decision-making affecting legal rights

### CCPA Compliance (California)
- Right to know: Full transparency in this policy
- Right to delete: One-click data deletion
- Right to opt-out: Disable history in Settings
- No sale of personal information

## 9. Technical Implementation

### Chrome Built-in AI
- Processes data entirely on-device using Gemini Nano
- No network transmission when using Built-in AI
- Model downloaded once, runs locally thereafter

### Auto-Translation Workaround
- Built-in AI limited to English, Spanish, Japanese output
- Workaround: Generate in supported language, then translate
- Translation also happens locally via Chrome Translation API

### Temporal Context Fix (v0.0.2)
- Validate function injects current date to prevent false "speculation" flags
- Example: "Today's date is November 2, 2025"
- Applied to all three AI providers (Built-in, Gemini, OpenAI-compatible)

## 10. Contact Us

### Support
- **Email**: bzd.dbz@proton.me
- **GitHub Issues**: [Report bugs or request features](https://github.com/bzddbz/dude-open-chrome-browser-extension/issues)
- **GitHub Repository**: [View source code](https://github.com/bzddbz/dude-open-chrome-browser-extension)

### Response Time
- We aim to respond to inquiries within 48 hours
- Security issues are prioritized

### Open Source
- This extension is open source (Apache-2.0 License)
- You can audit the code anytime
- Contributions welcome via pull requests

---

**Summary**: Dude respects your privacy by processing data locally whenever possible, encrypting API keys, never collecting personal information, and giving you full control over your data.

**Version**: 0.0.2  
**Effective Date**: November 2, 2025