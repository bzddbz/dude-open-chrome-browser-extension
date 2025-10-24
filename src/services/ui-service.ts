// UI Service Layer for Dude Chrome Extension
// Handles all UI operations and state management

import type { AppState, AIResult } from '../types/core';
import { ErrorHandler } from '../utils/error-handler';
import { sessionService } from './session-service';

export class UIService {
  private static instance: UIService;
  private state: AppState;
private eventListeners: { element: Element; event: string; handler: EventListener }[] = [];

  private constructor() {
    this.state = {
      selectedText: '',
      isProcessing: false,
      error: null,
      results: {},
      customPrompts: [],
      currentTab: null,
    };
  }

  static getInstance(): UIService {
    if (!UIService.instance) {
      UIService.instance = new UIService();
    }
    return UIService.instance;
  }

  // State management
  getState(): AppState {
    return { ...this.state };
  }

  // Session-based state management
  async updateSelectedText(text: string, title: string, url: string): Promise<void> {
    const tabData = { id: Date.now().toString(), url, title };

    // Check if we need to switch tabs - more precise comparison
    const currentSession = sessionService.getCurrentSession();
    const needsTabSwitch = !currentSession || 
                          currentSession.tabData.url !== url || 
                          currentSession.tabData.title !== title;

    if (needsTabSwitch) {
      await sessionService.switchTab(tabData);
    }

    // Update UI state
    this.state.selectedText = text;
    this.state.currentTab = { id: Date.now().toString(), title, url };
    this.updateUIState();
  }

  clearResults(): void {
    this.state.results = {};
    this.state.customPrompts = [];
    this.updateUIState();
  }

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

  addCustomPrompt(prompt: string, response: string): void {
    this.state.customPrompts.push({
      prompt,
      response,
      timestamp: Date.now()
    });
  }

  setProcessing(processing: boolean, message: string = 'Processing...', showProgress: boolean = false, progress: number = 0): void {
    this.state.isProcessing = processing;
    this.updateProcessingUI(processing, message, showProgress, progress);
  }

  // UI Updates
  updateUIState(): void {
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

  private updateProcessingUI(processing: boolean, message: string, showProgress: boolean, progress: number): void {
    const loader = document.getElementById('loader')!;
    const loaderText = loader.querySelector('.loader-text');
    const progressContainer = loader.querySelector('.progress-container');
    const progressFill = loader.querySelector('.progress-fill');
    const progressText = loader.querySelector('.progress-text');
    const buttons = document.querySelectorAll('.action-btn');

    if (processing) {
      if (loaderText) loaderText.textContent = message;
      if (progressContainer) (progressContainer as HTMLElement).style.display = showProgress ? 'block' : 'none';
      if (progressFill) (progressFill as HTMLElement).style.width = `${progress}%`;
      if (progressText) progressText.textContent = `${Math.round(progress)}%`;
      loader.style.display = 'flex';
    } else {
      loader.style.display = 'none';
    }

    buttons.forEach((btn: Element) => ((btn as HTMLButtonElement).disabled = processing));
  }

  // Result display with session integration
  async displayResultWithSession(ai: 'built-in' | 'gemini', type: string, content: string): Promise<void> {
    this.displayResult(type, content);

    // Add to current session
    sessionService.addResult(
      ai,
      type as AIResult['type'],
      content,
      this.state.selectedText,
      type === 'prompt' ? this.getLastPrompt() : undefined
    );
  }

   // Session restoration
  async restoreSession(sessionId: string): Promise<boolean> {
    try {
      const session = await sessionService.restoreSession(sessionId);
      if (session) {
        // Restore the original selected text from the first result's originalText
        // or use an empty string if no results exist
        const originalText = session.results.length > 0 ? session.results[0].originalText : '';
        
        this.state.selectedText = originalText;
        this.state.currentTab = session.tabData;
        this.state.results = {};
        this.state.customPrompts = [];

        // Restore results and display them
        session.results.forEach(result => {
          this.state.results[result.type] = result;
          if (result.type === 'customPrompts' && result.userPrompt) {
            this.state.customPrompts.push({
              prompt: result.userPrompt,
              response: result.result,
              timestamp: result.timestamp
            });
          }
          
          // Display the result card
          this.displayResult(result.type, result.result);
        });

        this.updateUIState();
        return true;
      }
      return false;
    } catch (error) {
      ErrorHandler.logError(error, 'UIService.restoreSession');
      return false;
    }
  }

  // Session cleanup on destroy
  async destroy(): Promise<void> {
    await sessionService.closeSession('abandoned');
    this.removeAllEventListeners();
  }

   private getLastPrompt(): string | undefined {
    return this.state.customPrompts[this.state.customPrompts.length - 1]?.prompt;
  }

  // Result display
  displayResult(type: string, content: string): void {
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
          // Voice handling - delegate to VoiceHandler
          this.handleVoiceOutput(type, content);
        });
        
        // Set data attribute for result type
        newVoiceBtn.setAttribute('data-result-type', type);
      }
    }

    this.addResult(type, content);
  }

  // Messages
  showMessage(message: string, type: 'info' | 'error' | 'success'): void {
    const container = document.getElementById('message-container')!;
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
    }, 5000);
  }

  // Welcome progress
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

  // Event listeners management
  addEventListener(element: Element, event: string, handler: EventListener): void {
    if (element) {
      element.addEventListener(event, handler);
      this.eventListeners.push({ element, event, handler });
    }
  }

  removeAllEventListeners(): void {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  // Voice handling (delegate to VoiceHandler)
  private handleVoiceOutput(resultType: string, content: string): void {
    // This will be handled by VoiceHandler instance
    // We'll emit an event or call the handler directly
    const event = new CustomEvent('voiceOutput', { 
      detail: { resultType, content } 
    });
    document.dispatchEvent(event);
  }

  // Theme management
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

  // Clear operations
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


}

export const uiService = UIService.getInstance();
