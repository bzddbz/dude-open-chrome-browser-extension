# 🤖 Dude - AI Browser Assistant

A powerful Chrome extension that helps you manage information overload with AI-powered summarization, translation, validation, and voice capabilities.

## 🎯 What It Does

- **📄 Summarize** selected text using Chrome's built-in AI APIs
- **🌐 Translate** content to your preferred language with auto-detection
- **✅ Validate** information credibility with fact-checking
- **🔊 Voice Output** - Listen to results with text-to-speech
- **✏️ Rewrite** - Improve and rewrite content with AI
- **💾 Save** important insights with automatic bookmarking
- **📤 Export** your saved content as JSON or Markdown
- **📚 History** of all your processed content

## 🚀 Key Features

### 🧠 AI-Powered Processing
- **Smart Summarization**: Extract key points with configurable length and format
- **Accurate Translation**: Multi-language support with auto-detection
- **Content Validation**: Check information credibility and bias
- **Intelligent Rewriting**: Adjust tone, style, and complexity

### 🎵 Voice Integration
- **Text-to-Speech**: Listen to AI results with natural voices
- **Multi-language Support**: Works with detected content languages
- **Visual Feedback**: Animated indicators for voice operations

### 🛠 Advanced Capabilities
- **Custom Prompts**: Ask specific questions about selected content
- **Smart Export**: Save results in JSON or Markdown formats
- **Local Storage**: All data stays private on your device

## 📋 Current Status

### ✅ Production Ready
- Complete AI integration with Chrome's built-in APIs
- Robust fallback system for offline/demo mode
- Comprehensive error handling and user feedback
- Modern, responsive UI with dark/light themes

### 🔄 In Development
- Enhanced voice command system
- Advanced search and filtering
- Performance optimizations
- Additional AI model support

## 🛠️ Installation

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd dude-browser-extension

# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the dist folder
```

### Chrome AI Requirements
For full AI functionality, you need:
- **Google Chrome Canary** (recommended) or Dev channel
- Enable these flags in `chrome://flags/`:
  - `#prompt-api-for-gemini-nano`
  - `#summarization-api-for-gemini-nano`
  - `#translation-api`
  - `#ai-features`

### Alternative: Cloud AI Mode
Provide your **Google Gemini API key** in Settings to use cloud-based AI without Chrome flags.

## ⚡ Quick Start

1. **Install** the extension in Chrome
2. **Navigate** to any webpage
3. **Select** text you want to process
4. **Press** `Alt + B` (or `Cmd+Alt+B` on Mac)
5. **Choose** an AI operation:
   - 📄 **Summarize** - Extract key points
   - 🌐 **Translate** - Convert to preferred language
   - ✅ **Validate** - Check credibility and bias
   - ✏️ **Rewrite** - Adjust tone and style
6. **Listen** to results with text-to-speech
7. **Save** important insights for later

## 🎨 User Interface

### Main Sidebar
```
┌─────────────────────────────────┐
│ 🤖 Dude!          ⚙️ Settings │
├─────────────────────────────────┤
│ Hey Dude!                       │
│ Select text to get started...   │
│                                 │
│     [📄 Sum] [🌐 Trans] │
│    [✅ Valid] [✏️ Rewrite]       │
└─────────────────────────────────┘
```

### Processing View
```
┌─────────────────────────────────┐
│ Selected Text (150 chars)       │
│ ┌─────────────────────────────┐ │
│ │ Your selected content here  │ │
│ └─────────────────────────────┘ │
│                                 │
│ 📄 Summary                      │
│ Clean, concise summary output   │
│ 🔊                              │
│                                 │
│ 🌐 Translation                  │
│ Translated content with voice   │
│ 🔊                              │
│                                 │
│ [💾 Save] [📤 Export] [🧹 Clear]│
└─────────────────────────────────┘
```

## 🔧 Configuration

### Keyboard Shortcuts
- **Alt + B** (Windows/Linux) or **Cmd+Alt+B** (Mac): Open Dude Assistant

