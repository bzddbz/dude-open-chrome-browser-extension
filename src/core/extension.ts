// Main extension entry point for Dude Chrome Extension

import { Sidebar } from '../ui/sidebar';

// Chrome API declarations
declare global {
  interface Window {
    dudeSidebar?: Sidebar;
  }
  interface Self {
    Summarizer?: { create?: (options?: any) => Promise<any>; availability?: () => Promise<string> };
    Translator?: { create?: (options?: any) => Promise<any>; availability?: (options?: any) => Promise<string> };
    Writer?: { create?: (options?: any) => Promise<any>; availability?: () => Promise<string> };
    LanguageModel?: { create?: (options?: any) => Promise<any>; availability?: () => Promise<string> };
    LanguageDetector?: { create?: (options?: any) => Promise<any>; availability?: () => Promise<string> };
  }
}

// Listen for messages from content script
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'updateSelectedText') {
      try {
        const sidebar = (window as any).dudeSidebar;
        if (sidebar && typeof sidebar.updateSelectedTextFromContent === 'function') {
          sidebar.updateSelectedTextFromContent(
            request.data.text,
            request.data.title,
            request.data.url
          );
          sendResponse({ status: 'ok' });
        } else {
          console.warn('Sidebar not ready for text update');
          sendResponse({ status: 'error', message: 'Sidebar not ready' });
        }
      } catch (error) {
        console.error('Error updating selected text:', error);
        sendResponse({ status: 'error', message: 'Update failed' });
      }
    }
    return true; // Keep message channel open for async response
  });
}

// Initialize the sidebar when DOM is ready
function initializeExtension() {
  try {
    console.log('🚀 Initializing Dude Chrome Extension...');

    // Create sidebar instance
    const sidebar = new Sidebar();
    (window as any).dudeSidebar = sidebar;

    console.log('✅ Dude Extension initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Dude Extension:', error);
  }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Export for debugging
export { Sidebar };
