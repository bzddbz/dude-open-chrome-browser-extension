// Configuration constants for Dude Chrome Extension

export const CONFIG = {
    STORAGE: {
        MAX_HISTORY_ITEMS: 50,
        DEFAULT_EXPORT_FORMAT: 'json',
        HISTORY_LIMIT_OPTIONS: [10, 25, 50, 100],
        DEFAULT_AUTO_SAVE: true,
        DEFAULT_AUTO_SAVE_ON_SELECTION_CHANGE: false
    },

    UI: {
        DEBOUNCE_DELAY: 300,
        AUTO_REFRESH_INTERVAL: 2000,
        MESSAGE_DURATION: 5000,
        PROGRESS_SIMULATION_INTERVAL: 200,
        THEME_OPTIONS: ['light', 'dark', 'auto'] as const,
        DEFAULT_THEME: 'dark',
        DEFAULT_ANIMATIONS: true,
        DEFAULT_NOTIFICATIONS: true
    },

    TRANSLATION: {
        DEFAULT_TARGET_LANGUAGE: 'hu',
        DEFAULT_SOURCE_LANGUAGE: 'en',
        LANGUAGES: {
            SUPPORTED: [
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
            ]
        },
        AUTO_DETECT_DEFAULT: true,
        AUTO_TRANSLATE_RESPONSE_DEFAULT: false
    },

    SUMMARIZATION: {
        DEFAULT_LENGTH: 'medium',
        DEFAULT_TYPE: 'key-points',
        DEFAULT_FORMAT: 'markdown',
        LENGTH_OPTIONS: ['short', 'medium', 'long'] as const,
        TYPE_OPTIONS: ['key-points', 'headline', 'teaser', 'tldr'] as const,
        FORMAT_OPTIONS: ['markdown', 'plain-text'] as const,
    },

    VALIDATION: {
        DEFAULT_STRICTNESS: 'medium',
        DEFAULT_CHECK_SOURCES: true,
        DEFAULT_FACT_CHECK_LEVEL: 'standard',
        STRICTNESS_OPTIONS: ['lenient', 'medium', 'strict'] as const,
        FACT_CHECK_LEVELS: ['basic', 'standard'] as const
    },

    REWRITE: {
        DEFAULT_STYLE: 'neutral',
        DEFAULT_TONE: 'professional',
        DEFAULT_COMPLEXITY: 'intermediate',
        STYLE_OPTIONS: ['formal', 'informal', 'neutral'] as const,
        TONE_OPTIONS: ['friendly', 'professional', 'casual'] as const,
        COMPLEXITY_OPTIONS: ['simple', 'intermediate', 'advanced'] as const
    },

    EXPORT: {
        FORMATS: ['json', 'markdown'] as const,
        FILENAME_DATE_FORMAT: 'yyyy-MM-dd'
    },

    GEMINI: {
        API_KEY: '',
        API_KEY_STORAGE_KEY: 'geminiApiKey',
        CLOUD_FIRST_DEFAULT: false,
        DEFAULT_MODEL: 'gemini-2.0-flash-lite',
        SUPPORTED_MODELS: [
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite-preview-09-2025',
            'gemini-1.5-pro',
            'gemini-1.5-flash'
        ]
    }
} as const;

// Type helpers
export type ExportFormat = typeof CONFIG.EXPORT.FORMATS[number];
export type GeminiModel = typeof CONFIG.GEMINI.SUPPORTED_MODELS[number];
export type SupportedLanguage = typeof CONFIG.TRANSLATION.LANGUAGES.SUPPORTED[number]['code'];
export type SessionStatus = 'active' | 'completed' | 'auto-saved' | 'abandoned';
export type AIProvider = 'built-in' | 'gemini';

export default CONFIG;

// Session factory
export const createSession = (tabData: TabData): Session => ({
    id: `session-${tabData.url}-${Date.now()}`,
    tabData,
    results: [],
    timestamp: Date.now(),
    userSettings: {
        // Only save essential settings, not the entire CONFIG
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
        }
    }
});

// AIResult factory
export const createAIResult = (
    ai: AIProvider,
    type: 'summary' | 'translation' | 'validation' | 'rewrite' | 'customPrompts',
    result: string,
    originalText: string,
    userPrompt?: string
): AIResult => ({
    ai,
    type,
    result,
    originalText,
    timestamp: Date.now(),
    userPrompt
});

export interface Session {
    id: string;
    tabData: TabData;
    results: AIResult[];
    timestamp: number;
    clipData?: string;
    userSettings: UserPreferences;
}

export interface TabData {
    id: string;
    url: string;
    title: string;
}

export interface AIResult {
    ai: 'built-in' | 'gemini';
    type: 'summary' | 'translation' | 'validation' | 'rewrite' | 'customPrompts';
    result: string;
    originalText: string;
    timestamp: number;
    userPrompt?: string;
}

export interface AppState {
    selectedText: string;
    isProcessing: boolean;
    error: string | null;
    results: Record<string, AIResult>;
    customPrompts: Array<{
        prompt: string;
        response: string;
        timestamp: number;
    }>;
    currentTab: {
        id: string;
        title: string;
        url: string;
    } | null;
}

export interface SelectionData {
    text: string;
    url: string;
    title: string;
    timestamp?: number;
}

export interface AIModelAvailability {
    summarizer: 'available' | 'readily' | 'after-download' | 'no';
    translator: 'available' | 'readily' | 'after-download' | 'no';
    writer: 'available' | 'readily' | 'after-download' | 'no';
    prompt: 'available' | 'readily' | 'after-download' | 'no';
    languageDetection: 'available' | 'readily' | 'after-download' | 'no';
}

// User Preferences for settings
export interface UserPreferences {
    translation: {
        targetLanguage: string;
        sourceLanguage: string;
        autoDetect: boolean;
        autoTranslateResponse: boolean;
    };

    summarization: {
        length: 'short' | 'medium' | 'long';
        type: 'key-points' | 'headline' | 'teaser' | 'tldr';
        format: 'markdown' | 'plain-text';
        targetLanguage?: string;
    };

    validation: {
        strictness: 'lenient' | 'medium' | 'strict';
        checkSources: boolean;
        factCheckLevel: 'basic' | 'standard';
    };

    rewrite: {
        style: 'formal' | 'informal' | 'neutral';
        tone: 'friendly' | 'professional' | 'casual';
        complexity: 'simple' | 'intermediate' | 'advanced';
    };

    storage: {
        historyLimit: number;
        autoSave: boolean;
        autoSaveOnSelectionChange: boolean;
        exportFormat: 'json' | 'markdown';
    };

    general: {
        theme: 'light' | 'dark' | 'auto';
        animations: boolean;
        notifications: boolean;
    };

    gemini: {
        apiKey: string;
        selectedModel: string;
        cloudFirst: boolean;
    };
}

// Language options for translation
export interface LanguageOption {
    code: string;
    name: string;
    nativeName: string;
}

// Settings categories
export type SettingsCategory = 'translation' | 'summarization' | 'validation' | 'rewrite' | 'storage' | 'general';

// Legacy type for backward compatibility
export interface SavedTab {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  selectedText?: string;
  summary?: string;
  translation?: string;
  validation?: string;
  rewrite?: string;
  prompt?: string;
  customPrompts?: Array<{prompt: string, response: string, timestamp: number}>;
}
