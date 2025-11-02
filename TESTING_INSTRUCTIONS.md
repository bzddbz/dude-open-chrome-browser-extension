# 🧪 Testing Instructions - Dude AI Browser Assistant

**Version**: 0.0.2  
**Last Updated**: November 2, 2025

## 📋 Overview

This document provides comprehensive testing instructions for judges and evaluators of the Dude AI Browser Assistant Chrome extension. The extension leverages **three AI provider options**: Chrome Built-in AI (Gemini Nano), Google Gemini API, or OpenAI-compatible APIs (Ollama, LM Studio, etc.) with advanced features like auto-translation, voice output, and temporal context awareness.

## 🔧 Prerequisites

### System Requirements
- **Chrome Browser**: Version 127+ (Chrome Canary recommended for Built-in AI functionality)
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **Memory**: Minimum 4GB RAM (8GB recommended for Built-in AI)
- **Node.js**: v18+ (for building from source)

### Chrome AI API Setup (Built-in AI - Recommended)

For full AI functionality with Chrome Built-in AI, enable these flags in `chrome://flags/` (Chrome Canary or Dev):

1. `#prompt-api-for-gemini-nano` - Enable Gemini Nano prompt API
2. `#summarization-api-for-gemini-nano` - Enable summarization API
3. `#translation-api` - Enable translation API
4. `#ai-features` - Enable general AI features

**Important Notes**:
- After enabling flags, restart Chrome
- First use requires model download (5-10 minutes, ~1.5GB)
- Check download status: Open DevTools → Console → Type `await ai.summarizer.create()` 
- Built-in AI output limited to English, Spanish, Japanese (auto-translate workaround implemented)

### Alternative: Cloud AI Setup

**Option 1: Google Gemini API** (No Chrome flags needed)
1. Get free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. After installing extension, open Settings (⚙️)
3. Paste API key in "Gemini API Key" field
4. Enable "Cloud First" mode

**Option 2: OpenAI-Compatible (Local LLM)** (Fully offline)
1. Install Ollama: `curl https://ollama.ai/install.sh | sh`
2. Pull a model: `ollama pull llama2`
3. In extension Settings, configure:
   - Base URL: `http://localhost:11434`
   - Model: `llama2`
4. Enable "OpenAI-Compatible Provider"



## 📦 Installation Guide

### Method 1: Developer Mode Installation (Recommended for Judges)

1. **Download the Extension**
   ```bash
   git clone https://github.com/your-username/dude-browser-extension.git
   cd dude-browser-extension
   ```

2. **Build the Extension**
   ```bash
   npm install
   npm run build
   ```

3. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from the project
   - Verify "Dude - AI Browser Assistant" appears in the extensions list

4. **Verify Installation**
   - Look for the Dude icon in the Chrome toolbar
   - Right-click the icon and ensure "Pin" is available
   - Open any webpage to test functionality

### Method 2: Chrome Web Store (Public Version)

1. Visit the Chrome Web Store
2. Search for "Dude - AI Browser Assistant"
3. Click "Add to Chrome"
4. Grant necessary permissions
5. Installation completes automatically

## 🎯 Core Functionality Testing

### Test Case 1: Basic Extension Launch
**Objective**: Verify the extension opens correctly

**Steps**:
1. Navigate to any webpage (e.g., news article, blog post)
2. Click the Dude extension icon in the toolbar OR press `Alt + B`
3. Verify the side panel opens with the Dude interface

**Expected Results**:
- Side panel opens smoothly with animation
- Interface displays "Hey Dude! Select text to get started..."
- All UI elements are visible and responsive
- Theme matches system preference (dark/light)

**Pass Criteria**: ✅ Side panel opens with complete UI

---

### Test Case 2: Text Selection and AI Processing
**Objective**: Test core AI features with text selection

**Steps**:
1. Open a webpage with substantial text content
2. Select a paragraph of text (50-200 characters recommended)
3. The Dude interface should automatically detect the selection
4. Before testing AI features, should check Settings in the right top corner (cogs-icon). You can set up every preference for AI features.
4. Test each AI feature:

   **A. Summarization**
   - Click the "📄 Summarize" button
   - Wait for processing (2-10 seconds)
   - Verify a concise summary appears

   **B. Translation**
   - Click the "🌐 Translate" button
   - Select a target language from dropdown (e.g., Spanish) (In settings)
   - Wait for processing
   - Verify translated text appears

   **C. Validation**
   - Click the "✅ Validate" button
   - Wait for credibility analysis
   - Verify validation results with credibility score

   **D. Rewriting**
   - Click the "✏️ Rewrite" button
   - Select a rewrite style (Formal/Informal) (In Settings)
   - Wait for processing
   - Verify rewritten text appears

