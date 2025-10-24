// Storage Service Layer for Dude Chrome Extension
// Separates storage operations from UI components

import { Storage } from '../core/storage';
import type { SavedTab, Session, UserPreferences } from '../types/core';
import { CONFIG } from '../types/core';
import { ErrorHandler } from '../utils/error-handler';

export class StorageService {
    private static instance: StorageService;

    private constructor() { }

    static getInstance(): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    async saveTab(tab: SavedTab): Promise<boolean> {
        try {
            await Storage.saveTab(tab);
            return true;
        } catch (error: any) {
            ErrorHandler.logError(error, 'StorageService.saveTab');
            ErrorHandler.showError(`Failed to save tab: ${error.message || 'Unknown error'}`);
            return false;
        }
    }

    async getSavedTabs(): Promise<SavedTab[]> {
        try {
            return await Storage.getSavedTabs();
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.getSavedTabs');
            return [];
        }
    }

    async saveSelection(text: string, url: string, title: string): Promise<boolean> {
        try {
            await Storage.saveSelection(text, url, title);
            return true;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.saveSelection');
            return false;
        }
    }

    async getSelection(): Promise<{ text: string; url: string; title: string; timestamp: number } | null> {
        try {
            return await Storage.getSelection();
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.getSelection');
            return null;
        }
    }

    async exportData(): Promise<string> {
        try {
            return await Storage.exportData();
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.exportData');
            return '{}';
        }
    }

    async clearAll(): Promise<boolean> {
        try {
            await Storage.clearAll();
            return true;
        } catch (error: any) {
            ErrorHandler.logError(error, 'StorageService.clearAll');
            ErrorHandler.showError(`Failed to clear storage: ${error.message || 'Unknown error'}`);
            return false;
        }
    }

    async clearTab(tabId: string): Promise<boolean> {
        try {
            await Storage.clearTab(tabId);
            return true;
        } catch (error: any) {
            ErrorHandler.logError(error, 'StorageService.clearTab');
            ErrorHandler.showError(`Failed to clear tab: ${error.message || 'Unknown error'}`);
            return false;
        }
    }

    async getPreferences(): Promise<UserPreferences> {
        try {
            // First try to get from the new preferences location
            const result = await chrome.storage.local.get(['preferences']);
            if (result.preferences) {
                return result.preferences;
            }
            
            // Fallback to old Storage method
            return await Storage.getPreferences();
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.getPreferences');
            return Storage.getDefaultPreferences();
        }
    }

