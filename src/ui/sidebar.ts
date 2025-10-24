import { aiService } from '../services/ai-service';
import { storageService } from '../services/storage-service';
import { sessionService } from '../services/session-service';
import { uiService } from '../services/ui-service';
import { VoiceHandler } from './components/VoiceHandler';
import { ContentExtractor } from '../core/content-extractor';
import DOMPurify from 'isomorphic-dompurify';

export class Sidebar {
  private voiceHandler!: VoiceHandler;

  constructor() {
    this.voiceHandler = new VoiceHandler(this.onVoiceStateChange.bind(this));
    this.init();
  }

  private async init() {
    await this.setupEventListeners();
    await this.checkAI();
    await this.loadCurrentTab();
    await this.loadHistory(); // Load history on startup
    this.startSelectionMonitoring();
  }

  private setupEventListeners() {
    // Helper function to safely add event listeners
    const safeAddListener = (id: string | null, event: string, handler: EventListener) => {
      const element = id ? document.getElementById(id) : null;
      if (element) {
        uiService.addEventListener(element, event, handler);
      }
    };

    // Main action buttons
    safeAddListener('summarize-btn', 'click', () => this.handleSummarize());
    safeAddListener('translate-btn', 'click', () => this.handleTranslate());
    safeAddListener('validate-btn', 'click', () => this.handleValidate());
    safeAddListener('rewrite-btn', 'click', () => this.handleRewrite());

    // Session management
    safeAddListener('save-btn', 'click', () => this.handleSave());
    safeAddListener('export-btn', 'click', () => this.handleExport());
    safeAddListener('clear-session-btn', 'click', () => this.handleClearSession());

    // History buttons (using storage service)
    safeAddListener('export-all-history-btn', 'click', () => this.handleExport());
    safeAddListener('clear-all-history-btn', 'click', () => this.handleClearAllHistory());

    // Voice controls
    safeAddListener('voice-input-btn', 'click', () => this.handleVoiceInput());
    safeAddListener('voice-output-btn', 'click', () => this.handleVoiceOutput());
    // Clear process text button
    safeAddListener('clear-text-btn', 'click', () => this.handleClearProcessText());

    // Prompt input
    safeAddListener('send-prompt-btn', 'click', () => this.handlePrompt());
    safeAddListener('prompt-input', 'keypress', (e: any) => {
      if (e.key === 'Enter') {
        this.handlePrompt();
      }
    });

    // Settings (using storage service)
    safeAddListener('settings-btn', 'click', () => this.openSettings());
    safeAddListener('close-settings', 'click', () => this.closeSettings());
    safeAddListener('save-settings', 'click', () => this.saveSettings());
    safeAddListener('reset-settings', 'click', () => this.resetSettings());

    // Modal close
    safeAddListener('settings-modal', 'click', (e: any) => {
      if ((e.target as EventTarget) === (e.currentTarget as EventTarget)) {
        this.closeSettings();
      }
    });

    // ESC key
    document.addEventListener('keydown', (e: any) => {
      if (e.key === 'Escape') {
        this.closeSettings();
      }
    });

    // Voice output events
    document.addEventListener('voiceOutput', (e: any) => {
      this.handleCardVoiceOutput(e.detail.resultType, e.detail.content);
    });
  }

  // AI handlers with session integration
  async handleSummarize() {
    try {
      const state = uiService.getState();
      uiService.setProcessing(true, 'Summarizing text...', true, 0);
      const result = await aiService.summarize(state.selectedText);
      await uiService.displayResultWithSession('built-in', 'summary', result);
      uiService.showMessage('✅ Summary completed successfully!', 'success');
      uiService.setProcessing(false);
    } catch (error: any) {
      uiService.showMessage(`❌ Summary failed: ${error.message || error}`, 'error');
      uiService.setProcessing(false);
    }
  }

  async handleTranslate() {
    try {
      const state = uiService.getState();
      uiService.setProcessing(true, 'Translating text...', true, 0);
      const result = await aiService.translate(state.selectedText);
      await uiService.displayResultWithSession('built-in', 'translation', result);
      uiService.showMessage('✅ Translation completed successfully!', 'success');
      uiService.setProcessing(false);
    } catch (error: any) {
      uiService.showMessage(`❌ Translation failed: ${error.message || error}`, 'error');
      uiService.setProcessing(false);
    }
  }