**Expected Results**:
- Each feature processes selected text
- Results display in clearly labeled sections
- Loading indicators show during processing
- Error messages appear if processing fails

**Pass Criteria**: ✅ All AI features process text and return results

---

### Test Case 3: Voice Output Testing

**Objective**: Test voice text-to-speech functionality

**Steps**:

1. Select text and process with any AI feature
2. After AI processing completes, look for the 🔊 speaker button on the result card
3. Click the speaker button to start voice playback
4. Observe the pulsing animation on the speaker icon
5. Click again to stop playback
6. Test with different languages:
   - Process text in different languages (English, Hungarian, Italian, Spanish, etc.)
   - Enable "Auto-translate results" in Settings
   - Change target language
   - Verify voice uses appropriate language/accent

**Expected Results**:

- Text-to-speech reads AI-generated content with natural voice
- Speaker icon pulses green during playback
- Clicking stops ongoing speech
- Language detection works automatically
- Voice selection matches detected language
- Multiple result cards can have independent voice playback

**Pass Criteria**: ✅ Voice features work with clear audio feedback and visual indicators

---

### Test Case 4: Auto-Translation Feature

**Objective**: Test automatic translation of all AI results with language workaround

**Steps**:

1. Open Settings (⚙️ icon)
2. Enable "Auto-translate results" checkbox
3. Select target language (e.g., Hungarian, Italian, French, German - **not** English/Spanish/Japanese)
4. Close Settings
5. Select English text on any webpage
6. Process with various AI features:
   - Summarize → Should return Hungarian (or selected language) summary
   - Validate → Should return Hungarian credibility analysis
   - Rewrite → Should return Hungarian improved text
7. Test with explicit translation:
   - Select text
   - Click Translate button
   - Verify it uses the target language setting

**Technical Note** (v0.0.2):
- Chrome Built-in AI only supports en/es/ja output
- Workaround: Generate in English → Auto-translate to target language
- No duplicate API calls (efficient prompt-level instruction)
- If using Gemini/OpenAI-compatible, translation happens directly

**Expected Results**:

- When auto-translate is enabled, all AI operations return results in target language
- For Built-in AI + non-supported languages (hu, de, fr, it, etc.):
  1. AI generates response in English
  2. Chrome Translation API translates to target language
  3. Final result appears in target language
- For Gemini/OpenAI-compatible: Direct generation in target language
- Translation operation respects target language setting
- Voice playback uses correct language/accent for translated content
- Console logs show `🔄 Translating ... from en to hu...` (if using Built-in AI)

**Pass Criteria**: ✅ Auto-translation works efficiently for all 15+ languages without errors

---


### Test Case 5: History and Storage Testing

**Objective**: Test data persistence and history management

**Steps**:

1. Process several different pieces of text using various AI features
2. Open the History tab
3. Verify all processed items appear in chronological order with:
   - Timestamp
   - Operation type badge
   - Provider indicator (built-in or gemini)
   - Preview of processed text
4. Test export functionality:
   - Select items from history
   - Click "📤 Export" button
   - Choose JSON or Markdown format
   - Verify download starts automatically
   - Open downloaded file and verify content structure

**Expected Results**:

- All processed content saved automatically to session storage
- History displays with complete metadata
- Export generates properly formatted files
- Data persists across page navigation
- Provider badge shows correct AI source

**Pass Criteria**: ✅ History management and export work correctly

---

### Test Case 6: Settings and Configuration

**Objective**: Test settings panel and all three AI provider configurations

**Steps**:

1. Open Dude extension
2. Click the "⚙️ Settings" button in top-right corner
3. Test **Chrome Built-in AI Settings**:
   - Verify "Use Built-in AI" option (default)
   - Check AI availability indicators (green = ready, yellow = downloading, red = unavailable)
4. Test **Google Gemini Settings**:
   - Click "Use Gemini API" option
   - Add API key in "Gemini API Key" field
   - Enable "Cloud First" to prioritize Gemini over Built-in AI
   - Save and verify key is obfuscated in `chrome.storage.local` (check DevTools)
5. Test **OpenAI-Compatible Settings**:
   - Click "Use OpenAI-Compatible" option
   - Enter base URL (e.g., `http://localhost:11434` for Ollama)
   - Enter model name (e.g., `llama2`, `mistral`, `codellama`)
   - Optional: Add API key for remote servers
   - Click "Test Connection" button
