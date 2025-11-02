# Dude Chrome Extension - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.2] - 2025-11-02

### Fixed
- **CRITICAL**: Removed unused `scripting` permission from manifest.json (Chrome Web Store compliance fix)
  - Resolves "Purple Potassium" policy violation from Store rejection
  - Content scripts remain fully functional (statically declared in manifest)
  - No breaking changes to user-facing functionality
- **Chrome Built-in AI**: Added auto-translate support for all Built-in AI functions
  - Workaround for Chrome API limitation: Only en/es/ja supported as output languages
  - Solution: Generate response in supported language (English), then translate to target language
  - Affects: summarize, rewrite, validate, customPrompt, cleanAndConvertToMarkdown functions
  - Fallback handling: If translation fails, returns English result gracefully
- **Chrome Built-in AI**: Resolved "NotAllowedError: The requested language options are not supported" errors
- **Chrome Built-in AI**: Resolved "No output language was specified in Writer API request" warnings
- **ALL AI Providers**: Fixed validate function knowledge cutoff issue for Built-in AI, Gemini, and OpenAI-compatible providers
  - Added temporal context to prevent AI from treating 2024-2025 events as speculation
  - Now injects current date into prompts: "Today's date is [current date]"
  - Prevents false positives when analyzing recent/current-date content
  - Enhanced prompt structure with 6-point credibility analysis format
  - Applied uniformly across all three AI provider implementations

### Changed
- Updated INTRODUCTION.md to remove incorrect `chrome.scripting` API reference
- Clarified permission usage in documentation
- Content script continues to work via declarative manifest configuration
- Added console logging for translation operations in Chrome Built-in AI functions

### Technical Details
- Extension uses static content_scripts declaration which does NOT require `scripting` permission
- Only dynamic script injection via `chrome.scripting.executeScript()` requires the permission
- All features (text selection, AI processing, side panel) continue to work without the permission

## [2.0.0] - 2025-10-26

### Added
- Complete architectural refactoring to modular component-based structure
- New utility layer with helper functions and constants
- Enhanced type definitions with comprehensive TypeScript support
- Component-based UI architecture with reusable components
- Session management service with full lifecycle support
- Enhanced AI service with custom prompt support
- Improved storage service with session history management
- Voice handling with proper state management
- Settings management with comprehensive preferences
- Export functionality with multiple formats (JSON/Markdown)
- Enhanced error handling and logging
- Performance optimizations and memory management

### 3. Fázis: Component alapú UI refaktorálása
- [x] PromptInput komponens létrehozása teljes JSDoc dokumentációval
- [x] LoadingIndicator komponens létrehozása teljes JSDoc dokumentációval
- [x] ResultCard komponens létrehozása teljes JSDoc dokumentációval
- [x] VoiceHandler komponens létrehozása teljes JSDoc dokumentációval
- [x] Minden komponenshez külön CSS fájlok létrehozása reszponzív dizájnnal
- [x] Komponensek közötti eseménykezelés implementálása
- [x] Teljes JSDoc dokumentáció minden komponenshez

### 4. Fázis: Service rétegek frissítése
- [x] UIService frissítése új komponens struktúrához
- [x] SessionService integrációja UIService-be
- [x] Eseményvezérelt kommunikáció komponensekkel
- [x] TypeScript hibák javítása és típusbiztonság
- [x] Teljes JSDoc dokumentáció minden service-hez

### 5. Fázis: Fő kontrollerek refaktorálása
- [x] Sidebar kontroller frissítése új komponens struktúrához
- [x] Komponens alapú eseménykezelés implementálása
- [x] Modularizált architektúra bevezetése
- [x] TypeScript hibák javítása és típusbiztonság
- [x] Teljes JSDoc dokumentáció minden kontrollerhez

### 6. Fázis: Integráció és tesztelés
- [x] Összes komponens integrációja és tesztelése
- [x] Teljes architektúra refaktorálás befejezése
- [x] JSDoc dokumentáció teljes körű frissítése
- [x] Background.ts frissítése új struktúrához és JSDoc dokumentációval
- [x] Content.ts frissítése új service réteggel és JSDoc dokumentációval
- [x] CSS_CLASSES konstansok kiegészítése hiányzó értékekkel
- [x] Felesleges fájlok törlése (VoiceHandler.ts, storage.ts, extension.ts)
- [x] Végső tesztelés és hibajavítás

### 🎯 Projekt állapota: KÉSZ
A Dude Chrome Extension teljes architekturális refaktorálása sikeresen befejeződött a task.md-ben meghatározott fejlesztési terv szerint.

### Changed
- Refactored from monolithic to modular architecture
- Migrated from inline styles to component-based CSS
- Improved type safety throughout the application
- Enhanced event handling with proper delegation
- Optimized storage operations with better indexing
- Improved voice recognition and synthesis integration
- Enhanced theme management with CSS variables
- Better error handling with user-friendly messages

### Fixed
- TypeScript compilation issues with proper type definitions
- Import path resolution problems
- Memory leaks in event listeners
- Session persistence issues
- Voice state management problems
- Settings synchronization issues
- Export functionality bugs
- UI state management inconsistencies

### Deprecated
- Legacy inline event handlers
- Old storage format (migrated to new session-based format)
- Deprecated utility functions (replaced with centralized helpers)

### Security
- Enhanced input sanitization with DOMPurify
- Improved content security policies
- Better validation of user inputs
- Secure storage operations with proper error handling

### Performance
- Optimized component rendering with virtual DOM techniques
- Improved memory management with proper cleanup
- Enhanced storage operations with batching
- Better event delegation to reduce memory footprint
- Optimized AI service calls with caching

## [1.0.0] - 2024-XX-XX

### Added
- Initial release of Dude Chrome Extension
- AI-powered text processing (summarize, translate, validate, rewrite)
- Voice input and output capabilities
- Session management and history
- Custom prompt functionality
- Settings and preferences management
- Export functionality (JSON/Markdown)
- Multi-language support
- Dark/light theme support
