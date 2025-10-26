/**
 * Simple storage service for extension data
 * @since 1.0.0
 */

import { ExtensionState, StoredResult } from '../types/index.js';

export class StorageService {
    private readonly STORAGE_KEY = 'extension_state';

    /**
     * Save a processing result
     * @param result - Result to save
     * @since 1.0.0
     */
    async saveResult(result: StoredResult): Promise<void> {
        const state = await this.getState();
        state.results.push(result);
        await chrome.storage.local.set({ [this.STORAGE_KEY]: state });
    }

    /**
     * Get current extension state
     * @returns Promise<ExtensionState>
     * @since 1.0.0
     */
    async getState(): Promise<ExtensionState> {
        const result = await chrome.storage.local.get(this.STORAGE_KEY);
        return result[this.STORAGE_KEY] || { activeTabId: 0, results: [] };
    }

    /**
     * Save current session
     * @param session - Session data to save
     * @since 1.0.0
     */
    async saveSession(session: any): Promise<void> {
        await chrome.storage.local.set({ 'current-session': session });
    }

    /**
     * Get current session
     * @returns Promise<any>
     * @since 1.0.0
     */
    async getCurrentSession(): Promise<any> {
        const result = await chrome.storage.local.get('current-session');
        return result['current-session'] || null;
    }

    /**
     * Clear all data
     * @since 1.0.0
     */
    async clearAll(): Promise<void> {
        await chrome.storage.local.clear();
    }
}