  async handleValidate() {
    try {
      const state = uiService.getState();
      uiService.setProcessing(true, 'Validating content...', true, 0);
      const result = await aiService.validate(state.selectedText);
      await uiService.displayResultWithSession('built-in', 'validation', result);
      uiService.showMessage('✅ Validation completed successfully!', 'success');
      uiService.setProcessing(false);
    } catch (error: any) {
      uiService.showMessage(`❌ Validation failed: ${error.message || error}`, 'error');
      uiService.setProcessing(false);
    }
  }

  async handleRewrite() {
    try {
      const state = uiService.getState();
      uiService.setProcessing(true, 'Rewriting text...', true, 0);
      const result = await aiService.rewrite(state.selectedText);
      await uiService.displayResultWithSession('built-in', 'rewrite', result);
      uiService.showMessage('✅ Rewrite completed successfully!', 'success');
      uiService.setProcessing(false);
    } catch (error: any) {
      uiService.showMessage(`❌ Rewrite failed: ${error.message || error}`, 'error');
      uiService.setProcessing(false);
    }
  }

  async handlePrompt() {
    const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
    const prompt = DOMPurify.sanitize(promptInput?.value.trim());
    
    if (!prompt) {
      uiService.showMessage('⚠️ Please enter a prompt', 'error');
      return;
    }

    try {
      const state = uiService.getState();
      uiService.setProcessing(true, 'Processing custom prompt...', true, 0);
      const result = await aiService.customPrompt(prompt, state.selectedText);
      await uiService.displayResultWithSession('built-in', 'prompt', result);
      uiService.showMessage('✅ Prompt completed successfully!', 'success');
      
      if (promptInput) {
        promptInput.value = '';
      }
      
      uiService.setProcessing(false);
    } catch (error: any) {
      uiService.showMessage(`❌ Prompt failed: ${error.message || error}`, 'error');
      uiService.setProcessing(false);
    }
  }

  // Voice handling (delegated to VoiceHandler)
  private async handleCardVoiceOutput(resultType: string, content: string) {
    await this.voiceHandler.handleCardVoiceOutput(resultType, content);
  }

  // Session management handlers
  async handleSave() {
    try {
      await sessionService.closeSession('completed');
      uiService.showMessage('✅ Session saved successfully!', 'success');
      // Clear all results and reset UI completely
      uiService.clearResults();
      uiService.clearText();
      await uiService.updateSelectedText('', '', '');
      uiService.updateUIState();
      await this.loadHistory();
    } catch (error: any) {
      uiService.showMessage(`❌ Save failed: ${error.message || error}`, 'error');
    }
  }

  async handleClearSession() {
    if (confirm('Are you sure you want to clear the current session? This will remove all results and messages.')) {
      try {
        await sessionService.closeSession('abandoned');
        uiService.clearResults();
        uiService.clearText();
        await uiService.updateSelectedText('', '', '');
        uiService.updateUIState();
        await this.loadHistory();
        uiService.showMessage('✅ Session cleared successfully!', 'success');
      } catch (error: any) {
        uiService.showMessage(`❌ Failed to clear session: ${error.message || error}`, 'error');
      }
    }
  }

