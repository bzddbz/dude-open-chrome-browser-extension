/**
 * Minimal Storage shim used by core adapters
 * Provides getPreferences() used by chrome-builtin. This is intentionally small
 * and can be replaced with a full preferences service later.
 */
export class Storage {
    static async getPreferences(): Promise<any> {
        try {
            const data = await chrome.storage.local.get('prefs');
            return data?.prefs || {
                summarization: { length: 'short', type: 'extractive', format: 'text' },
            };
        } catch (e) {
            console.warn('Storage.getPreferences failed, returning defaults', e);
            return { summarization: { length: 'short', type: 'extractive', format: 'text' } };
        }
    }
}

export default Storage;
