// Voice Handler Component for Dude Chrome Extension
// Manages speech recognition and text-to-speech functionality

import { storageService } from '../../services/storage-service';
import { ErrorHandler } from '../../utils/error-handler';
import { chromeBuiltin } from '../../core/chrome-builtin';

export class VoiceHandler {
  private isSpeaking: boolean = false;
  private isListening: boolean = false;
  private activeVoiceCard: string | null = null;
  private languageCache: Map<string, string> = new Map();
  private onVoiceStateChange?: (isSpeaking: boolean, isListening: boolean, activeCard: string | null) => void;
  
  constructor(onVoiceStateChange?: (isSpeaking: boolean, isListening: boolean, activeCard: string | null) => void) {
    this.onVoiceStateChange = onVoiceStateChange;
  }
  
  async handleVoiceInput(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        ErrorHandler.showError('Speech recognition not supported in this browser');
        reject(new Error('Speech recognition not supported'));
        return;
      }
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      
      storageService.getPreferences().then(preferences => {
        recognition.lang = preferences.translation.targetLanguage || 'en-US';
      }).catch(() => {
        recognition.lang = 'en-US';
      });
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.isListening = false;
        this.notifyStateChange();
        resolve(transcript);
      };
      
      recognition.onerror = (event: any) => {
        this.isListening = false;
        this.notifyStateChange();
        ErrorHandler.showError(`Speech recognition error: ${event.error}`);
        reject(new Error(event.error));
      };
      
      recognition.onend = () => {
        this.isListening = false;
        this.notifyStateChange();
      };
      
      try {
        recognition.start();
        this.isListening = true;
        this.notifyStateChange();
      } catch (error: any) {
        ErrorHandler.logError(error, 'VoiceHandler.handleVoiceInput');
        reject(error);
      }
    });
  }
  
  async handleVoiceOutput(text: string, language?: string): Promise<void> {
    if (!('speechSynthesis' in window)) {
      ErrorHandler.showError('Speech synthesis not supported in this browser');
      throw new Error('Speech synthesis not supported');
    }
    
    if (!text) {
      ErrorHandler.showError('No content to read aloud');
      throw new Error('No content to read aloud');
    }
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Detect language if not provided
    const detectedLanguage = language || await this.detectLanguage(text);
    const preferences = await storageService.getPreferences();
    
    utterance.lang = detectedLanguage || preferences.translation.targetLanguage || 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    return new Promise((resolve, reject) => {
      utterance.onstart = () => {
        this.isSpeaking = true;
        this.notifyStateChange();
      };
      
      utterance.onend = () => {
        this.isSpeaking = false;
        this.activeVoiceCard = null;
        this.notifyStateChange();
        resolve();
      };
      
      utterance.onerror = (event: any) => {
        this.isSpeaking = false;
        this.activeVoiceCard = null;
        this.notifyStateChange();
        // Don't show error for "interrupted" as it's expected when stopping speech
        if (event.error !== 'interrupted') {
          ErrorHandler.showError(`Speech synthesis error: ${event.error}`);
        }
        // Only reject if it's not an interrupted error
        if (event.error !== 'interrupted') {
          reject(new Error(event.error));
        } else {
          resolve(); // Resolve successfully for interrupted (user stopped)
        }
      };
      
      speechSynthesis.speak(utterance);
    });
  }
  
  async handleCardVoiceOutput(resultType: string, content: string): Promise<void> {
    // If this card is already speaking, stop it
    if (this.activeVoiceCard === resultType && this.isSpeaking) {
      speechSynthesis.cancel();
      this.isSpeaking = false;
      this.activeVoiceCard = null;
      this.notifyStateChange();
      return;
    }
    
    // If another card is speaking, stop it first
    if (this.isSpeaking && this.activeVoiceCard) {
      speechSynthesis.cancel();
      // Wait a bit for the cancel to take effect
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Set the active card before starting speech
    this.activeVoiceCard = resultType;
    this.notifyStateChange();
    
    try {
      await this.handleVoiceOutput(content);
    } catch (error) {
      // Clear the active card on error
      this.activeVoiceCard = null;
      this.notifyStateChange();
      throw error;
    }
  }
  
  private async detectLanguage(text: string): Promise<string> {
    // Check cache first
    const cacheKey = text.substring(0, 100);
    if (this.languageCache.has(cacheKey)) {
      return this.languageCache.get(cacheKey)!;
    }
    
    try {
      // Try to use Chrome built-in language detection via chromeBuiltin service
      if (chromeBuiltin && typeof chromeBuiltin.detectLanguage === 'function') {
        const detected = await chromeBuiltin.detectLanguage(text);
        if (detected && typeof detected === 'string') {
          this.languageCache.set(cacheKey, detected);
          return detected;
        }
      }
    } catch (err) {
      console.warn('Language detection failed, using fallback:', err);
    }
    
    // Fallback to simple heuristic detection
    const detected = this.simpleLanguageDetect(text);
    this.languageCache.set(cacheKey, detected);
    return detected;
  }
  
  private simpleLanguageDetect(text: string): string {
    const sample = text.substring(0, 200).toLowerCase();
    
    // Check for common Hungarian patterns
    if (/á|é|í|ó|ö|ő|ú|ü|ű/.test(sample) && /\b(ez|az|a|az|és|vagy|de|nem|is|mint|ha|amikor|hogy|mert|akkor)\b/.test(sample)) {
      return 'hu-HU';
    }
    
    // Check for common Spanish patterns
    if (/[ñáéíóúü]/.test(sample) && /\b(el|la|los|las|un|una|y|o|pero|es|en|de|con|por|para|que|como|cuando)\b/.test(sample)) {
      return 'es-ES';
    }
    
    // Check for common French patterns
    if (/[àâäéèêëïîôöùûüÿç]/.test(sample) && /\b(le|la|les|un|une|et|ou|mais|est|dans|de|sur|pour|que|qui|comment)\b/.test(sample)) {
      return 'fr-FR';
    }
    
    // Check for common German patterns
    if (/[äöüß]/.test(sample) && /\b(der|die|das|und|oder|aber|ist|in|mit|auf|für|dass|wie|wenn|als)\b/.test(sample)) {
      return 'de-DE';
    }
    
    // Check for common Russian patterns (Cyrillic)
    if (/[а-я]/.test(sample)) {
      return 'ru-RU';
    }
    
    // Check for common Chinese patterns
    if (/[\u4e00-\u9fff]/.test(sample)) {
      return 'zh-CN';
    }
    
    // Check for common Japanese patterns
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) {
      return 'ja-JP';
    }
    
    // Check for common Korean patterns
    if (/[\uac00-\ud7af]/.test(sample)) {
      return 'ko-KR';
    }
    
    // Default to English
    return 'en-US';
  }
  
  stopSpeaking(): void {
    if (this.isSpeaking) {
      speechSynthesis.cancel();
      this.isSpeaking = false;
      this.activeVoiceCard = null;
      this.notifyStateChange();
    }
  }
  
  stopListening(): void {
    if (this.isListening) {
      try {
        const recognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (recognition) {
          recognition.stop();
        }
      } catch (error) {
        console.warn('Failed to stop speech recognition:', error);
      }
      this.isListening = false;
      this.notifyStateChange();
    }
  }
  
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
  
  getIsListening(): boolean {
    return this.isListening;
  }
  
  getActiveCard(): string | null {
    return this.activeVoiceCard;
  }
  
  setSpeaking(speaking: boolean): void {
    this.isSpeaking = speaking;
    this.notifyStateChange();
  }
  
  setActiveCard(card: string | null): void {
    this.activeVoiceCard = card;
    this.notifyStateChange();
  }
  
  private notifyStateChange(): void {
    if (this.onVoiceStateChange) {
      this.onVoiceStateChange(this.isSpeaking, this.isListening, this.activeVoiceCard);
    }
  }
}