  async handleExport() {
    try {
      const exportData = await storageService.exportSessionHistory();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `dude-sessions-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      uiService.showMessage('✅ Sessions exported successfully!', 'success');
      uiService.updateUIState();
    } catch (error: any) {
      uiService.showMessage(`❌ Export failed: ${error.message || error}`, 'error');
    }
  }

  // History management (using storage service)
  private async handleClearAllHistory() {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      try {
        await storageService.clearSessionHistory();
        uiService.showMessage('✅ All history cleared successfully!', 'success');
        this.loadHistory();
      } catch (error: any) {
        uiService.showMessage(`❌ Failed to clear history: ${error.message || error}`, 'error');
      }
    }
  }

  private async handleClearSingle(sessionId: string) {
    try {
      await storageService.deleteSessionFromHistory(sessionId);
      uiService.showMessage('✅ Session removed from history!', 'success');
      // Don't reload history here to avoid duplication
    } catch (error: any) {
      uiService.showMessage(`❌ Failed to remove session: ${error.message || error}`, 'error');
    }
  }

  private async handleExportSingle(sessionId: string) {
    try {
      const sessions = await storageService.getSessionHistory();
      const session = sessions.find((s: any) => s.id === sessionId);

      if (!session) {
        uiService.showMessage('❌ Could not find the selected session', 'error');
        return;
      }

      const preferences = await storageService.getPreferences();

      if (preferences.storage.exportFormat === 'markdown') {
        // Convert session to markdown
        const markdown = this.convertSessionToMarkdown(session);
        this.downloadFile(markdown, `dude-session-${session.tabData.title.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date(session.timestamp).toISOString().split('T')[0]}.md`, 'text/markdown');
      } else {
        // Export as JSON with proper formatting
        const exportData = JSON.stringify(session, null, 2);
        this.downloadFile(exportData, `dude-session-${session.tabData.title.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date(session.timestamp).toISOString().split('T')[0]}.json`, 'application/json');
      }

      uiService.showMessage('✅ Session exported successfully!', 'success');
    } catch (error: any) {
      uiService.showMessage(`❌ Export failed: ${error.message || error}`, 'error');
    }
  }

  private convertSessionToMarkdown(session: any): string {
    let markdown = `# ${session.tabData.title}\n\n`;
    markdown += `**URL:** ${session.tabData.url}\n`;
    markdown += `**Date:** ${new Date(session.timestamp).toLocaleString()}\n\n`;
    
    if (session.selectedText) {
      markdown += `## Selected Text\n\n${session.selectedText}\n\n`;
    }

    if (session.results && session.results.length > 0) {
      markdown += `## Results\n\n`;
      session.results.forEach((result: any) => {
        markdown += `### ${result.type.toUpperCase()}\n\n`;
        if (result.userPrompt) {
          markdown += `**Prompt:** ${result.userPrompt}\n\n`;
        }
        markdown += `${result.result}\n\n`;
        markdown += `---\n\n`;
      });
    }

    return markdown;
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Settings methods (using storage service)
  private openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.populateSettingsForm();
    }
  }

  private closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  private async populateSettingsForm() {
    try {
      const preferences = await storageService.getPreferences();
      
      // Populate Gemini API Key
      const geminiApiKey = document.getElementById('gemini-api-key') as HTMLInputElement;
      if (geminiApiKey) {
        geminiApiKey.value = preferences.gemini.apiKey || '';
      }

      // Populate target language
      const targetLanguage = document.getElementById('target-language') as HTMLSelectElement;
      if (targetLanguage) {
        // Clear existing options
        targetLanguage.innerHTML = '';
        
        // Get supported languages
        const languages = storageService.getSupportedLanguages();
        languages.forEach((lang: any) => {
          const option = document.createElement('option');
          option.value = lang.code;
          option.textContent = `${lang.name} (${lang.nativeName})`;
          if (lang.code === preferences.translation.targetLanguage) {
            option.selected = true;
          }
          targetLanguage.appendChild(option);
        });
      }

      // Populate source language
      const sourceLanguage = document.getElementById('source-language') as HTMLSelectElement;
      if (sourceLanguage) {
        // Clear existing options
        sourceLanguage.innerHTML = '';
        
        // Add auto-detect option
        const autoOption = document.createElement('option');
        autoOption.value = 'auto';
        autoOption.textContent = 'Auto-detect';
        if (preferences.translation.sourceLanguage === 'auto') {
          autoOption.selected = true;
        }
        sourceLanguage.appendChild(autoOption);
        
        // Add supported languages
        const languages = storageService.getSupportedLanguages();
        languages.forEach((lang: any) => {
          const option = document.createElement('option');
          option.value = lang.code;
          option.textContent = `${lang.name} (${lang.nativeName})`;
          if (lang.code === preferences.translation.sourceLanguage && preferences.translation.sourceLanguage !== 'auto') {
            option.selected = true;
          }
          sourceLanguage.appendChild(option);
        });
      }

      // Populate theme
      const theme = document.getElementById('theme') as HTMLSelectElement;
      if (theme) {
        theme.value = preferences.general.theme || 'dark';
      }

      // Populate other settings
      this.populateCheckbox('auto-detect', preferences.translation.autoDetect);
      this.populateCheckbox('auto-translate-response', preferences.translation.autoTranslateResponse);
      this.populateCheckbox('animations', preferences.general.animations);
      this.populateCheckbox('notifications', preferences.general.notifications);
      this.populateCheckbox('auto-save', preferences.storage.autoSave);
      this.populateCheckbox('auto-save-on-selection-change', preferences.storage.autoSaveOnSelectionChange);
      this.populateCheckbox('gemini-cloud-first', preferences.gemini.cloudFirst);

      // Populate select options
      this.populateSelect('summary-length', preferences.summarization.length);
      this.populateSelect('summary-type', preferences.summarization.type);
      this.populateSelect('summary-format', preferences.summarization.format);
      this.populateSelect('validation-strictness', preferences.validation.strictness);
      this.populateSelect('fact-check-level', preferences.validation.factCheckLevel);
      this.populateSelect('rewrite-style', preferences.rewrite.style);
      this.populateSelect('rewrite-tone', preferences.rewrite.tone);
      this.populateSelect('rewrite-complexity', preferences.rewrite.complexity);
      this.populateSelect('history-limit', preferences.storage.historyLimit.toString());
      this.populateSelect('export-format', preferences.storage.exportFormat);
      this.populateSelect('gemini-model', preferences.gemini.selectedModel);

    } catch (error) {
      console.error('Failed to populate settings form:', error);
    }
  }

