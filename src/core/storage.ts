// Modern storage utility for Dude Chrome Extension with Chrome Storage API

import type { UserPreferences, LanguageOption, SavedTab } from '../types/core';
import { CONFIG } from '../types/core';

// Storage schema for versioning
interface StorageSchema {
  version: string;
  data: any;
}

export class Storage {
  private static readonly SAVED_TABS_KEY = 'dude-saved-tabs';
  private static readonly SELECTION_KEY = 'dude-active-selection';
  private static readonly PREFERENCES_KEY = 'dude-preferences';
  private static readonly STORAGE_VERSION = '1.0.0';


  // Save data with versioning
  private static async saveWithVersion(key: string, data: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const schema: StorageSchema = {
        version: this.STORAGE_VERSION,
        data
      };
      await chrome.storage.local.set({ [key]: schema });
    } else {
      // Fallback to localStorage if chrome.storage is not available
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  // Load data with versioning
  private static async loadWithVersion<T>(key: string): Promise<T | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get([key]);
        const schema: StorageSchema = result[key];
        
        if (!schema) return null;
        
        // Handle version migrations here if needed
        if (schema.version !== this.STORAGE_VERSION) {
          return await this.migrateData(schema, key);
        }
        
        return schema.data;
      } else {
        // Fallback to localStorage if chrome.storage is not available
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
      }
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      return null;
    }
  }

  // Data migration handler
  private static async migrateData(schema: StorageSchema, key: string): Promise<any> {
    // For now, just return the data as-is since we're at v1.0.0
    // Future migrations would go here
    console.warn(`Data version mismatch for ${key}: ${schema.version} -> ${this.STORAGE_VERSION}`);
    return schema.data;
  }

  static async saveTab(tab: SavedTab): Promise<void> {
    try {
      const savedTabs = await this.getSavedTabs();
      savedTabs.push(tab);
      
      // Keep only entries based on preferences
      const preferences = await this.getPreferences();
      if (savedTabs.length > preferences.storage.historyLimit) {
        savedTabs.splice(0, savedTabs.length - preferences.storage.historyLimit);
      }
      
      await this.saveWithVersion(this.SAVED_TABS_KEY, savedTabs);
    } catch (error) {
      console.error('Failed to save tab:', error);
    }
  }

  static async getSavedTabs(): Promise<SavedTab[]> {
    try {
      const result = await this.loadWithVersion<SavedTab[]>(this.SAVED_TABS_KEY);
      return result || [];
    } catch (error) {
      console.error('Failed to load saved tabs:', error);
      return [];
    }
  }

  static async saveSelection(text: string, url: string, title: string): Promise<void> {
    try {
      // Sanitize text to remove any HTML tags and cap length
      const cleanText = String(text || '').replace(/<[^>]*>/g, '').slice(0, 20000);
      const selectionData = {
        text: cleanText,
        url,
        title,
        timestamp: Date.now()
      };
      await this.saveWithVersion(this.SELECTION_KEY, selectionData);
    } catch (error) {
      console.error('Failed to save selection:', error);
    }
  }

  static async getSelection(): Promise<{ text: string; url: string; title: string; timestamp: number } | null> {
    try {
      const result = await this.loadWithVersion<{ text: string; url: string; title: string; timestamp: number }>(this.SELECTION_KEY);
      return result || null;
    } catch (error) {
      console.error('Failed to load selection:', error);
      return null;
    }
  }

  static async exportData(): Promise<string> {
    try {
      const savedTabs = await this.getSavedTabs();
      const data = {
        savedTabs,
        exportDate: new Date().toISOString(),
        version: this.STORAGE_VERSION
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      return '{}';
    }
  }

  static async clearAll(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.remove([this.SAVED_TABS_KEY, this.SELECTION_KEY, this.PREFERENCES_KEY]);
      } else {
        localStorage.removeItem(this.SAVED_TABS_KEY);
        localStorage.removeItem(this.SELECTION_KEY);
        localStorage.removeItem(this.PREFERENCES_KEY);
      }
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  static async clearTab(tabId: string): Promise<void> {
    try {
      const savedTabs = await this.getSavedTabs();
      const filteredTabs = savedTabs.filter(tab => tab.id !== tabId);
      await this.saveWithVersion(this.SAVED_TABS_KEY, filteredTabs);
    } catch (error) {
      console.error('Failed to clear tab:', error);
    }
  }

  // Preferences management
  static async savePreferences(preferences: UserPreferences): Promise<void> {
    try {
      await this.saveWithVersion(this.PREFERENCES_KEY, preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  static async getPreferences(): Promise<UserPreferences> {
    try {
      const result = await this.loadWithVersion<UserPreferences>(this.PREFERENCES_KEY);
      if (result) {
        return result;
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
    
    // Return default preferences
    return this.getDefaultPreferences();
  }

  static getDefaultPreferences(): UserPreferences {
    return {
    translation: {
      targetLanguage: 'en-US',
      sourceLanguage: 'auto',
      autoDetect: true,
      autoTranslateResponse: false,
    },
      
      summarization: {
        length: 'medium',
        type: 'key-points',
        format: 'markdown'
      },
      
      validation: {
        strictness: 'medium',
        checkSources: true,
        factCheckLevel: 'standard'
      },

      rewrite: {
        style: 'neutral',
        tone: 'professional',
        complexity: 'intermediate'
      },
      
      storage: {
        historyLimit: 50,
        autoSave: true,
        autoSaveOnSelectionChange: false,
        exportFormat: 'json'
      },
      
      general: {
        theme: 'auto',
        animations: true,
        notifications: true
      },
      
      gemini: {
        apiKey: '',
        selectedModel: 'gemini-2.0-flash-exp',
        cloudFirst: false
      }
    };
  }

  static async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = this.deepMerge(current, updates);
    await this.savePreferences(updated);
    return updated;
  }

  static async resetPreferences(): Promise<UserPreferences> {
    const defaults = this.getDefaultPreferences();
    await this.savePreferences(defaults);
    return defaults;
  }

  private static deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  // Language management
  static getSupportedLanguages(): LanguageOption[] {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'th', name: 'Thai', nativeName: 'ไทย' },
      { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' }
    ];
  }

  static getLanguageByCode(code: string): LanguageOption | null {
    return this.getSupportedLanguages().find(lang => lang.code === code) || null;
  }

  // Results management
static async saveResults(results: Record<string, any>): Promise<void> {
  await chrome.storage.local.set({ results });
}

static async getResults(): Promise<Record<string, any>> {
  const result = await chrome.storage.local.get(['results']);
  return result.results || {};
}

static async clearResults(): Promise<void> {
  await chrome.storage.local.remove(['results']);
}

// Custom prompts management
static async saveCustomPrompts(prompts: Array<{prompt: string, response: string, timestamp: number}>): Promise<void> {
  await chrome.storage.local.set({ customPrompts: prompts });
}

static async getCustomPrompts(): Promise<Array<{prompt: string, response: string, timestamp: number}>> {
  const result = await chrome.storage.local.get(['customPrompts']);
  return result.customPrompts || [];
}

// Tab management with results
static async saveTabWithResults(tab: SavedTab & { results?: Record<string, any>, customPrompts?: Array<{prompt: string, response: string, timestamp: number}> }): Promise<void> {
  const savedTabs = await this.getSavedTabs();
  const existingIndex = savedTabs.findIndex(t => t.id === tab.id);
  
  const tabToSave = {
    ...tab,
    results: tab.results || {},
    customPrompts: tab.customPrompts || []
  };

  if (existingIndex >= 0) {
    savedTabs[existingIndex] = tabToSave;
  } else {
    savedTabs.unshift(tabToSave);
  }

  // Limit history size
  const maxSize = CONFIG.STORAGE.MAX_HISTORY_ITEMS;
  if (savedTabs.length > maxSize) {
    savedTabs.splice(maxSize);
  }

  await chrome.storage.local.set({ savedTabs });
}

// Auto-save functionality
static async autoSaveSession(selectedText: string, currentTab: any, results: Record<string, any>, customPrompts: Array<{prompt: string, response: string, timestamp: number}>): Promise<void> {
  const savedTab: any = {
    id: `${currentTab?.id || Date.now()}-${Date.now()}-autosave`,
    url: currentTab?.url || '',
    title: currentTab?.title || 'Untitled Page',
    timestamp: Date.now(),
    selectedText,
    results,
    customPrompts
  };

  await this.saveTab(savedTab);
}
}
