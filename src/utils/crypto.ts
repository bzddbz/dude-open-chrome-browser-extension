/**
 * Simple obfuscation for sensitive data in chrome storage
 * NOT cryptographically secure, just prevents casual viewing
 * @since 1.0.0
 */

// Simple XOR cipher with a key derived from extension ID
const getObfuscationKey = (): string => {
    try {
        // Use a mix of extension-specific values to generate a simple key
        // Use try-catch to handle cases where chrome.runtime is not available
        const extId = (typeof chrome !== 'undefined' && chrome?.runtime?.id) 
            ? chrome.runtime.id 
            : 'dude-extension-default';
        // Create a repeating pattern from the extension ID
        return extId.split('').map((c, i) => 
            String.fromCharCode(c.charCodeAt(0) ^ (i % 256))
        ).join('');
    } catch (e) {
        // Fallback key if chrome.runtime is not available
        return 'dude-extension-default'.split('').map((c, i) => 
            String.fromCharCode(c.charCodeAt(0) ^ (i % 256))
        ).join('');
    }
};

/**
 * Obfuscate a string (simple XOR + base64)
 * @param text - Plain text to obfuscate
 * @returns Obfuscated base64 string
 */
export const obfuscate = (text: string): string => {
    if (!text) return '';
    
    try {
        const key = getObfuscationKey();
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const keyCode = key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode ^ keyCode);
        }
        
        // Base64 encode to make it look less obvious
        return btoa(result);
    } catch (e) {
        console.error('Obfuscation failed:', e);
        return text; // fallback to plain text if fails
    }
};

/**
 * Deobfuscate a string (reverse base64 + XOR)
 * @param obfuscated - Obfuscated base64 string
 * @returns Plain text
 */
export const deobfuscate = (obfuscated: string): string => {
    if (!obfuscated) return '';
    
    try {
        // Check if it looks like base64, if not assume it's plain text (backward compat)
        if (!/^[A-Za-z0-9+/]+=*$/.test(obfuscated)) {
            return obfuscated;
        }
        
        const key = getObfuscationKey();
        const decoded = atob(obfuscated);
        let result = '';
        
        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i);
            const keyCode = key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode ^ keyCode);
        }
        
        return result;
    } catch (e) {
        console.error('Deobfuscation failed:', e);
        return obfuscated; // fallback to original if fails
    }
};

/**
 * Obfuscate API key before storage
 * @param apiKey - Plain API key
 * @returns Obfuscated key safe for storage
 */
export const obfuscateApiKey = (apiKey: string): string => {
    return obfuscate(apiKey);
};

/**
 * Deobfuscate API key from storage
 * @param obfuscated - Obfuscated API key from storage
 * @returns Plain API key
 */
export const deobfuscateApiKey = (obfuscated: string): string => {
    return deobfuscate(obfuscated);
};