6. Test **General Settings**:
   - **Target Language**: Change to different languages (Italian, Hungarian, French, etc.)
   - **Auto-translate Results**: Toggle checkbox on/off
   - **Summary Length**: Select Short/Medium/Long
   - **Summary Type**: Key points, Paragraph, Bullets
   - **Summary Format**: Markdown, Plain Text, JSON
   - **Rewrite Style**: Neutral, Creative, Academic
   - **Rewrite Tone**: Professional, Casual, Formal
   - **Rewrite Complexity**: Simple, Intermediate, Advanced
   - **Validation Strictness**: Strict, Medium, Lenient
7. Close settings and verify changes persist
8. Reload extension and verify settings remain saved
9. Process text with each AI provider and verify correct provider badge appears

**Expected Results**:

- All settings save immediately to `chrome.storage.local`
- Interface reflects changes instantly
- API keys are obfuscated with XOR + Base64 in storage
- Settings persist across browser sessions and reloads
- Target language affects translation and auto-translate feature
- AI provider selection works correctly (Built-in → Gemini → OpenAI-compatible priority)
- Connection test for OpenAI-compatible returns success/failure message
- Provider badge on result cards shows correct AI source

**Pass Criteria**: ✅ All settings functional and persistent with secure API key storage and multi-provider support

---

### Test Case 7: Temporal Context and Knowledge Cutoff Fix (v0.0.2)

**Objective**: Verify validate function correctly handles current-date content without false speculation flags

**Background**: 
- AI models have knowledge cutoffs (e.g., trained on data up to early 2024)
- Without temporal context, they may flag 2025 events as "speculation" or "unverifiable future claims"
- v0.0.2 fix injects current date into validate prompts for all three AI providers

**Steps**:

1. **Find recent/current-date content**:
   - Search for news articles from October-November 2025
   - Example: "Tesla earnings report November 2025" or "US election results 2024"
   - Or create test text: "On November 2, 2025, the Chrome extension passed all tests successfully."

2. **Test with Built-in AI**:
   - Select recent-date text (50-200 characters)
   - Click "✅ Validate" button
   - Wait for credibility analysis

3. **Test with Gemini API** (if configured):
   - Same text selection
   - Ensure Gemini API is active (check Settings → Cloud First enabled)
   - Click "✅ Validate"

4. **Test with OpenAI-Compatible** (if configured):
   - Same text selection
   - Ensure OpenAI-compatible provider active
   - Click "✅ Validate"

5. **Review validation results**:
   - Check "Fact-Checking" section
   - Verify NO false flags like:
     - ❌ "Refers to future events that cannot be verified"
     - ❌ "Speculative content about unverifiable dates"
     - ❌ "Claims about future events (November 2025)"
   - Expect reasonable analysis like:
     - ✅ "Recent event, source verification needed"
     - ✅ "Current-date information, verify with reliable sources"
     - ✅ "Real-time event as of [current date]"

**Technical Verification**:
1. Open Chrome DevTools → Console
2. Look for injected context in prompts (visible in verbose logging):
   ```
   IMPORTANT CONTEXT: Today's date is November 2, 2025. When analyzing this text, consider that:
   - Events from 2024-2025 are CURRENT or RECENT, not future speculation
   ```
3. Verify date format: "November 2, 2025" (not "2025-11-02")

**Expected Results**:

- **Built-in AI**: Validate prompt includes current date context before sending to Gemini Nano
- **Gemini API**: Same temporal context injection in API request
- **OpenAI-Compatible**: Same temporal context injection in chat completion
- NO false "speculation" or "future event" flags for current-date content
- Proper temporal awareness in fact-checking analysis
- Date dynamically generated each time (not hardcoded)

**Pass Criteria**: ✅ All three AI providers handle 2024-2025 dates correctly without false speculation warnings

---

### Test Case 8: Error Handling and Edge Cases
**Objective**: Test robustness and error recovery

**Steps**:
1. **Network Error Test**:
   - Disconnect from internet
   - Try AI features
   - Verify graceful fallback to demo mode

2. **Invalid Input Test**:
   - Select very short text (<10 characters)
   - Try AI features
   - Verify appropriate error messages

3. **Large Text Test**:
   - Select very long text (>5000 characters)
   - Try processing
   - Verify handling of large inputs

**Expected Results**:
- Clear error messages for all failure modes
- Graceful degradation without crashes
- Helpful guidance for users
- Automatic retry mechanisms where appropriate

