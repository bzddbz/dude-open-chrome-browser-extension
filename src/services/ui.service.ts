/**
 * UI Service Layer for Dude Chrome Extension
 * Handles all UI operations and state management with component integration
 * @since 1.0.0
 */

import type { AppState, AIResult } from '../types/core'
import type { TextOperationResult, TextOperationType } from '@/types';
import { SessionService } from './session.service';
import { Utils } from '../utils/helpers';
import { CONFIG, CSS_CLASSES, EVENTS } from '../utils/constants';

/**
 * Main UI service class that manages all UI operations
 * Integrates with component system and session management
 */
export class UIService {
    private static instance: UIService;
    private state: AppState;
    private eventListeners: { element: Element; event: string; handler: EventListener }[] = [];
    private components: Map<string, any> = new Map();
    private sessionService: SessionService;

    private constructor() {
        this.sessionService = SessionService.getInstance();
        this.state = {
            selectedText: '',
            isProcessing: false,
            error: null,
            results: {},
            customPrompts: [],
            currentTab: null,
        };
    }

    /**
     * Get singleton instance of UIService
     * @returns UIService instance
     * @since 1.0.0
     */
    static getInstance(): UIService {
        if (!UIService.instance) {
            UIService.instance = new UIService();
        }
        return UIService.instance;
    }

    /**
     * Get current application state
     * @returns Current app state
     * @since 1.0.0
     */
    getState(): AppState {
        return { ...this.state };
    }

    /**
     * Update selected text with session management
     * @param text - Selected text content
     * @param title - Page title
     * @param url - Page URL
     * @returns Promise that resolves when update is complete
     * @since 1.0.0
     */
    async updateSelectedText(text: string, title: string, url: string): Promise<void> {
        const tabData = { id: Date.now().toString(), url, title };

        // Check if we need to switch tabs - more precise comparison
        const currentSession = this.sessionService.getCurrentSession();
        const needsTabSwitch = !currentSession || 
                                currentSession.tabData.url !== url || 
                                currentSession.tabData.title !== title;


        // Update UI state
        this.state.selectedText = text;
        this.state.currentTab = { id: Date.now().toString(), title, url };
        this.updateUIState();

        // Emit text selection event
        Utils.emit(EVENTS.TEXT_SELECTED, {
            text,
            title,
            url,
            timestamp: Date.now()
        });
    }

    /**
     * Clear all results and reset UI state
     * @since 1.0.0
     */
    clearResults(): void {
        this.state.results = {};
        this.state.customPrompts = [];
        this.updateUIState();
    }

    /**
     * Add result to current session
     * @param type - Result type identifier
     * @param content - Result content
     * @since 1.0.0
     */
    addResult(type: string, content: string): void {
        this.state.results[type] = {
            ai: 'built-in',
            type: type as any,
            result: content,
            originalText: this.state.selectedText,
            timestamp: Date.now()
        };
        this.updateUIState();
    }

    /**
     * Add custom prompt and response
     * @param prompt - User prompt
     * @param response - AI response
     * @since 1.0.0
     */
    addCustomPrompt(prompt: string, response: string): void {
        this.state.customPrompts.push({
            prompt,
            response,
            timestamp: Date.now()
        });
    }

    /**
     * Set processing state and update UI
     * @param processing - Whether processing is active
     * @param message - Processing message to display
     * @param showProgress - Whether to show progress indicator
     * @param progress - Progress value (0-100)
     * @since 1.0.0
     */
    setProcessing(processing: boolean, message: string = 'Processing...', showProgress: boolean = false, progress: number = 0): void {
        this.state.isProcessing = processing;
        this.updateProcessingUI(processing, message, showProgress, progress);
    }

    /**
     * Update UI based on current state
     * @since 1.0.0
     */
    private updateUIState(): void {
        const heroSection = document.getElementById('hero-section');
        const actionSection = document.getElementById('action-section');
        const resultsSection = document.getElementById('results-section');
        const saveSection = document.getElementById('save-section');
        const historySection = document.getElementById('history-section');
        const selectedText = document.getElementById('selected-text') as HTMLTextAreaElement;
        const charCount = document.getElementById('char-count');
        const footerSection = document.getElementById('app-footer');

        if (this.state.selectedText.trim()) {
            heroSection?.classList.add('hidden');
            actionSection?.classList.remove('hidden');
            historySection?.classList.remove('hidden');
            footerSection?.classList.remove('hidden');

            if (selectedText) {
                selectedText.value = this.state.selectedText;
            }

            if (charCount) {
                charCount.textContent = this.state.selectedText.length.toString();
            }

            if (Object.keys(this.state.results).length > 0) {
                resultsSection?.classList.remove('hidden');
                saveSection?.classList.remove('hidden');
            }
        } else {
            heroSection?.classList.remove('hidden');
            actionSection?.classList.add('hidden');
            resultsSection?.classList.add('hidden');
            historySection?.classList.add('hidden');
            footerSection?.classList.add('hidden');
            saveSection?.classList.add('hidden');
        }
    }