  private populateCheckbox(id: string, checked: boolean) {
    const checkbox = document.getElementById(id) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = checked;
    }
  }

  private populateSelect(id: string, value: string) {
    const select = document.getElementById(id) as HTMLSelectElement;
    if (select) {
      select.value = value;
    }
  }

  private async saveSettings() {
    try {
      const formData = this.getFormData();
      const success = await storageService.updateSettings(formData);
      if (success) {
        this.closeSettings();
        uiService.showMessage('✅ Settings updated successfully!', 'success');
        
        // Apply theme if changed
        if (formData.general?.theme) {
          uiService.applyTheme(formData.general.theme);
        }
      }
    } catch (error: any) {
      uiService.showMessage(`❌ Failed to save settings: ${error.message || error}`, 'error');
    }
  }

  private getFormData(): any {
    // Get all form values
    const geminiApiKey = (document.getElementById('gemini-api-key') as HTMLInputElement)?.value || '';
    const targetLanguage = (document.getElementById('target-language') as HTMLSelectElement)?.value || 'hu';
    const sourceLanguage = (document.getElementById('source-language') as HTMLSelectElement)?.value || 'auto';
    const theme = (document.getElementById('theme') as HTMLSelectElement)?.value || 'dark';
    
    // Get checkbox values
    const autoDetect = (document.getElementById('auto-detect') as HTMLInputElement)?.checked || false;
    const autoTranslateResponse = (document.getElementById('auto-translate-response') as HTMLInputElement)?.checked || false;
    const animations = (document.getElementById('animations') as HTMLInputElement)?.checked || true;
    const notifications = (document.getElementById('notifications') as HTMLInputElement)?.checked || true;
    const autoSave = (document.getElementById('auto-save') as HTMLInputElement)?.checked || true;
    const autoSaveOnSelectionChange = (document.getElementById('auto-save-on-selection-change') as HTMLInputElement)?.checked || false;
    const geminiCloudFirst = (document.getElementById('gemini-cloud-first') as HTMLInputElement)?.checked || false;
    
    // Get select values
    const summaryLength = (document.getElementById('summary-length') as HTMLSelectElement)?.value || 'medium';
    const summaryType = (document.getElementById('summary-type') as HTMLSelectElement)?.value || 'key-points';
    const summaryFormat = (document.getElementById('summary-format') as HTMLSelectElement)?.value || 'markdown';
    const validationStrictness = (document.getElementById('validation-strictness') as HTMLSelectElement)?.value || 'medium';
    const factCheckLevel = (document.getElementById('fact-check-level') as HTMLSelectElement)?.value || 'standard';
    const rewriteStyle = (document.getElementById('rewrite-style') as HTMLSelectElement)?.value || 'neutral';
    const rewriteTone = (document.getElementById('rewrite-tone') as HTMLSelectElement)?.value || 'professional';
    const rewriteComplexity = (document.getElementById('rewrite-complexity') as HTMLSelectElement)?.value || 'intermediate';
    const historyLimit = parseInt((document.getElementById('history-limit') as HTMLSelectElement)?.value || '50');
    const exportFormat = (document.getElementById('export-format') as HTMLSelectElement)?.value || 'json';
    const geminiModel = (document.getElementById('gemini-model') as HTMLSelectElement)?.value || 'gemini-2.0-flash-lite';

    return {
      gemini: {
        apiKey: geminiApiKey,
        selectedModel: geminiModel,
        cloudFirst: geminiCloudFirst
      },
      translation: {
        targetLanguage,
        sourceLanguage,
        autoDetect,
        autoTranslateResponse
      },
      summarization: {
        length: summaryLength as any,
        type: summaryType as any,
        format: summaryFormat as any
      },
      validation: {
        strictness: validationStrictness as any,
        checkSources: true, // This field is not in the form, keep default
        factCheckLevel: factCheckLevel as any
      },
      rewrite: {
        style: rewriteStyle as any,
        tone: rewriteTone as any,
        complexity: rewriteComplexity as any
      },
      storage: {
        historyLimit,
        autoSave,
        autoSaveOnSelectionChange,
        exportFormat: exportFormat as any
      },
      general: {
        theme: theme as any,
        animations,
        notifications
      }
    };
  }

  private async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      try {
        await storageService.resetPreferences();
        this.populateSettingsForm();
        uiService.showMessage('✅ Settings reset successfully!', 'success');
      } catch (error: any) {
        uiService.showMessage(`❌ Failed to reset settings: ${error.message || error}`, 'error');
      }
    }
  }

  // Voice handlers (delegated)
  private async handleVoiceInput() {
    try {
      const transcript = await this.voiceHandler.handleVoiceInput();
      const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
      promptInput.value = transcript;
      uiService.showMessage('✅ Speech recognized', 'success');
    } catch (error: any) {
      uiService.showMessage(`❌ Speech recognition failed: ${error.message || error}`, 'error');
    }
  }

  private async handleVoiceOutput() {
    try {
      const results = await sessionService.getCurrentSessionResults();
      if (results.length === 0) {
        uiService.showMessage('⚠️ No content to read aloud', 'error');
        return;
      }

      const latestResult = results[results.length - 1];
      await this.voiceHandler.handleVoiceOutput(latestResult.result);
    } catch (error: any) {
      uiService.showMessage(`❌ Speech synthesis failed: ${error.message || error}`, 'error');
    }
  }

  // Component callbacks
  private onVoiceStateChange(isSpeaking: boolean, isListening: boolean, activeCard: string | null = null): void {
    const voiceInputBtn = document.getElementById('voice-input-btn') as HTMLButtonElement;
    const voiceOutputBtn = document.getElementById('voice-output-btn') as HTMLButtonElement;
    
    if (voiceInputBtn) {
      voiceInputBtn.classList.toggle('active', isListening);
      // Update button text/icon based on state
      const icon = voiceInputBtn.querySelector('.material-icons');
      if (icon) {
        icon.textContent = isListening ? 'mic_off' : 'mic';
      }
      const text = voiceInputBtn.querySelector('.btn-text');
      if (text) {
        text.textContent = isListening ? 'Stop Recording' : 'Voice Input';
      }
    }
    
    if (voiceOutputBtn) {
      voiceOutputBtn.classList.toggle('active', isSpeaking);
      // Update button text/icon based on state
      const icon = voiceOutputBtn.querySelector('.material-icons');
      if (icon) {
        icon.textContent = isSpeaking ? 'stop' : 'play_arrow';
      }
      const text = voiceOutputBtn.querySelector('.btn-text');
      if (text) {
        text.textContent = isSpeaking ? 'Stop Speaking' : 'Voice Output';
      }
    }
    
    // Update individual result card voice buttons
    this.updateResultVoiceButtons(activeCard, isSpeaking);
  }
  
  private updateResultVoiceButtons(activeCard: string | null, isSpeaking: boolean): void {
    // Get all result voice buttons
    const voiceButtons = document.querySelectorAll('.result-voice-btn');
    
    voiceButtons.forEach(button => {
      const resultType = button.getAttribute('data-result-type');
      const icon = button.querySelector('.material-icons');
      
      if (resultType === activeCard && isSpeaking) {
        // This card is currently speaking
        button.classList.add('active');
        if (icon) {
          icon.textContent = 'stop';
        }
      } else {
        // This card is not speaking
        button.classList.remove('active');
        if (icon) {
          icon.textContent = 'volume_up';
        }
      }
    });
  }

  // Clear process text (selection) handler
  private async handleClearProcessText() {
    try {
      // Clear stored selection
      await storageService.saveSelection('', '', '');
      // Update UI with complete clear operation
      uiService.clearText();
      await uiService.updateSelectedText('', '', '');
      // Also clear the textarea directly
      const selectedTextArea = document.getElementById('selected-text') as HTMLTextAreaElement;
      if (selectedTextArea) {
        selectedTextArea.value = '';
      }
      // Update char count
      const charCount = document.getElementById('char-count');
      if (charCount) {
        charCount.textContent = '0';
      }
      uiService.showMessage('✅ Process text cleared', 'success');
    } catch (error: any) {
      uiService.showMessage(`❌ Failed to clear process text: ${error.message || error}`, 'error');
    }
  }

  // Utility methods
  private async checkAI() {
    try {
      uiService.showWelcomeProgress(true, '🔍 Checking AI availability...');
      
      await aiService.checkAvailability();
      uiService.showWelcomeProgress(true, '✅ AI services ready!');

      const hasAI = await aiService.checkAvailability();
      if (!hasAI) {
        uiService.showMessage('🎭 Demo Mode - AI APIs not available. Try enabling Chrome AI flags.', 'info');
      }
      
      setTimeout(() => {
        uiService.showWelcomeProgress(false);
      }, 1000);
      
    } catch (error) {
      uiService.showWelcomeProgress(false);
      uiService.showMessage('❌ Failed to check AI availability', 'error');
    }
  }

  private async loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        await uiService.updateSelectedText('', tab.title || 'Untitled Page', tab.url);
      }
    } catch (error) {
      console.error('Failed to load current tab:', error);
      await uiService.updateSelectedText('', 'Unknown Tab', window.location.href);
    }
  }

  private startSelectionMonitoring() {
    setInterval(async () => {
      const selection = await storageService.getSelection();
      if (selection && selection.text.trim()) {
        // Only update if there's actual text content
        await uiService.updateSelectedText(selection.text, selection.title, selection.url);
      }
    }, 500);
  }

  private async loadHistory() {
    try {
      const sessions = await storageService.getSessionHistory();
      this.renderHistory(sessions);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  private renderHistory(sessions: any[]): void {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (sessions.length === 0) {
      historyList.innerHTML = '<p class="text-subtle-dark text-sm">No history yet</p>';
      return;
    }

    historyList.innerHTML = sessions.map((session: any) => `
      <div class="history-item">
        <div class="history-title">${session.tabData.title}</div>
        <div class="history-date">${session.tabData.url}</div>
        <div class="history-date">${new Date(session.timestamp).toLocaleDateString()}</div>
        <div class="history-actions" style="display: flex; gap: 8px; margin-top: 8px;">
          <button class="restore-btn text-xs bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-colors" data-session-id="${session.id}" title="Restore session">
            ↻ Restore
          </button>
          <button class="export-single-btn text-xs bg-surface-border text-text-primary px-2 py-1 rounded hover:bg-primary/30 transition-colors" data-session-id="${session.id}" title="Export session">
            <span class="material-icons" style="font-size: 14px;">download</span>
          </button>
          <button class="clear-single-btn text-xs bg-error/20 text-error px-2 py-1 rounded hover:bg-error/30 transition-colors" data-session-id="${session.id}" title="Remove session">
            <span class="material-icons" style="font-size: 14px;">delete</span>
          </button>
        </div>
      </div>
    `).join('');

    // Attach event listeners to history items using event delegation
    historyList.addEventListener('click', async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Handle restore button
      if (target.classList.contains('restore-btn')) {
        const sessionId = target.dataset.sessionId;
        if (sessionId) {
          console.log('Restoring session:', sessionId);
          const restored = await uiService.restoreSession(sessionId);
          if (restored) {
            uiService.showMessage('✅ Session restored successfully!', 'success');
          } else {
            uiService.showMessage('❌ Failed to restore session', 'error');
          }
        }
      }
      
      // Handle export button
      if (target.classList.contains('export-single-btn') || target.closest('.export-single-btn')) {
        const btn = target.classList.contains('export-single-btn') ? target : target.closest('.export-single-btn');
        const sessionId = (btn as HTMLElement).dataset.sessionId;
        if (sessionId) {
          console.log('Exporting session:', sessionId);
          this.handleExportSingle(sessionId);
        }
      }
      
      // Handle clear button
      if (target.classList.contains('clear-single-btn') || target.closest('.clear-single-btn')) {
        const btn = target.classList.contains('clear-single-btn') ? target : target.closest('.clear-single-btn');
        const sessionId = (btn as HTMLElement).dataset.sessionId;
        if (sessionId && confirm('Are you sure you want to remove this session from history?')) {
          console.log('Clearing session:', sessionId);
          await this.handleClearSingle(sessionId);
          // Reload history after deletion
          this.loadHistory();
        }
      }
    });
  }

  public async destroy(): Promise<void> {
    await sessionService.closeSession('abandoned');
    uiService.destroy();
  }

  // Method to update selected text from content script
  public async updateSelectedTextFromContent(text: string, title: string, url: string): Promise<void> {
    try {
      await uiService.updateSelectedText(text, title, url);
    } catch (error) {
      console.error('Failed to update selected text from content:', error);
    }
  }
}
