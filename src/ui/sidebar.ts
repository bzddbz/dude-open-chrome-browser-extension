/**
 * Main sidebar controller class
 * Manages UI interactions, AI operations, and text selection
 * @since 1.0.0
 */

import { aiService } from '@/services/ai.service';
import { chromeBuiltin } from '../core/chrome-builtin';
import { TextOperationType, TextOperationResult, CONFIG } from '../types/index';
import { obfuscateApiKey, deobfuscateApiKey } from '../utils/crypto';

/**
 * Simple sidebar implementation without complex component architecture
 */
export class Sidebar {
    private container!: HTMLElement;
    private textarea!: HTMLTextAreaElement;
    private resultsContainer!: HTMLElement;
    private selectedText: string = '';
    private results: TextOperationResult[] = [];
    // Voice synthesis state
    private isSpeaking: boolean = false;
    private activeSpeakCardId: string | null = null;
    private currentUtterance: SpeechSynthesisUtterance | null = null;

    constructor() {
        this.initializeUI();
        this.initializeSettings();
        this.setupEventListeners();
        this.loadStoredData();
        this.loadHistory();
    }

    /**
     * Initialize the user interface
     * @since 1.0.0
     */
    private initializeUI(): void {
        // The HTML already exists in index.html, just get references to elements
        this.container = document.body;
        
        if (!this.container) {
            throw new Error('Document body not found');
        }

        // Get references to important elements from the existing HTML
        this.textarea = document.getElementById('selected-text') as HTMLTextAreaElement;
        this.resultsContainer = document.getElementById('results-section') as HTMLElement;
        
        if (!this.textarea) {
            throw new Error('Selected text textarea not found');
        }
        
        if (!this.resultsContainer) {
            throw new Error('Results container not found');
        }
    }