    /**
     * Update processing UI elements
     * @param processing - Whether processing is active
     * @param message - Processing message
     * @param showProgress - Whether to show progress
     * @param progress - Progress value
     * @since 1.0.0
     */
    private updateProcessingUI(processing: boolean, message: string, showProgress: boolean, progress: number): void {
        const funLoaderTexts = [
            "Sec, snaggin' a coffee!",
            "Hold tight, dude's thinkin'...",
            "Almost there, bro!",
            "Hang on, makin' magic...",
            "Just a moment, dude's on it!",
            "Grabbin' some virtual snacks...",
            "Dude's gears are turnin'...",
            "Stay cool, I'm on it...",
            "Loading... like a boss!"
        ];
        const randomFunText = funLoaderTexts[Math.floor(Math.random() * funLoaderTexts.length)];
        const loader = document.getElementById('loader');
        if (!loader) return;

        const loaderText = loader.querySelector('.loader-text');
        const progressContainer = loader.querySelector('.progress-container');
        const buttons = document.querySelectorAll('.action-btn');

        if (processing) {
            if (loaderText) loaderText.textContent = randomFunText;
            if (progressContainer) {
                (progressContainer as HTMLElement).style.display = showProgress ? 'block' : 'none';
            }
            loader.style.display = 'flex';
        } else {
            loader.style.display = 'none';
        }

        buttons.forEach((btn: Element) => ((btn as HTMLButtonElement).disabled = processing));
    }

    /**
     * Display result with session integration
     * @param ai - AI provider type
     * @param type - Result type
     * @param content - Result content
     * @returns Promise that resolves when display is complete
     * @since 1.0.0
     */
    async displayResultWithSession(ai: 'built-in' | 'gemini', type: string, originalText: string, processedText: string, userPrompt?: string): Promise<void> {
        this.displayResult(type, processedText);
        const textOperationResult: TextOperationResult = {
            operationType: type as TextOperationType,
            provider: ai,
            processedText: processedText,
            originalText: originalText,
            userPrompt: userPrompt,
            timestamp: Date.now()
        }
        // Add to current session
        this.sessionService.addResult(textOperationResult)
       
    }

    /**
     * Restore session from storage
     * @param sessionId - Session ID to restore
     * @returns Promise that resolves with restoration success status
     * @since 1.0.0
     */
    async restoreSession(sessionId: string): Promise<boolean> {
        try {
            const session = await this.sessionService.loadSession(sessionId);
            if (session) {
                // Restore original selected text from first result's originalText
                const originalText = session.results.length > 0 ? session.results[0].originalText : '';
                
                this.state.selectedText = originalText;
                this.state.currentTab = session.tabData;
                this.state.results = {};
                this.state.customPrompts = [];

                // Restore results and display them
                session.results.forEach((result: any) => {
                    this.state.results[result.type] = result;
                    if (result.type === 'customPrompts' && result.userPrompt) {
                        this.state.customPrompts.push({
                            prompt: result.userPrompt,
                            response: result.result,
                            timestamp: result.timestamp
                        });
                    }
                    
                    // Display result card
                    this.displayResult(result.type, result.result);
                });

                this.updateUIState();
                return true;
            }
            return false;
        } catch (error) {
            Utils.handleError(error, 'UIService.restoreSession');
            return false;
        }
    }

    /**
     * Get last custom prompt
     * @returns Last custom prompt or undefined
     * @since 1.0.0
     */
    private getLastPrompt(): string | undefined {
        return this.state.customPrompts[this.state.customPrompts.length - 1]?.prompt;
    }

    /**
     * Display result in UI
     * @param type - Result type
     * @param content - Result content
     * @since 1.0.0
     */
    private displayResult(type: string, content: string): void {
        const resultDiv = document.getElementById(`${type}-result`);
        const contentDiv = resultDiv?.querySelector('.result-content');

        if (resultDiv && contentDiv) {
            contentDiv.textContent = content;
            resultDiv.classList.remove('hidden');

            // Add voice button event listener
            const voiceBtn = resultDiv.querySelector('.result-voice-btn');
            if (voiceBtn) {
                // Remove existing event listeners by cloning
                const newVoiceBtn = voiceBtn.cloneNode(true) as HTMLButtonElement;
                voiceBtn.parentNode?.replaceChild(newVoiceBtn, voiceBtn);
                
                // Add new event listener
                newVoiceBtn.addEventListener('click', () => {
                    // Voice handling - emit event for VoiceHandler component
                    Utils.emit(EVENTS.VOICE_OUTPUT_REQUESTED, {
                        resultType: type,
                        text: content
                    });
                });
                
                // Set data attribute for result type
                newVoiceBtn.setAttribute('data-result-type', type);
            }
        }

        this.addResult(type, content);
    }