### Default Settings
- **Target Language**: Auto-detect from browser
- **History Limit**: 50 entries
- **Auto-save**: Enabled by default
- **Theme**: Auto (follows system preference)
- **AI Mode**: Auto-switch or manual selection between built-in and cloud

### Customization Options
- **Translation**: 15+ supported languages
- **Summarization**: Short/Medium/Long lengths
- **Validation**: Lenient/Medium/Strict levels
- **Rewrite**: Formal/Informal styles
- **Export**: JSON or Markdown formats

## 🔒 Privacy & Security

### Data Protection
- **Local Storage Only**: No external servers
- **Encrypted Keys**: API keys securely stored
- **User Control**: Manual delete/export options
- **Minimal Collection**: Only essential data stored
- **CSP Compliant**: Secure content policies

### Permissions Explained
- `activeTab`: Access current page info for processing
- `storage`: Save your preferences and history locally
- `scripting`: Inject content scripts for text selection
- `sidePanel`: Display the main user interface
- `<all_urls>`: Detect text selections on all websites

## 🚀 Advanced Usage

### Custom Prompts
Ask specific questions about selected text:
1. Type your question in the prompt input
2. Press Enter or click Send
3. Get AI-powered answers

## 🐛 Troubleshooting

### Common Solutions
1. **AI Not Working**: Enable Chrome AI flags or add Gemini API key
3. **No Text Selection**: Select at least 10 characters
4. **Loading Problems**: Refresh the extension or browser
5. **Build Errors**: Run `npm install` and `npm run build`

### Debug Information
- Open Chrome DevTools in the sidebar (F12)
- Check console for detailed error messages
- Verify AI API availability status
- Monitor local storage usage

## 📁 Project Structure

```
dude-browser-extension/
├── src/
│   ├── config/
│   │   └── constants.ts         # Configuration constants and settings
│   ├── core/
│   │   ├── ai-optimizer.ts      # AI orchestration and fallback management
│   │   ├── ai-gemini-client.ts  # Gemini API integration
│   │   ├── extension.ts         # Main extension entry point
│   │   └── storage.ts           # Data persistence and management
│   ├── services/
│   │   ├── ai-service.ts        # AI service layer abstraction
│   │   └── storage-service.ts   # Storage service layer abstraction
│   ├── types/
│   │   └── core.ts              # TypeScript interfaces and types
│   ├── ui/
│   │   ├── components/          # Modular UI components
│   │   │   └──VoiceHandler.ts  # Voice input/output management
│   │   ├── sidebar.ts           # Main user interface component
│   │   └── style.css            # Themed styling system
│   └── utils/
│       ├── error-handler.ts     # Comprehensive error handling
│       └── retry-helper.ts      # Retry logic utilities
├── tests/
│   └── unit/                    # Unit test files
│       ├── ai-optimizer.test.ts # AI optimizer tests
│       └── storage.test.ts      # Storage tests
├── dist/                        # Built production files
├── manifest.json                # Extension configuration
├── background.js                # Background service worker
├── content.js                   # Content script for text selection
└── index.html                   # Sidebar user interface
```

## 🤝 Development

### Contributing Guidelines
1. Fork the repository
2. Create feature branches
3. Follow TypeScript best practices
4. Add comprehensive tests
5. Submit pull requests

### Code Standards
- **TypeScript**: Strict mode with comprehensive typing
- **Modular Design**: Clean separation of concerns
- **Functional Patterns**: Avoid complex class hierarchies
- **Error Handling**: Graceful degradation and user feedback
- **Performance**: Efficient DOM operations and caching

### Build Process
```bash
# Development build (watch mode)
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Type check
npm run type-check
```

## 📄 License

**MIT License** - Feel free to use, modify, and distribute.

## 🎉 Acknowledgments

Built with ❤️ for the **Chrome Built-in AI Challenge 2025**

### Third-Party Libraries
- **DOMPurify**: Secure HTML sanitization (MIT License)
- **Chrome AI APIs**: Native browser AI capabilities

---

*Transform how you browse the web with intelligent AI assistance that respects your privacy and works offline.*