    /**
     * Initialize settings dropdowns and inputs
     * @since 1.0.0
     */
    private async initializeSettings(): Promise<void> {
        // Populate target language dropdown
        const targetLanguageSelect = document.getElementById('target-language') as HTMLSelectElement;
        if (targetLanguageSelect) {
            CONFIG.TRANSLATION.LANGUAGES.SUPPORTED.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.code;
                option.textContent = `${lang.nativeName} (${lang.name})`;
                targetLanguageSelect.appendChild(option);
            });
            // Set default
            targetLanguageSelect.value = CONFIG.TRANSLATION.DEFAULT_TARGET_LANGUAGE;
        }

        // Populate source language dropdown
        const sourceLanguageSelect = document.getElementById('source-language') as HTMLSelectElement;
        if (sourceLanguageSelect) {
            // Add auto-detect option first
            const autoOption = document.createElement('option');
            autoOption.value = 'auto';
            autoOption.textContent = 'Auto-detect';
            sourceLanguageSelect.appendChild(autoOption);
            
            // Add language options
            CONFIG.TRANSLATION.LANGUAGES.SUPPORTED.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.code;
                option.textContent = `${lang.nativeName} (${lang.name})`;
                sourceLanguageSelect.appendChild(option);
            });
            // Set default
            sourceLanguageSelect.value = CONFIG.TRANSLATION.DEFAULT_SOURCE_LANGUAGE;
        }

        // Load saved settings
        try {
            const stored = await chrome.storage.local.get('userPreferences');
            const prefs = stored.userPreferences;
            
            if (prefs) {
                console.log('📥 Loading saved settings:', prefs);
                
                // Translation
                if (prefs.translation) {
                    if (targetLanguageSelect) targetLanguageSelect.value = prefs.translation.targetLanguage || CONFIG.TRANSLATION.DEFAULT_TARGET_LANGUAGE;
                    if (sourceLanguageSelect) sourceLanguageSelect.value = prefs.translation.sourceLanguage || CONFIG.TRANSLATION.DEFAULT_SOURCE_LANGUAGE;
                    const autoDetect = document.getElementById('auto-detect') as HTMLInputElement;
                    if (autoDetect) autoDetect.checked = prefs.translation.autoDetect ?? true;
                    const autoTranslate = document.getElementById('auto-translate-response') as HTMLInputElement;
                    if (autoTranslate) autoTranslate.checked = prefs.translation.autoTranslateResponse ?? false;
                }
                
                // Summarization
                if (prefs.summarization) {
                    const summaryLength = document.getElementById('summary-length') as HTMLSelectElement;
                    if (summaryLength) summaryLength.value = prefs.summarization.length || 'medium';
                    const summaryType = document.getElementById('summary-type') as HTMLSelectElement;
                    if (summaryType) summaryType.value = prefs.summarization.type || 'key-points';
                    const summaryFormat = document.getElementById('summary-format') as HTMLSelectElement;
                    if (summaryFormat) summaryFormat.value = prefs.summarization.format || 'markdown';
                }
                
                // Validation
                if (prefs.validation) {
                    const validationStrictness = document.getElementById('validation-strictness') as HTMLSelectElement;
                    if (validationStrictness) validationStrictness.value = prefs.validation.strictness || 'medium';
                    const factCheckLevel = document.getElementById('fact-check-level') as HTMLSelectElement;
                    if (factCheckLevel) factCheckLevel.value = prefs.validation.factCheckLevel || 'standard';
                    const checkSources = document.getElementById('check-sources') as HTMLInputElement;
                    if (checkSources) checkSources.checked = prefs.validation.checkSources ?? false;
                }
                
                // Rewrite
                if (prefs.rewrite) {
                    const rewriteStyle = document.getElementById('rewrite-style') as HTMLSelectElement;
                    if (rewriteStyle) rewriteStyle.value = prefs.rewrite.style || 'neutral';
                    const rewriteTone = document.getElementById('rewrite-tone') as HTMLSelectElement;
                    if (rewriteTone) rewriteTone.value = prefs.rewrite.tone || 'professional';
                    const rewriteComplexity = document.getElementById('rewrite-complexity') as HTMLSelectElement;
                    if (rewriteComplexity) rewriteComplexity.value = prefs.rewrite.complexity || 'intermediate';
                }
                
                // Storage
                if (prefs.storage) {
                    const historyLimit = document.getElementById('history-limit') as HTMLSelectElement;
                    if (historyLimit) historyLimit.value = String(prefs.storage.historyLimit || 50);
                    const exportFormat = document.getElementById('export-format') as HTMLSelectElement;
                    if (exportFormat) exportFormat.value = prefs.storage.exportFormat || 'json';
                    const autoSave = document.getElementById('auto-save') as HTMLInputElement;
                    if (autoSave) autoSave.checked = prefs.storage.autoSave ?? true;
                    const autoSaveOnChange = document.getElementById('auto-save-on-selection-change') as HTMLInputElement;
                    if (autoSaveOnChange) autoSaveOnChange.checked = prefs.storage.autoSaveOnSelectionChange ?? false;
                }
                
                // General
                if (prefs.general) {
                    const theme = document.getElementById('theme') as HTMLSelectElement;
                    if (theme) theme.value = prefs.general.theme || 'dark';
                    const animations = document.getElementById('animations') as HTMLInputElement;
                    if (animations) animations.checked = prefs.general.animations ?? true;
                    const notifications = document.getElementById('notifications') as HTMLInputElement;
                    if (notifications) notifications.checked = prefs.general.notifications ?? true;
                }
                
                // Gemini
                if (prefs.gemini) {
                    const geminiApiKey = document.getElementById('gemini-api-key') as HTMLInputElement;
                    // Deobfuscate API key when loading
                    if (geminiApiKey) geminiApiKey.value = deobfuscateApiKey(prefs.gemini.apiKey || '');
                    const geminiModel = document.getElementById('gemini-model') as HTMLSelectElement;
                    if (geminiModel) geminiModel.value = prefs.gemini.model || 'gemini-2.0-flash-exp';
                    const geminiCloudFirst = document.getElementById('gemini-cloud-first') as HTMLInputElement;
                    if (geminiCloudFirst) geminiCloudFirst.checked = prefs.gemini.cloudFirst ?? false;
                }
                
                // OpenAI-compatible (local AI providers)
                if (prefs.openaiCompatible) {
                    const openaiEnabled = document.getElementById('openai-enabled') as HTMLInputElement;
                    if (openaiEnabled) openaiEnabled.checked = prefs.openaiCompatible.enabled ?? false;
                    const openaiProvider = document.getElementById('openai-provider') as HTMLSelectElement;
                    if (openaiProvider) openaiProvider.value = prefs.openaiCompatible.provider || 'ollama';
                    const openaiBaseUrl = document.getElementById('openai-base-url') as HTMLInputElement;
                    if (openaiBaseUrl) openaiBaseUrl.value = prefs.openaiCompatible.baseUrl || 'http://localhost:11434';
                    const openaiModel = document.getElementById('openai-model') as HTMLInputElement;
                    if (openaiModel) openaiModel.value = prefs.openaiCompatible.model || 'llama3:8b';
                    const openaiApiKey = document.getElementById('openai-api-key') as HTMLInputElement;
                    if (openaiApiKey) openaiApiKey.value = deobfuscateApiKey(prefs.openaiCompatible.apiKey || '');
                }
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    /**
     * Setup event listeners for UI interactions
     * @since 1.0.0
     */
    private setupEventListeners(): void {
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        settingsBtn?.addEventListener('click', () => this.handleSettings());
        
        // Close settings button
        const closeSettingsBtn = document.getElementById('close-settings');
        closeSettingsBtn?.addEventListener('click', () => this.handleCloseSettings());
        
        // Save settings button
        const saveSettingsBtn = document.getElementById('save-settings');
        saveSettingsBtn?.addEventListener('click', () => this.handleSaveSettings());
        
        // Custom prompt button
        const sendPromptBtn = document.getElementById('send-prompt-btn');
        sendPromptBtn?.addEventListener('click', () => this.handleCustomPrompt());
        
        // Prompt input - handle Enter key
        const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
        promptInput?.addEventListener('keypress', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                this.handleCustomPrompt();
            }
        });
        
        // Function buttons
        const functionButtons = this.container.querySelectorAll('.function-btn');
        functionButtons.forEach(button => {
            button.addEventListener('click', (e: Event) => {
                const target = e.currentTarget as HTMLElement;
                const operation = target.id.replace('-btn', '') as TextOperationType;
                this.handleProcessText(operation);
            });
        });

        // Action buttons
        const saveBtn = this.container.querySelector('#save-btn');
        const exportBtn = this.container.querySelector('#export-btn');
        const clearSessionBtn = this.container.querySelector('#clear-session-btn');
        const clearTextBtn = this.container.querySelector('#clear-text-btn');

        saveBtn?.addEventListener('click', () => this.handleSave());
        exportBtn?.addEventListener('click', () => this.handleExport());
        clearSessionBtn?.addEventListener('click', () => this.handleClearSession());
        clearTextBtn?.addEventListener('click', () => this.handleClearText());

        // History buttons
        const exportAllHistoryBtn = document.getElementById('export-all-history-btn');
        const clearAllHistoryBtn = document.getElementById('clear-all-history-btn');
        
        exportAllHistoryBtn?.addEventListener('click', () => this.handleExportAllHistory());
        clearAllHistoryBtn?.addEventListener('click', () => this.handleClearAllHistory());

        // Character count
        this.textarea?.addEventListener('input', () => this.updateCharCount());

        // Listen for messages from content script
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === 'updateSelectedText') {
                this.updateSelectedText(request.data?.text || '');
            }
        });
    }

    /**
     * Handle text processing with AI
     * @param operation - The operation type to perform
     * @since 1.0.0
     */
    private async handleProcessText(operation: TextOperationType): Promise<void> {
        console.log('🔵 handleProcessText called:', operation, 'text length:', this.selectedText.length);
        if (!this.selectedText.trim()) {
            this.showMessage('Please select some text first', 'warning');
            return;
        }

        try {
            this.showLoading(true, `Processing ${operation}...`);
            
            // Use unified bridge to ensure provider is correctly set (gemini vs built-in)
            const result: TextOperationResult = await aiService.processText(this.selectedText, operation);

            // Display the result
            this.displayResult(operation, result);
            this.showMessage(`${operation} completed successfully`, 'success');

        } catch (error: any) {
            console.error('❌ Error processing:', operation, error);
            this.showMessage(`Failed to ${operation}: ${error.message || error}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Display processing result
     * @param operation - Operation type
     * @param result - Processing result
     * @since 1.0.0
     */
    private displayResult(operation: TextOperationType, result: TextOperationResult): void {
        console.log('🟢 displayResult called:', operation, 'result:', result);
        
        // Hide all result cards first
        const allResultCards = this.resultsContainer.querySelectorAll('.result-card');
        console.log('🔵 Found result cards:', allResultCards.length);
        allResultCards.forEach(card => card.classList.add('hidden'));

        // Map operation type to HTML element ID
        const operationToIdMap: Record<string, string> = {
            'summarize': 'summary-result',
            'translate': 'translation-result',
            'validate': 'validation-result',
            'rewrite': 'rewrite-result',
            'custom-prompt': 'prompt-result'
        };
        
        const resultCardId = operationToIdMap[operation] || `${operation}-result`;
        console.log('🔵 Looking for result card:', resultCardId);
        const resultCard = this.container.querySelector(`#${resultCardId}`) as HTMLElement;
        
        if (resultCard) {
            console.log('🟢 Result card found:', resultCard);
            const contentDiv = resultCard.querySelector('.result-content') as HTMLElement;
            if (contentDiv) {
                console.log('🟢 Content div found, setting text...');
                contentDiv.textContent = result.processedText;
            } else {
                console.log('❌ Content div NOT found');
            }
            resultCard.classList.remove('hidden');
            
            // Add to results array
            this.results.push(result);

            // Wire up the voice button for this specific card
            const voiceBtn = resultCard.querySelector('.result-voice-btn') as HTMLButtonElement | null;
            if (voiceBtn) {
                // Remove old listeners by cloning
                const newBtn = voiceBtn.cloneNode(true) as HTMLButtonElement;
                voiceBtn.parentNode?.replaceChild(newBtn, voiceBtn);
                newBtn.addEventListener('click', () => this.handleResultVoiceToggle(resultCard, result));
            }
        } else {
            console.log('❌ Result card NOT found for:', resultCardId);
        }

        // Show results section
        console.log('🟢 Showing results section');
        this.resultsContainer.classList.remove('hidden');
    }

    /**
     * Toggle voice output for a result card using Web Speech API with language detection
     */
    private async handleResultVoiceToggle(resultCard: HTMLElement, result: TextOperationResult): Promise<void> {
        console.log('🎤 Voice toggle requested');
        const btn = resultCard.querySelector('.result-voice-btn') as HTMLButtonElement | null;
        const icon = btn?.querySelector('.material-icons') as HTMLElement | null;
        // Use the actual processed text from result, not DOM content
        const text = result.processedText?.trim() || '';
        const cardId = resultCard.id;

        console.log('🎤 Text to speak:', text.substring(0, 100), 'length:', text.length);

        if (!text) {
            console.warn('❌ No text to read aloud');
            this.showMessage('Nothing to read aloud', 'warning');
            return;
        }

        if (this.isSpeaking && this.activeSpeakCardId === cardId) {
            console.log('⏹️ Stopping speech (same card)');
            this.stopSpeaking(btn, icon);
            return;
        }
        if (this.isSpeaking && this.activeSpeakCardId !== cardId) {
            console.log('⏹️ Stopping speech (different card)');
            this.stopSpeaking();
        }

        try {
            console.log('🔍 Detecting language...');
            const detected = await this.detectLanguageSafe(text);
            console.log('✅ Detected language:', detected);
            
            const locale = this.mapLanguageToLocale(detected);
            console.log('🌍 Mapped to locale:', locale);
            
            // Check if speech synthesis is available
            if (!window.speechSynthesis) {
                console.error('❌ Speech synthesis not available');
                this.showMessage('Speech synthesis not supported in this browser', 'error');
                return;
            }

            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = locale;
            utter.rate = 1.0;
            utter.pitch = 1.0;
            utter.volume = 1.0;

            const synth = window.speechSynthesis;
            const voices = synth?.getVoices?.() || [];
            console.log('🔊 Available voices:', voices.length);
            
            const match = voices.find(v => v.lang?.toLowerCase() === locale.toLowerCase())
                       || voices.find(v => v.lang?.toLowerCase().startsWith((locale.split('-')[0] || '').toLowerCase()));
            if (match) {
                console.log('✅ Found matching voice:', match.name, match.lang);
                utter.voice = match as SpeechSynthesisVoice;
            } else {
                console.warn('⚠️ No matching voice found for', locale, '- using default');
            }

            utter.onstart = () => {
                console.log('▶️ Speech started');
                this.isSpeaking = true;
                this.activeSpeakCardId = cardId;
                if (btn) btn.classList.add('speaking');
                if (icon) icon.textContent = 'stop';
            };
            utter.onend = () => {
                console.log('⏹️ Speech ended');
                this.isSpeaking = false;
                this.activeSpeakCardId = null;
                if (btn) btn.classList.remove('speaking');
                if (icon) icon.textContent = 'volume_up';
                this.currentUtterance = null;
            };
            utter.onerror = (event: SpeechSynthesisErrorEvent) => {
                console.error('❌ Speech synthesis error:', event.error, event);
                this.isSpeaking = false;
                this.activeSpeakCardId = null;
                if (btn) btn.classList.remove('speaking');
                if (icon) icon.textContent = 'volume_up';
                this.currentUtterance = null;
                this.showMessage(`Speech error: ${event.error}`, 'error');
            };

            this.currentUtterance = utter;
            console.log('🎤 Starting speech synthesis...');
            window.speechSynthesis.speak(utter);
        } catch (e) {
            console.error('❌ Failed to start speech synthesis:', e);
            this.showMessage('Failed to start speech synthesis', 'error');
        }
    }

    private stopSpeaking(btn?: HTMLButtonElement | null, icon?: HTMLElement | null): void {
        try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
        this.isSpeaking = false;
        this.activeSpeakCardId = null;
        this.currentUtterance = null;
        if (btn) btn.classList.remove('speaking');
        if (icon) icon.textContent = 'volume_up';
        const all = this.container.querySelectorAll('.result-voice-btn.speaking');
        all.forEach(el => el.classList.remove('speaking'));
        const icons = this.container.querySelectorAll('.result-voice-btn .material-icons');
        icons.forEach(i => { (i as HTMLElement).textContent = 'volume_up'; });
    }

    private async detectLanguageSafe(text: string): Promise<string> {
        try {
            console.log('🔍 Calling chromeBuiltin.detectLanguage with text length:', text.length);
            const detected = await chromeBuiltin.detectLanguage(text);
            console.log('✅ Language detection result:', detected);
            
            // Handle array response from language detector
            if (Array.isArray(detected) && detected.length > 0) {
                const firstResult = detected[0];
                if (firstResult && firstResult.detectedLanguage) {
                    console.log('✅ Extracted language code:', firstResult.detectedLanguage);
                    return firstResult.detectedLanguage;
                }
            }
            
            // Handle string response (backward compat)
            if (typeof detected === 'string') {
                return detected;
            }
            
            console.warn('⚠️ Unexpected detection format, defaulting to en');
            return 'en';
        } catch (e) {
            console.warn('⚠️ Language detection failed, defaulting to en:', e);
            return 'en';
        }
    }

    private mapLanguageToLocale(code: string): string {
        // Handle undefined/unknown language
        if (!code || code === 'und' || code === 'unknown') {
            console.log('⚠️ Unknown language code, defaulting to en-US');
            return 'en-US';
        }
        
        const map: Record<string, string> = {
            en: 'en-US', hu: 'hu-HU', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN',
            ja: 'ja-JP', ko: 'ko-KR', ru: 'ru-RU', pt: 'pt-PT', it: 'it-IT', ar: 'ar-SA',
            hi: 'hi-IN', th: 'th-TH', vi: 'vi-VN'
        };
        const short = code.toLowerCase();
        return map[short] || 'en-US';
    }

    /**
     * Update selected text and show action section
     * @param text - The selected text
     * @since 1.0.0
     */
    private updateSelectedText(text: string): void {
        this.selectedText = text;
        if (this.textarea) {
            this.textarea.value = text;
            this.updateCharCount();
        }
        
        // Show action section and hide hero when text is selected
        if (text.trim()) {
            const heroSection = document.getElementById('hero-section');
            const actionSection = document.getElementById('action-section');
            
            if (heroSection) {
                heroSection.classList.add('hidden');
            }
            if (actionSection) {
                actionSection.classList.remove('hidden');
            }
        }
    }

    /**
     * Update character count display
     * @since 1.0.0
     */
    private updateCharCount(): void {
        const charCount = this.textarea?.value.length || 0;
        const charCountElement = this.container.querySelector('#char-count') as HTMLElement;
        if (charCountElement) {
            charCountElement.textContent = charCount.toString();
        }
    }

    /**
     * Handle save operation
     * @since 1.0.0
     */
    private async handleSave(): Promise<void> {
        try {
            // Save current session
            await chrome.storage.local.set({
                'current-session': {
                    selectedText: this.selectedText,
                    results: this.results,
                    timestamp: Date.now()
                }
            });
            
            // Save to history
            await this.saveToHistory();
            
            this.showMessage('Session saved successfully!', 'success');
        } catch (error: any) {
            console.error('Save failed:', error);
            this.showMessage('Failed to save session', 'error');
        }
    }

    /**
     * Handle export operation
     * @since 1.0.0
     */
    private handleExport(): void {
        try {
            const exportData = {
                selectedText: this.selectedText,
                results: this.results,
                timestamp: Date.now()
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `dude-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showMessage('Export completed successfully!', 'success');
        } catch (error: any) {
            console.error('Export failed:', error);
            this.showMessage('Failed to export data', 'error');
        }
    }

    /**
     * Handle clear session operation
     * @since 1.0.0
     */
    private handleClearSession(): void {
        if (confirm('Are you sure you want to clear the current session?')) {
            this.selectedText = '';
            this.results = [];
            
            if (this.textarea) {
                this.textarea.value = '';
            }
            
            // Hide all result cards
            const allResultCards = this.resultsContainer.querySelectorAll('.result-card');
            allResultCards.forEach(card => card.classList.add('hidden'));
            
            this.resultsContainer.classList.add('hidden');
            this.updateCharCount();
            
            this.showMessage('Session cleared successfully!', 'success');
        }
    }

    /**
     * Clear selected text
     * @since 1.0.0
     */
    private handleClearText(): void {
        this.selectedText = '';
        if (this.textarea) {
            this.textarea.value = '';
        }
        this.updateCharCount();
        
        // Show hero section and hide action section
        const heroSection = document.getElementById('hero-section');
        const actionSection = document.getElementById('action-section');
        
        if (heroSection) {
            heroSection.classList.remove('hidden');
        }
        if (actionSection) {
            actionSection.classList.add('hidden');
        }
        
        this.showMessage('Text cleared', 'info');
    }

    /**
     * Load stored data from storage
     * @since 1.0.0
     */
    private async loadStoredData(): Promise<void> {
        try {
            const stored = await chrome.storage.local.get('current-session');
            if (stored['current-session']) {
                const session = stored['current-session'];
                this.selectedText = session.selectedText || '';
                this.results = session.results || [];
                
                if (this.textarea) {
                    this.textarea.value = this.selectedText;
                }
                
                this.updateCharCount();
            }
        } catch (error) {
            console.error('Failed to load stored data:', error);
        }
    }

    /**
     * Show loading indicator
     * @param show - Whether to show loading
     * @param message - Loading message
     * @since 1.0.0
     */
    private showLoading(show: boolean, message?: string): void {
        const loader = document.getElementById('loader') as HTMLElement;
        if (loader) {
            if (show) {
                loader.style.display = 'flex';
                const loaderText = loader.querySelector('.loader-text') as HTMLElement;
                if (loaderText && message) {
                    loaderText.textContent = message;
                }
            } else {
                loader.style.display = 'none';
            }
        }
    }

    /**
     * Show message to user
     * @param message - Message text
     * @param type - Message type (success, error, warning, info)
     * @since 1.0.0
     */
    private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
        const messageContainer = document.getElementById('message-container') as HTMLElement;
        if (messageContainer) {
            const messageElement = document.createElement('div');
            messageElement.className = `message message-${type}`;
            messageElement.textContent = message;
            
            messageContainer.appendChild(messageElement);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 3000);
        }
    }

    /**
     * Handle custom prompt submission
     * @since 1.0.0
     */
    private async handleCustomPrompt(): Promise<void> {
        const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
        const userPrompt = promptInput?.value.trim();
        
        console.log('🔵 handleCustomPrompt called, prompt:', userPrompt);
        
        if (!userPrompt) {
            this.showMessage('Please enter a prompt', 'warning');
            return;
        }
        
        if (!this.selectedText.trim()) {
            this.showMessage('Please select some text first', 'warning');
            return;
        }

        try {
            this.showLoading(true, 'Processing custom prompt...');
            
            console.log('🔵 Calling customPrompt...');
            const processedText = await aiService.customPrompt(userPrompt, this.selectedText);
            console.log('🟢 Custom prompt result:', processedText?.substring(0, 100));

            // Create result object
            const result: TextOperationResult = {
                originalText: this.selectedText,
                processedText: processedText,
                operationType: 'custom-prompt' as TextOperationType,
                provider: 'built-in',
                timestamp: Date.now(),
                userPrompt: userPrompt
            };

            console.log('🟢 Calling displayResult for custom prompt...');
            this.displayResult('custom-prompt' as TextOperationType, result);
            this.showMessage('Custom prompt completed successfully', 'success');
            
            // Clear prompt input
            if (promptInput) {
                promptInput.value = '';
            }

        } catch (error: any) {
            console.error('❌ Error processing custom prompt:', error);
            this.showMessage(`Failed to process prompt: ${error.message || error}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Load and display history
     * @since 1.0.0
     */
    private async loadHistory(): Promise<void> {
        try {
            const stored = await chrome.storage.local.get('history');
            const history = stored.history || [];
            
            const historyList = document.getElementById('history-list');
            const historySection = document.getElementById('history-section');
            if (!historyList) return;
            
            if (history.length === 0) {
                historyList.innerHTML = '<p class="text-subtle-dark text-sm">No history yet</p>';
                // Hide history section if no history
                if (historySection) {
                    historySection.classList.add('hidden');
                }
                return;
            }
            
            // Show history section if we have history
            if (historySection) {
                historySection.classList.remove('hidden');
            }
            
            // Reverse to show newest first
            const sortedHistory = [...history].reverse();
            
            historyList.innerHTML = sortedHistory.map((item: any, index: number) => {
                const provider = item.provider || 'unknown';
                const providerIcon = provider === 'openai-compatible' ? '🖥️' : 
                                   provider === 'gemini' ? '☁️' : 
                                   provider === 'built-in' ? '🤖' : '❓';
                const date = new Date(item.timestamp).toLocaleString('hu-HU', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                return `
                    <div class="history-item" data-history-index="${history.length - 1 - index}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.75rem; color: var(--color-primary); text-transform: uppercase; font-weight: 600;">${providerIcon} ${item.operationType}</span>
                            <span style="font-size: 0.7rem; color: var(--color-subtle-dark);">${date}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--color-text-dark); margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${item.originalText}</div>
                        <div style="font-size: 0.75rem; color: var(--color-subtle-dark); margin-bottom: 8px;">Provider: ${provider}</div>
                        <div style="display: flex; gap: 8px;">
                            <button class="history-restore-btn" data-history-index="${history.length - 1 - index}" title="Restore" style="flex: 1; padding: 6px; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 6px; color: var(--color-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 0.75rem;">
                                <span class="material-icons" style="font-size: 16px;">restore</span>
                                <span>Restore</span>
                            </button>
                            <button class="history-export-btn" data-history-index="${history.length - 1 - index}" title="Export" style="padding: 6px 8px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; color: var(--color-blue-400); cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                <span class="material-icons" style="font-size: 16px;">download</span>
                            </button>
                            <button class="history-delete-btn" data-history-index="${history.length - 1 - index}" title="Delete" style="padding: 6px 8px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; color: var(--color-red-400); cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                <span class="material-icons" style="font-size: 16px;">delete</span>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Add event listeners to history item buttons
            historyList.querySelectorAll('.history-restore-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt((e.currentTarget as HTMLElement).dataset.historyIndex || '0');
                    this.handleRestoreHistory(index);
                });
            });
            
            historyList.querySelectorAll('.history-export-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt((e.currentTarget as HTMLElement).dataset.historyIndex || '0');
                    this.handleExportHistoryItem(index);
                });
            });
            
            historyList.querySelectorAll('.history-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt((e.currentTarget as HTMLElement).dataset.historyIndex || '0');
                    this.handleDeleteHistoryItem(index);
                });
            });
            
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    /**
     * Save current session to history
     * @since 1.0.0
     */
    private async saveToHistory(): Promise<void> {
        // Only save the last (most recent) result, not all results
        if (this.results.length === 0) return;
        
        try {
            const stored = await chrome.storage.local.get('history');
            const history = stored.history || [];
            
            // Add only the LAST result (most recent operation) to history
            const lastResult = this.results[this.results.length - 1];
            history.push(lastResult);
            
            // Get history limit from settings
            const prefs = await chrome.storage.local.get('prefs');
            const historyLimit = prefs?.prefs?.userSettings?.storage?.historyLimit || 50;
            
            // Keep only the last N items
            const trimmedHistory = history.slice(-historyLimit);
            
            await chrome.storage.local.set({ 'history': trimmedHistory });
            
            console.log('💾 Saved to history:', trimmedHistory.length, 'items');
            await this.loadHistory();
        } catch (error) {
            console.error('Failed to save to history:', error);
        }
    }

    /**
     * Restore a history item
     * @since 1.0.0
     */
    private async handleRestoreHistory(index: number): Promise<void> {
        try {
            const stored = await chrome.storage.local.get('history');
            const history = stored.history || [];
            const item = history[index];
            
            if (item) {
                this.selectedText = item.originalText;
                if (this.textarea) {
                    this.textarea.value = item.originalText;
                }
                this.updateCharCount();
                
                // Show action section
                const heroSection = document.getElementById('hero-section');
                const actionSection = document.getElementById('action-section');
                if (heroSection) heroSection.classList.add('hidden');
                if (actionSection) actionSection.classList.remove('hidden');
                
                // Display the result
                this.displayResult(item.operationType, item);
                
                this.showMessage('History item restored', 'success');
            }
        } catch (error) {
            console.error('Failed to restore history:', error);
            this.showMessage('Failed to restore history item', 'error');
        }
    }

    /**
     * Export a single history item
     * @since 1.0.0
     */
    private async handleExportHistoryItem(index: number): Promise<void> {
        try {
            const stored = await chrome.storage.local.get('history');
            const history = stored.history || [];
            const item = history[index];
            
            if (item) {
                const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `dude-history-${item.operationType}-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showMessage('History item exported', 'success');
            }
        } catch (error) {
            console.error('Failed to export history item:', error);
            this.showMessage('Failed to export history item', 'error');
        }
    }

    /**
     * Delete a single history item
     * @since 1.0.0
     */
    private async handleDeleteHistoryItem(index: number): Promise<void> {
        try {
            const stored = await chrome.storage.local.get('history');
            const history = stored.history || [];
            
            history.splice(index, 1);
            
            await chrome.storage.local.set({ 'history': history });
            await this.loadHistory();
            
            this.showMessage('History item deleted', 'success');
        } catch (error) {
            console.error('Failed to delete history item:', error);
            this.showMessage('Failed to delete history item', 'error');
        }
    }

    /**
     * Export all history
     * @since 1.0.0
     */
    private async handleExportAllHistory(): Promise<void> {
        try {
            const stored = await chrome.storage.local.get('history');
            const history = stored.history || [];
            
            if (history.length === 0) {
                this.showMessage('No history to export', 'warning');
                return;
            }
            
            const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `dude-history-all-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showMessage(`Exported ${history.length} history items`, 'success');
        } catch (error) {
            console.error('Failed to export all history:', error);
            this.showMessage('Failed to export history', 'error');
        }
    }

    /**
     * Clear all history
     * @since 1.0.0
     */
    private async handleClearAllHistory(): Promise<void> {
        if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) {
            return;
        }
        
        try {
            await chrome.storage.local.set({ 'history': [] });
            await this.loadHistory();
            
            this.showMessage('All history cleared', 'success');
        } catch (error) {
            console.error('Failed to clear history:', error);
            this.showMessage('Failed to clear history', 'error');
        }
    }

    /**
     * Handle settings button click
     * @since 1.0.0
     */
    private handleSettings(): void {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.remove('hidden');
        }
    }

    /**
     * Handle close settings button click
     * @since 1.0.0
     */
    private handleCloseSettings(): void {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.add('hidden');
        }
    }

    /**
     * Handle save settings button click
     * @since 1.0.0
     */
    private async handleSaveSettings(): Promise<void> {
        try {
            // Get all settings values
            const settings = {
                // Translation
                targetLanguage: (document.getElementById('target-language') as HTMLSelectElement)?.value,
                sourceLanguage: (document.getElementById('source-language') as HTMLSelectElement)?.value,
                autoDetect: (document.getElementById('auto-detect') as HTMLInputElement)?.checked,
                autoTranslateResponse: (document.getElementById('auto-translate-response') as HTMLInputElement)?.checked,
                
                // Summarization
                summaryLength: (document.getElementById('summary-length') as HTMLSelectElement)?.value,
                summaryType: (document.getElementById('summary-type') as HTMLSelectElement)?.value,
                summaryFormat: (document.getElementById('summary-format') as HTMLSelectElement)?.value,
                
                // Validation
                validationStrictness: (document.getElementById('validation-strictness') as HTMLSelectElement)?.value,
                factCheckLevel: (document.getElementById('fact-check-level') as HTMLSelectElement)?.value,
                checkSources: (document.getElementById('check-sources') as HTMLInputElement)?.checked,
                
                // Rewrite
                rewriteStyle: (document.getElementById('rewrite-style') as HTMLSelectElement)?.value,
                rewriteTone: (document.getElementById('rewrite-tone') as HTMLSelectElement)?.value,
                rewriteComplexity: (document.getElementById('rewrite-complexity') as HTMLSelectElement)?.value,
                
                // Storage
                historyLimit: parseInt((document.getElementById('history-limit') as HTMLSelectElement)?.value || '50'),
                exportFormat: (document.getElementById('export-format') as HTMLSelectElement)?.value,
                autoSave: (document.getElementById('auto-save') as HTMLInputElement)?.checked,
                autoSaveOnSelectionChange: (document.getElementById('auto-save-on-selection-change') as HTMLInputElement)?.checked,
                
                // General
                theme: (document.getElementById('theme') as HTMLSelectElement)?.value,
                animations: (document.getElementById('animations') as HTMLInputElement)?.checked,
                notifications: (document.getElementById('notifications') as HTMLInputElement)?.checked,
                
                // Gemini
                geminiApiKey: (document.getElementById('gemini-api-key') as HTMLInputElement)?.value,
                geminiModel: (document.getElementById('gemini-model') as HTMLSelectElement)?.value,
                geminiCloudFirst: (document.getElementById('gemini-cloud-first') as HTMLInputElement)?.checked,
                
                // OpenAI-compatible
                openaiEnabled: (document.getElementById('openai-enabled') as HTMLInputElement)?.checked,
                openaiProvider: (document.getElementById('openai-provider') as HTMLSelectElement)?.value,
                openaiBaseUrl: (document.getElementById('openai-base-url') as HTMLInputElement)?.value,
                openaiModel: (document.getElementById('openai-model') as HTMLInputElement)?.value,
                openaiApiKey: (document.getElementById('openai-api-key') as HTMLInputElement)?.value
            };

            console.log('💾 Saving settings (API keys will be obfuscated)');
            
            // Obfuscate API keys before saving
            const obfuscatedGeminiApiKey = obfuscateApiKey(settings.geminiApiKey);
            const obfuscatedOpenAIApiKey = obfuscateApiKey(settings.openaiApiKey);

            // Save to chrome.storage.local in the format that preferences service expects
            await chrome.storage.local.set({
                'prefs': {
                    defaultProviderId: undefined,
                    enabledFunctions: ['summarize','rewrite','validate','translate'],
                    providers: {},
                    ui: { 
                        debounceMs: 300, 
                        maxTextLength: 10000, 
                        theme: settings.theme 
                    },
                    userSettings: {
                        translation: {
                            targetLanguage: settings.targetLanguage,
                            sourceLanguage: settings.sourceLanguage,
                            autoDetect: settings.autoDetect,
                            autoTranslateResponse: settings.autoTranslateResponse
                        },
                        summarization: {
                            length: settings.summaryLength,
                            type: settings.summaryType,
                            format: settings.summaryFormat
                        },
                        validation: {
                            strictness: settings.validationStrictness,
                            factCheckLevel: settings.factCheckLevel,
                            checkSources: settings.checkSources
                        },
                        rewrite: {
                            style: settings.rewriteStyle,
                            tone: settings.rewriteTone,
                            complexity: settings.rewriteComplexity
                        },
                        storage: {
                            historyLimit: settings.historyLimit,
                            exportFormat: settings.exportFormat,
                            autoSave: settings.autoSave,
                            autoSaveOnSelectionChange: settings.autoSaveOnSelectionChange
                        },
                        general: {
                            theme: settings.theme,
                            animations: settings.animations,
                            notifications: settings.notifications
                        },
                        gemini: {
                            apiKey: obfuscatedGeminiApiKey,
                            selectedModel: settings.geminiModel,
                            cloudFirst: settings.geminiCloudFirst
                        },
                        openaiCompatible: {
                            enabled: settings.openaiEnabled,
                            provider: settings.openaiProvider,
                            baseUrl: settings.openaiBaseUrl,
                            model: settings.openaiModel,
                            apiKey: obfuscatedOpenAIApiKey
                        }
                    }
                },
                // Keep backward compatibility - also save separately
                'userPreferences': {
                    translation: {
                        targetLanguage: settings.targetLanguage,
                        sourceLanguage: settings.sourceLanguage,
                        autoDetect: settings.autoDetect,
                        autoTranslateResponse: settings.autoTranslateResponse
                    },
                    summarization: {
                        length: settings.summaryLength,
                        type: settings.summaryType,
                        format: settings.summaryFormat
                    },
                    validation: {
                        strictness: settings.validationStrictness,
                        factCheckLevel: settings.factCheckLevel,
                        checkSources: settings.checkSources
                    },
                    rewrite: {
                        style: settings.rewriteStyle,
                        tone: settings.rewriteTone,
                        complexity: settings.rewriteComplexity
                    },
                    storage: {
                        historyLimit: settings.historyLimit,
                        exportFormat: settings.exportFormat,
                        autoSave: settings.autoSave,
                        autoSaveOnSelectionChange: settings.autoSaveOnSelectionChange
                    },
                    general: {
                        theme: settings.theme,
                        animations: settings.animations,
                        notifications: settings.notifications
                    },
                    gemini: {
                        apiKey: obfuscatedGeminiApiKey,
                        model: settings.geminiModel,
                        cloudFirst: settings.geminiCloudFirst
                    },
                    openaiCompatible: {
                        enabled: settings.openaiEnabled,
                        provider: settings.openaiProvider,
                        baseUrl: settings.openaiBaseUrl,
                        model: settings.openaiModel,
                        apiKey: obfuscatedOpenAIApiKey
                    }
                },
                // Also save these separately for easier access by ai clients (obfuscated)
                'geminiApiKey': obfuscatedGeminiApiKey,
                'geminiModel': settings.geminiModel,
                'geminiCloudFirst': settings.geminiCloudFirst
            });

            console.log('✅ Settings saved successfully');
            this.showMessage('Settings saved successfully!', 'success');
            this.handleCloseSettings();
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            this.showMessage('Failed to save settings', 'error');
        }
    }
}