    /**
     * Show message to user
     * @param message - Message to display
     * @param type - Message type (info, error, success)
     * @since 1.0.0
     */
    showMessage(message: string, type: 'info' | 'error' | 'success'): void {
        const container = document.getElementById('message-container');
        if (!container) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        messageDiv.addEventListener('click', () => {
            messageDiv.remove();
        });

        container.appendChild(messageDiv);

        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, CONFIG.UI.MESSAGE_DURATION);
    }

    /**
     * Show welcome progress during initialization
     * @param show - Whether to show progress
     * @param message - Progress message
     * @since 1.0.0
     */
    showWelcomeProgress(show: boolean, message: string = 'Initializing...'): void {
        const welcomeProgress = document.getElementById('welcome-progress');
        const progressText = welcomeProgress?.querySelector('.progress-text');
        const avatar = document.querySelector('.avatar');

        if (show && welcomeProgress) {
            if (progressText) progressText.textContent = message;
            welcomeProgress.style.display = 'flex';
            if (avatar) (avatar as HTMLElement).style.opacity = '0.3';
        } else if (welcomeProgress) {
            welcomeProgress.style.display = 'none';
            if (avatar) (avatar as HTMLElement).style.opacity = '1';
        }
    }

    /**
     * Clear selected text and update UI
     * @since 1.0.0
     */
    clearText(): void {
        this.state.selectedText = '';
        this.updateUIState();
        
        const selectedTextArea = document.getElementById('selected-text') as HTMLTextAreaElement;
        const charCount = document.getElementById('char-count');

        if (selectedTextArea) {
            selectedTextArea.value = '';
        }

        if (charCount) {
            charCount.textContent = '0';
        }

        this.showMessage('✅ Text cleared!', 'info');
    }

    /**
     * Clear current session
     * @since 1.0.0
     */
    clearSession(): void {
        if (confirm('Are you sure you want to clear the current session? This will remove all selected text, results, and messages.')) {
            this.state.selectedText = '';
            this.state.results = {};

            const selectedTextArea = document.getElementById('selected-text') as HTMLTextAreaElement;
            const charCount = document.getElementById('char-count');
            const resultsSection = document.getElementById('results-section');

            if (selectedTextArea) {
                selectedTextArea.value = '';
            }

            if (charCount) {
                charCount.textContent = '0';
            }

            const resultCards = resultsSection?.querySelectorAll('.result-card');
            resultCards?.forEach((card: Element & { id?: string, classList?: DOMTokenList }) => {
                if (card.id !== 'prompt-result-content') {
                    card.classList.add('hidden');
                }
            });

            const messageContainer = document.getElementById('message-container');
            if (messageContainer) {
                messageContainer.innerHTML = '';
            }

            this.updateUIState();
            this.showMessage('✅ Session cleared successfully!', 'success');
        }
    }

    /**
     * Add event listener to element
     * @param element - DOM element to attach listener to
     * @param event - Event type
     * @param handler - Event handler function
     * @since 1.0.0
     */
    addEventListener(element: Element, event: string, handler: EventListener): void {
        if (element) {
            element.addEventListener(event, handler);
            this.eventListeners.push({ element, event, handler });
        }
    }

    /**
     * Remove all event listeners
     * @since 1.0.0
     */
    removeAllEventListeners(): void {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }

    /**
     * Apply theme to application
     * @param theme - Theme name ('dark' or 'light')
     * @since 1.0.0
     */
    applyTheme(theme: string): void {
        const body = document.body;

        if (theme === 'dark') {
            body.classList.add('dark-theme');
            body.classList.remove('light-theme');
        } else if (theme === 'light') {
            body.classList.add('light-theme');
            body.classList.remove('dark-theme');
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                body.classList.add('dark-theme');
                body.classList.remove('light-theme');
            } else {
                body.classList.add('light-theme');
                body.classList.remove('dark-theme');
            }
        }
    }

    /**
     * Destroy UI service and cleanup
     * @since 1.0.0
     */
    destroy(): void {
        this.removeAllEventListeners();
    }
}

/**
 * Export singleton instance
 * @since 1.0.0
 */
export const uiService = UIService.getInstance();