    async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
        try {
            const current = await this.getPreferences();
            const updated = this.deepMerge(current, updates);
            await chrome.storage.local.set({ preferences: updated });
            return updated;
        } catch (error: any) {
            ErrorHandler.logError(error, 'StorageService.updatePreferences');
            ErrorHandler.showError(`Failed to update preferences: ${error.message || 'Unknown error'}`);
            return await this.getPreferences();
        }
    }

    private deepMerge(target: any, source: any): any {
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

    async resetPreferences(): Promise<UserPreferences> {
        try {
            return await Storage.resetPreferences();
        } catch (error: any) {
            ErrorHandler.logError(error, 'StorageService.resetPreferences');
            ErrorHandler.showError(`Failed to reset preferences: ${error.message || 'Unknown error'}`);
            return Storage.getDefaultPreferences();
        }
    }

    getSupportedLanguages() {
        return Storage.getSupportedLanguages();
    }

    getLanguageByCode(code: string) {
        return Storage.getLanguageByCode(code);
    }


    // Hozzáadjuk a meglévő StorageService-hez:

    // Results management
    async saveResults(results: Record<string, any>): Promise<boolean> {
        try {
            await Storage.saveResults(results);
            return true;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.saveResults');
            return false;
        }
    }

    async getResults(): Promise<Record<string, any>> {
        try {
            return await Storage.getResults();
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.getResults');
            return {};
        }
    }

    async clearResults(): Promise<boolean> {
        try {
            await Storage.clearResults();
            return true;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.clearResults');
            return false;
        }
    }

    // Custom prompts management
    async saveCustomPrompts(prompts: Array<{ prompt: string, response: string, timestamp: number }>): Promise<boolean> {
        try {
            await Storage.saveCustomPrompts(prompts);
            return true;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.saveCustomPrompts');
            return false;
        }
    }

    async getCustomPrompts(): Promise<Array<{ prompt: string, response: string, timestamp: number }>> {
        try {
            return await Storage.getCustomPrompts();
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.getCustomPrompts');
            return [];
        }
    }


    // Tab management with results
    async saveTabWithResults(tab: SavedTab, results: Record<string, any>, customPrompts: Array<{ prompt: string, response: string, timestamp: number }>): Promise<boolean> {
        try {
            const tabWithResults = {
                ...tab,
                results,
                customPrompts
            };
            await Storage.saveTab(tabWithResults);
            return true;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.saveTabWithResults');
            return false;
        }
    }


    // Session management
    async saveCurrentSession(session: Session): Promise<boolean> {
        try {
            await chrome.storage.local.set({ currentSession: session });
            return true;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.saveCurrentSession');
            return false;
        }
    }

    async getCurrentSession(): Promise<Session | null> {
        try {
            const result = await chrome.storage.local.get(['currentSession']);
            return result.currentSession || null;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.getCurrentSession');
            return null;
        }
    }

    async clearCurrentSession(): Promise<boolean> {
        try {
            await chrome.storage.local.remove(['currentSession']);
            return true;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.clearCurrentSession');
            return false;
        }
    }

    async saveSessionToHistory(session: Session): Promise<boolean> {
        try {
            const sessions = await this.getSessionHistory();
            sessions.unshift(session);

            // Limit history size
            const maxSize = CONFIG.STORAGE.MAX_HISTORY_ITEMS;
            if (sessions.length > maxSize) {
                sessions.splice(maxSize);
            }

            await chrome.storage.local.set({ sessionHistory: sessions });
            return true;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.saveSessionToHistory');
            return false;
        }
    }

    async getSessionHistory(): Promise<Session[]> {
        try {
            const result = await chrome.storage.local.get(['sessionHistory']);
            return result.sessionHistory || [];
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.getSessionHistory');
            return [];
        }
    }

    async getSessionFromHistory(sessionId: string): Promise<Session | null> {
        try {
            const sessions = await this.getSessionHistory();
            return sessions.find(s => s.id === sessionId) || null;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.getSessionFromHistory');
            return null;
        }
    }

    // History management (replaces HistoryManager)
    async clearSessionHistory(): Promise<boolean> {
        try {
            await chrome.storage.local.remove(['sessionHistory']);
            return true;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.clearSessionHistory');
            return false;
        }
    }

    async deleteSessionFromHistory(sessionId: string): Promise<boolean> {
        try {
            const sessions = await this.getSessionHistory();
            const filteredSessions = sessions.filter(s => s.id !== sessionId);
            await chrome.storage.local.set({ sessionHistory: filteredSessions });
            return true;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.deleteSessionFromHistory');
            return false;
        }
    }

    // Export functionality (replaces HistoryManager)
    async exportSessionHistory(): Promise<string> {
        try {
            const sessions = await this.getSessionHistory();
            return JSON.stringify(sessions, null, 2);
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.exportSessionHistory');
            return '[]';
        }
    }

    async exportSingleSession(sessionId: string): Promise<string | null> {
        try {
            const session = await this.getSessionFromHistory(sessionId);
            return session ? JSON.stringify(session, null, 2) : null;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.exportSingleSession');
            return null;
        }
    }

    // Settings management (replaces SettingsManager)
    async updateSettings(settings: Partial<UserPreferences>): Promise<UserPreferences> {
        try {
            const currentSettings = await this.getPreferences();
            const updatedSettings = { ...currentSettings, ...settings };
            await chrome.storage.local.set({ preferences: updatedSettings });
            return updatedSettings;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.updateSettings');
            return await this.getPreferences();
        }
    }

    // Auto-save functionality
    async autoSaveCurrentSession(): Promise<boolean> {
        try {
            const session = await this.getCurrentSession();
            if (session && session.results.length > 0) {
                return await this.saveSessionToHistory(session);
            }
            return true;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.autoSaveCurrentSession');
            return false;
        }
    }
    // Gemini API Key Management
    async getGeminiApiKey(): Promise<string> {
        try {
            // First try to get from the new preferences location
            const result = await chrome.storage.local.get(['preferences']);
            if (result.preferences && result.preferences.gemini && result.preferences.gemini.apiKey) {
                console.log('[StorageService] Found API key in new preferences format');
                return result.preferences.gemini.apiKey;
            }
            
            // Fallback to old dude-preferences format for migration
            const oldResult = await chrome.storage.local.get(['dude-preferences']);
            if (oldResult['dude-preferences'] && oldResult['dude-preferences'].data && oldResult['dude-preferences'].data.gemini && oldResult['dude-preferences'].data.gemini.apiKey) {
                console.log('[StorageService] Found API key in old format, migrating...');
                // Migrate to new format
                await this.migrateGeminiSettings(oldResult['dude-preferences'].data);
                return oldResult['dude-preferences'].data.gemini.apiKey;
            }
            
            console.log('[StorageService] No API key found');
            return '';
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.getGeminiApiKey');
            return '';
        }
    }

    async setGeminiApiKey(apiKey: string): Promise<boolean> {
        try {
            if (!this.validateApiKey(apiKey)) {
                throw new Error('Invalid API key format');
            }
            
            const current = await this.getPreferences();
            const updated = {
                ...current,
                gemini: {
                    ...current.gemini,
                    apiKey: apiKey.trim()
                }
            };
            await chrome.storage.local.set({ preferences: updated });
            console.log('[StorageService] API key saved successfully');
            return true;
        } catch (error: any) {
            ErrorHandler.logError(error, 'StorageService.setGeminiApiKey');
            ErrorHandler.showError(`Failed to save API key: ${error.message || 'Unknown error'}`);
            return false;
        }
    }

    async getGeminiModel(): Promise<string> {
        try {
            const result = await chrome.storage.local.get(['preferences']);
            if (result.preferences && result.preferences.gemini && result.preferences.gemini.selectedModel) {
                return result.preferences.gemini.selectedModel;
            }
            
            // Fallback to old format
            const oldResult = await chrome.storage.local.get(['dude-preferences']);
            if (oldResult['dude-preferences'] && oldResult['dude-preferences'].data && oldResult['dude-preferences'].data.gemini && oldResult['dude-preferences'].data.gemini.selectedModel) {
                await this.migrateGeminiSettings(oldResult['dude-preferences'].data);
                return oldResult['dude-preferences'].data.gemini.selectedModel;
            }
            
            return 'gemini-2.0-flash-lite';
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.getGeminiModel');
            return 'gemini-2.0-flash-lite';
        }
    }

    async getGeminiCloudFirst(): Promise<boolean> {
        try {
            const result = await chrome.storage.local.get(['preferences']);
            if (result.preferences && result.preferences.gemini && typeof result.preferences.gemini.cloudFirst === 'boolean') {
                return result.preferences.gemini.cloudFirst;
            }
            
            // Fallback to old format
            const oldResult = await chrome.storage.local.get(['dude-preferences']);
            if (oldResult['dude-preferences'] && oldResult['dude-preferences'].data && oldResult['dude-preferences'].data.gemini && typeof oldResult['dude-preferences'].data.gemini.cloudFirst === 'boolean') {
                await this.migrateGeminiSettings(oldResult['dude-preferences'].data);
                return oldResult['dude-preferences'].data.gemini.cloudFirst;
            }
            
            return false;
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.getGeminiCloudFirst');
            return false;
        }
    }

    private validateApiKey(apiKey: string): boolean {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        
        const trimmedKey = apiKey.trim();
        // Gemini API keys are typically 39 characters long and start with 'AIza'
        if (trimmedKey.length < 20) {
            return false;
        }
        
        // Basic format validation - should contain alphanumeric characters
        return /^[A-Za-z0-9_-]+$/.test(trimmedKey);
    }

    private async migrateGeminiSettings(oldData: any): Promise<void> {
        try {
            console.log('[StorageService] Migrating Gemini settings from old format');
            const current = await this.getPreferences();
            const updated = {
                ...current,
                gemini: {
                    ...current.gemini,
                    apiKey: oldData.gemini?.apiKey || current.gemini.apiKey,
                    selectedModel: oldData.gemini?.selectedModel || current.gemini.selectedModel,
                    cloudFirst: oldData.gemini?.cloudFirst !== undefined ? oldData.gemini.cloudFirst : current.gemini.cloudFirst
                }
            };
            await chrome.storage.local.set({ preferences: updated });
            
            // Remove old data after successful migration
            await chrome.storage.local.remove(['dude-preferences']);
            console.log('[StorageService] Migration completed successfully');
        } catch (error) {
            ErrorHandler.logError(error, 'StorageService.migrateGeminiSettings');
        }
    }
}

export const storageService = StorageService.getInstance();