**Pass Criteria**: ✅ All error scenarios handled gracefully

---

### Test Case 9: Performance and Resource Usage
**Objective**: Verify efficient resource utilization

**Steps**:
1. Open Chrome DevTools (F12)
2. Monitor Performance tab during AI processing
3. Check:
   - Memory usage remains reasonable (<100MB increase)
   - CPU usage spikes only during processing
   - Network requests minimal (local processing)
4. Test with multiple tabs open
5. Verify extension doesn't slow browser performance

**Expected Results**:
- Efficient resource utilization
- No memory leaks during extended use
- Fast response times (<2 seconds for local AI)
- Minimal network traffic

**Pass Criteria**: ✅ Performance remains acceptable under load

---

## 🌐 Cross-Platform Testing

### Browser Compatibility
- [ ] Chrome 127+ (primary target)
- [ ] Chrome Canary (full AI features)
- [ ] Chrome Dev (partial AI features)
- [ ] Chrome Stable (demo mode only)

### Operating Systems
- [ ] Windows 10/11
- [ ] macOS 10.15+
- [ ] Ubuntu 20.04+
- [ ] Other Linux distributions

### Screen Sizes
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Large monitors (2560x1440)
- [ ] Small screens (1024x768)

---

## 📊 Test Results Checklist

### Core Functionality
- [ ] Extension installs and loads correctly
- [ ] Text selection detection works
- [ ] All AI features process text
- [ ] Voice output functions
- [ ] History and storage persist
- [ ] Settings save and apply
- [ ] Export functionality works

### Quality Assurance
- [ ] UI responsive and intuitive
- [ ] Error handling comprehensive
- [ ] Performance acceptable
- [ ] Memory usage reasonable
- [ ] Cross-platform compatibility
- [ ] Security measures effective
- [ ] Documentation complete

### AI Functionality
- [ ] Summarization generates concise output
- [ ] Translation maintains meaning
- [ ] Validation provides useful insights
- [ ] Rewriting improves text quality
- [ ] Text-to-speech natural

---

### Known Issues and Workarounds

### Issue 1: Chrome Built-in AI Output Language Limitation
**Symptom**: Built-in AI only supports English, Spanish, Japanese output
**Solution** (v0.0.2): 
- Automatic workaround implemented
- Extension generates in supported language (English)
- Then translates to target language via Chrome Translation API
- No user action needed, works transparently

### Issue 2: Chrome AI APIs Not Available
**Symptom**: AI features show "API not available" messages
**Solution**: 
- Enable Chrome AI flags (see Prerequisites)
- Or use Gemini API key in Settings for cloud fallback
- Or configure OpenAI-compatible provider for local LLM

### Issue 3: Model Download in Progress
**Symptom**: "Downloading model, please wait" message
**Solution**:
- First use requires ~1.5GB model download (5-10 minutes)
- Check progress: DevTools → Console → `await ai.summarizer.capabilities()`
- Use Gemini API as temporary fallback during download

### Issue 4: Slow Performance
**Symptom**: Processing takes longer than expected
**Solution**: 
- Ensure sufficient memory available (8GB+ recommended)
- Close unnecessary browser tabs
- For large text, use chunking (automatic for >5000 chars)
- Consider using cloud providers (Gemini) for faster response

### Issue 5: False "Speculation" Flags (FIXED in v0.0.2)
**Symptom**: Validate flagged 2025 events as "future speculation"
**Solution**: 
- Fixed in v0.0.2 with temporal context injection
- Update to latest version if seeing this issue
- All three AI providers now include current date in prompts

---

## 📞 Support and Feedback

### Technical Support
- **GitHub Issues**: Report bugs at project repository
- **Documentation**: Full docs available in README.md


### Evaluation Feedback
Please provide feedback on:
1. Overall user experience
2. AI feature effectiveness
3. Performance and reliability
4. Innovation and uniqueness
5. Privacy and security implementation

---

## 🎯 Success Criteria

The extension will be considered successful if:
- All core AI features function correctly
- User interface is intuitive and responsive
- Privacy and security measures are effective
- Performance meets expectations
- Documentation is comprehensive
- Cross-platform compatibility is maintained

**Total Estimated Testing Time**: 30-45 minutes
**Required Judge Interaction**: Moderate (selecting text, clicking buttons)
**Technical Difficulty**: Low to Medium

---

*This testing guide ensures comprehensive evaluation of the Dude AI Browser Assistant's capabilities, innovation, and readiness for production use.*