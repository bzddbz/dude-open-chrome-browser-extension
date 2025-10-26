/**
 * Application constants for Dude Chrome Extension
 * @since 1.0.0
 */

export const CONFIG = {
    STORAGE: {
        MAX_HISTORY_ITEMS: 50,
        DEFAULT_EXPORT_FORMAT: 'json' as const,
        SESSION_PREFIX: 'dude-session-',
        API_KEY_PREFIX: 'dude-api-key-'
    },
    
    UI: {
        DEBOUNCE_DELAY: 300,
        MESSAGE_DURATION: 5000,
        ANIMATION_DURATION: 300,
        MAX_TEXT_LENGTH: 10000
    },
    
    AI: {
        DEFAULT_MAX_RETRIES: 3,
        DEFAULT_RETRY_DELAY: 500,
        TIMEOUT_DURATION: 30000,
        FALLBACK_MESSAGE: 'AI service temporarily unavailable. Please try again later.'
    },
    
    VOICE: {
        RECOGNITION_LANG: 'en-US',
        SYNTHESIS_LANG: 'en-US',
        MAX_SPEECH_LENGTH: 1000
    }
} as const;

export const EVENTS = {
    TEXT_SELECTED: 'text-selected',
    FUNCTION_SELECTED: 'function-selected',
    SETTINGS_REQUESTED: 'settings-requested',
    OPERATION_START: 'operation-start',
    OPERATION_COMPLETE: 'operation-complete',
    ERROR_OCCURRED: 'error-occurred',
    API_KEY_UPDATED: 'api-key-updated',
    PROVIDER_CHANGED: 'provider-changed',
    SESSION_SAVED: 'session-saved',
    VOICE_STATE_CHANGED: 'voice-state-changed',
    PROMPT_INPUT_CHANGED: 'prompt-input-changed',
    PROMPT_INPUT_DISABLE: 'prompt-input-disable',
    PROMPT_INPUT_ENABLE: 'prompt-input-enable',
    PROMPT_INPUT_CLEAR: 'prompt-input-clear',
    PROMPT_SUBMITTED: 'prompt-submitted',
    CHAR_COUNT_UPDATED: 'char-count-updated',
    LOADING_SHOW: 'loading-show',
    LOADING_HIDE: 'loading-hide',
    LOADING_UPDATE: 'loading-update',
    LOADING_SHOWN: 'loading-shown',
    LOADING_HIDDEN: 'loading-hidden',
    LOADING_UPDATED: 'loading-updated',
    RESULT_DELETE: 'result-delete',
    RESULT_COPIED: 'result-copied',
    VOICE_INPUT_REQUESTED: 'voice-input-requested',
    VOICE_OUTPUT_REQUESTED: 'voice-output-requested',
    RESULT_DELETE_REQUESTED: 'result-delete-requested',
    VOICE_RECOGNITION_START: 'voice-recognition-start',
    VOICE_RECOGNITION_END: 'voice-recognition-end',
    VOICE_TRANSCRIPT_RECEIVED: 'voice-transcript-received',
    VOICE_SYNTHESIS_START: 'voice-synthesis-start',
    VOICE_SYNTHESIS_END: 'voice-synthesis-end',
    VOICE_SYNTHESIS_STOP: 'voice-synthesis-stop'
} as const;

export const CSS_CLASSES = {
    SIDEBAR: 'dude-sidebar',
    BUTTON: 'dude-button',
    BUTTON_PRIMARY: 'dude-button-primary',
    BUTTON_SECONDARY: 'dude-button-secondary',
    LOADING: 'dude-loading',
    RESULT_CARD: 'dude-result-card',
    ERROR: 'dude-error',
    SUCCESS: 'dude-success',
    INFO: 'dude-info',
    MODAL: 'dude-modal',
    INPUT: 'dude-input',
    TEXTAREA: 'dude-textarea',
    PROMPT_INPUT_CONTAINER: 'dude-prompt-input-container'
} as const;
