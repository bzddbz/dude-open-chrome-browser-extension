/**
 * PreferencesService
 * Centralized preferences (app config, provider metadata, defaults)
 * - Caches preferences in memory
 * - Persists to chrome.storage.local under key 'prefs'
 * - Emits change events to subscribers
 */
import { Utils } from '../utils/helpers.js';
import { UserPreferences, CONFIG } from '@/types/core.js';

export type TextOperationType = 'summarize'|'rewrite'|'validate'|'translate';

export type ProviderMeta = {
  id: string;
  name: string;
  supports: TextOperationType[];
  enabled?: boolean;
  baseUrl?: string;
};

export type Preferences = {
  defaultProviderId?: string;
  enabledFunctions: TextOperationType[];
  providers: Record<string, ProviderMeta>;
  ui: { debounceMs: number; maxTextLength: number; theme?: 'light'|'dark' };
  userSettings: UserPreferences;
};

const PREFS_KEY = 'prefs';

const DEFAULTS: Preferences = {
  defaultProviderId: undefined,
  enabledFunctions: ['summarize','rewrite','validate','translate'],
  providers: {},
  ui: { debounceMs: 300, maxTextLength: 10000, theme: 'light' },
  userSettings: {
    translation: {
      targetLanguage: CONFIG.TRANSLATION.DEFAULT_TARGET_LANGUAGE,
      sourceLanguage: CONFIG.TRANSLATION.DEFAULT_SOURCE_LANGUAGE,
      autoDetect: CONFIG.TRANSLATION.AUTO_DETECT_DEFAULT,
      autoTranslateResponse: CONFIG.TRANSLATION.AUTO_TRANSLATE_RESPONSE_DEFAULT
    },
    summarization: {
      length: CONFIG.SUMMARIZATION.DEFAULT_LENGTH,
      type: CONFIG.SUMMARIZATION.DEFAULT_TYPE,
      format: CONFIG.SUMMARIZATION.DEFAULT_FORMAT
    },
    validation: {
      strictness: CONFIG.VALIDATION.DEFAULT_STRICTNESS,
      checkSources: CONFIG.VALIDATION.DEFAULT_CHECK_SOURCES,
      factCheckLevel: CONFIG.VALIDATION.DEFAULT_FACT_CHECK_LEVEL
    },
    rewrite: {
      style: CONFIG.REWRITE.DEFAULT_STYLE,
      tone: CONFIG.REWRITE.DEFAULT_TONE,
      complexity: CONFIG.REWRITE.DEFAULT_COMPLEXITY
    },
    storage: {
      historyLimit: CONFIG.STORAGE.MAX_HISTORY_ITEMS,
      autoSave: CONFIG.STORAGE.DEFAULT_AUTO_SAVE,
      autoSaveOnSelectionChange: CONFIG.STORAGE.DEFAULT_AUTO_SAVE_ON_SELECTION_CHANGE,
      exportFormat: CONFIG.STORAGE.DEFAULT_EXPORT_FORMAT
    },
    general: {
      theme: CONFIG.UI.DEFAULT_THEME,
      animations: CONFIG.UI.DEFAULT_ANIMATIONS,
      notifications: CONFIG.UI.DEFAULT_NOTIFICATIONS
    },
    gemini: {
      apiKey: '',
      selectedModel: CONFIG.GEMINI.DEFAULT_MODEL,
      cloudFirst: CONFIG.GEMINI.CLOUD_FIRST_DEFAULT
    },
    openaiCompatible: {
      enabled: false,
      baseUrl: 'http://localhost:11434',  // Default Ollama URL
      model: 'llama3:8b',
      apiKey: '',  // Optional, most local servers don't need it
      provider: 'ollama'  // 'ollama' | 'lmstudio' | 'localai' | 'custom'
    }
  }
};

export class PreferencesService {
  private cache: Preferences | null = null;

  constructor() {
    // listen to storage changes to keep cache in sync
    if (chrome && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[PREFS_KEY]) {
          this.cache = this.mergeWithDefaults(changes[PREFS_KEY].newValue || {});
          Utils.emit('preferences-changed', this.cache);
        }
      });
    }
  }

  private mergeWithDefaults(raw: Partial<Preferences>): Preferences {
    return {
      defaultProviderId: raw.defaultProviderId ?? DEFAULTS.defaultProviderId,
      enabledFunctions: raw.enabledFunctions ?? DEFAULTS.enabledFunctions,
      providers: raw.providers ?? DEFAULTS.providers,
      ui: { ...DEFAULTS.ui, ...(raw.ui || {}) },
      userSettings: raw.userSettings ?? DEFAULTS.userSettings
    };
  }

  async getPreferences(): Promise<Preferences> {
    if (this.cache) return this.cache;
    try {
      const res = await chrome.storage.local.get(PREFS_KEY);
      const raw = res?.[PREFS_KEY] || {};
      this.cache = this.mergeWithDefaults(raw);
      return this.cache;
    } catch (e) {
      console.warn('PreferencesService.getPreferences failed, returning defaults', e);
      this.cache = DEFAULTS;
      return this.cache;
    }
  }

  async setPreferences(patch: Partial<Preferences>): Promise<Preferences> {
    const current = await this.getPreferences();
    const next: Preferences = {
      defaultProviderId: patch.defaultProviderId ?? current.defaultProviderId,
      enabledFunctions: patch.enabledFunctions ?? current.enabledFunctions,
      providers: patch.providers ?? current.providers,
      ui: { ...current.ui, ...(patch.ui || {}) },
      userSettings: patch.userSettings ?? current.userSettings
    };

    await chrome.storage.local.set({ [PREFS_KEY]: next });
    this.cache = next;
    Utils.emit('preferences-changed', next);
    return next;
  }
}

export const preferencesService = new PreferencesService();

export default PreferencesService;
