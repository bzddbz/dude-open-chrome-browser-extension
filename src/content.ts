// Content script for Dude Chrome Extension
// Handles text selection and communication with sidebar
// We'll load the contentExtractor dynamically to avoid module issues

// Function to load the contentExtractor
function loadContentExtractor() {
  // This will be set by the extension when it loads
  if ((window as any).contentExtractor) {
    return (window as any).contentExtractor;
  }
  
  // Create a simple fallback if needed
  return {
    extractFullPageContent: function() {
      return {
        html: document.documentElement.outerHTML,
        title: document.title || 'Untitled Page',
        url: window.location.href,
        wordCount: document.body?.innerText.split(/\s+/).filter(word => word.length > 0).length || 0
      };
    }
  };
}

// Set the contentExtractor on the window object
(window as any).contentExtractor = loadContentExtractor();

export {};

(function() {
  'use strict';

  let lastSelection = '';
  let lastUrl = window.location.href;
  let selectionTimeout: NodeJS.Timeout;
  let diagnosticSent = false;

  // Check for URL changes (navigation)
  function checkUrlChange() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      lastSelection = ''; // Clear selection on page change
      
      // Notify extension that page has changed
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        try {
          chrome.runtime.sendMessage({
            action: 'updateSelectedText',
            data: {
              text: '',
              title: document.title,
              url: currentUrl,
              timestamp: Date.now()
            }
          });
        } catch (error) {
          console.log('Dude: Extension popup not open or communication failed');
        }
      }
    }
  }

  // Send selected text to extension
  function sendSelectionToExtension() {
    const selection = window.getSelection();
    let selectedText = selection?.toString().trim() || '';

    // Sanitize: strip HTML tags if the selection accidentally contains markup
    try {
      selectedText = selectedText.replace(/<[^>]*>/g, '').trim();
    } catch (e) {
      // ignore
    }

    // Ignore selections that look like script tags or boilerplate
    const looksLikeScript = /<\s*script\b/i.test(selection?.toString() || '');
    if (!looksLikeScript && selectedText && selectedText !== lastSelection && selectedText.length > 10) {
      lastSelection = selectedText;

      const data = {
        text: selectedText,
        title: document.title,
        url: window.location.href,
        timestamp: Date.now()
      };

      // Send to extension popup if it's open
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        try {
          chrome.runtime.sendMessage({
            action: 'updateSelectedText',
            data: data
          });
          // If selection contains tailwind CDN or tailwind reference, send a diagnostic (only once per page)
          try {
            const needle = 'tailwindcss';
            const scriptSrc = '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"';
            if (!diagnosticSent && (selectedText.toLowerCase().includes(needle) || selectedText.includes(scriptSrc))) {
              diagnosticSent = true;
              const diag = {
                origin: location.origin,
                url: location.href,
                snippet: selectedText.slice(0, 1000),
                contextText: selection?.anchorNode?.parentElement?.innerText?.slice(0, 1000) || '',
                userAgent: navigator.userAgent,
                timestamp: Date.now()
              };
              // send diagnostic message to background
              try { chrome.runtime.sendMessage({ action: 'diagnostic', data: diag }); } catch(e) { /* ignore */ }
              console.warn('Dude diagnostic: suspicious selection detected', diag);
            }
          } catch (e) {
            // ignore diagnostic errors
          }
        } catch (error) {
          console.log('Dude: Extension popup not open or communication failed');
        }
      }

      console.log('Dude: Text selected:', selectedText.substring(0, 50) + '...');
    }
  }

  // Debounced selection handler
  function handleSelection() {
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(sendSelectionToExtension, 300);
  }

  // Listen for selection events
  document.addEventListener('mouseup', handleSelection);
  document.addEventListener('keyup', handleSelection);
  document.addEventListener('selectionchange', handleSelection);

  // Add visual indicator for selectable text
  const style = document.createElement('style');
  style.textContent = `
    ::selection {
      background-color: rgba(102, 126, 234, 0.3);
    }
    
    .dude-highlight {
      background-color: rgba(102, 126, 234, 0.2) !important;
      border-radius: 3px;
      transition: background-color 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  // Monitor URL changes
  setInterval(checkUrlChange, 1000);

  // Initialize
  console.log('🤖 Dude content script loaded');
})();
