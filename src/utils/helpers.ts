/**
 * Utility helper functions for Dude Chrome Extension
 * Provides common functionality for error handling, retries, fallbacks, and event management
 * @since 1.0.0
 */

export class Utils {
    private static readonly DEFAULT_MAX_RETRIES = 3;
    private static readonly DEFAULT_RETRY_DELAY = 500;
    // eslint-disable-next-line @typescript-eslint/ban-types
    private static eventBus = new Map<string, Function[]>();

    /**
     * Retry mechanism with exponential backoff
     * @param operation - Async operation to retry
     * @param maxRetries - Maximum number of retry attempts
     * @param delay - Initial delay between retries in milliseconds
     * @returns Promise that resolves with operation result or rejects after max retries
     */
    static async retry<T>(
        operation: () => Promise<T>,
        maxRetries: number = this.DEFAULT_MAX_RETRIES,
        delay: number = this.DEFAULT_RETRY_DELAY
    ): Promise<T> {
        let attempts = 0;
        
        const executeWithRetry = async (): Promise<T> => {
            try {
                return await operation();
            } catch (error) {
                attempts++;
                
                if (attempts >= maxRetries) {
                    throw error;
                }
                
                // Exponential backoff: delay * 2^attempts
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempts)));
                return executeWithRetry();
            }
        };

        return executeWithRetry();
    }

    /**
     * Handle errors with optional fallback value
     * @param error - Error to handle
     * @param fallback - Optional fallback value to return instead of throwing
     * @returns Fallback value or throws error if no fallback provided
     */
    static handleError(error: unknown, fallback?: any): never | typeof fallback {
        console.error('Error occurred:', error);
        
        if (fallback !== undefined) {
            return fallback;
        }
        
        throw error;
    }

    /**
     * Execute operation with fallback value on failure
     * @param operation - Async operation to execute
     * @param fallbackValue - Value to return if operation fails
     * @returns Promise that resolves with operation result or fallback value
     */
    static async withFallback<T>(
        operation: () => Promise<T>,
        fallbackValue: T
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            console.warn('Using fallback value:', error);
            return fallbackValue;
        }
    }

    /**
     * Add event listener to the event bus
     * @param event - Event name to listen for
     * @param callback - Function to call when event is emitted
     */
    static on<T>(event: string, callback: (data: T) => void): void {
        if (!this.eventBus.has(event)) {
            this.eventBus.set(event, []);
        }
        this.eventBus.get(event)?.push(callback);
    }

    /**
     * Emit event to all listeners
     * @param event - Event name to emit
     * @param data - Optional data to pass to listeners
     */
    static emit<T>(event: string, data?: T): void {
        this.eventBus.get(event)?.forEach(callback => callback(data));
    }

    /**
     * Remove event listener from the event bus
     * @param event - Event name to remove listener from
     * @param callback - Specific callback function to remove (optional)
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    static off(event: string, callback?: Function): void {
        if (!this.eventBus.has(event)) return;
        
        const listeners = this.eventBus.get(event)!;
        if (callback) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        } else {
            // Clear all listeners for this event
            listeners.length = 0;
        }
    }

    /**
     * Clear all event listeners
     */
    static clearEventBus(): void {
        this.eventBus.clear();
    }

    /**
     * Generate unique ID for entities
     * @param prefix - Optional prefix for the ID
     * @returns Unique string ID
     */
    static generateId(prefix: string = 'dude'): string {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sanitize HTML content to prevent XSS
     * @param content - Raw HTML content
     * @returns Sanitized HTML content
     */
    static sanitizeHTML(content: string): string {
        const div = document.createElement('div');
        div.textContent = content;
        return div.innerHTML;
    }

    /**
     * Format timestamp to human-readable string
     * @param timestamp - Unix timestamp
     * @returns Formatted date string
     */
    static formatTimestamp(timestamp: number): string {
        return new Date(timestamp).toLocaleString();
    }

    /**
     * Truncate text to specified length with ellipsis
     * @param text - Text to truncate
     * @param maxLength - Maximum length
     * @returns Truncated text
     */
    static truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
}
