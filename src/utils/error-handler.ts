// Comprehensive error handling utility for Dude Chrome Extension

export class ErrorHandler {
  static handleAIError(error: any, operation: string): string {
    if (error.name === 'AbortError') {
      return `[Cancelled] ${operation} was cancelled`;
    }
    
    if (error.message?.includes('401') || error.message?.includes('API key')) {
      return '[Invalid API key] Please check your Gemini API key in settings';
    }
    
    if (error.message?.includes('429')) {
      return '[Rate limited] Too many requests. Please try again later';
    }
    
    if (error.message?.includes('network')) {
      return '[Network error] Please check your internet connection';
    }
    
    if (error.message?.includes('quota')) {
      return '[Quota exceeded] Input too large for processing';
    }
    
    return `[Error] ${operation} failed: ${error.message || 'Unknown error'}`;
  }
  
  static showError(message: string, duration: number = 5000): void {
    // Enhanced error display with better UX
    const container = document.getElementById('message-container');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message error';
    messageDiv.innerHTML = `
      <span class="material-icons">error</span>
      <span class="message-text">${message}</span>
      <button class="message-close" aria-label="Close">
        <span class="material-icons">close</span>
      </button>
    `;
    
    container.appendChild(messageDiv);
    
    // Auto-dismiss with visual countdown
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, duration);
  }
  
  static showSuccess(message: string, duration: number = 3000): void {
    const container = document.getElementById('message-container');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message success';
    messageDiv.innerHTML = `
      <span class="material-icons">check_circle</span>
      <span class="message-text">${message}</span>
      <button class="message-close" aria-label="Close">
        <span class="material-icons">close</span>
      </button>
    `;
    
    container.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, duration);
  }
  
  static showInfo(message: string, duration: number = 4000): void {
    const container = document.getElementById('message-container');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message info';
    messageDiv.innerHTML = `
      <span class="material-icons">info</span>
      <span class="message-text">${message}</span>
      <button class="message-close" aria-label="Close">
        <span class="material-icons">close</span>
      </button>
    `;
    
    container.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, duration);
  }
  
  static logError(error: any, context: string): void {
    console.error(`[Dude Extension] ${context}:`, error);
    
    // Send error to background for debugging (if available)
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage({
          action: 'logError',
          data: {
            error: error.message || String(error),
            context,
            timestamp: Date.now(),
            url: window.location.href
          }
        });
      } catch (e) {
        // Ignore errors in error logging
      }
    }
  }
}

export default ErrorHandler;
