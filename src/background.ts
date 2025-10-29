// Background script for Dude Chrome Extension
// Handles extension lifecycle, messaging, and side panel management

import { aiService } from './services/ai.service';

export {};

/**
 * Capture screenshot of the active tab's visible area
 * Uses chrome.tabs.captureVisibleTab with null windowId (current window)
 */
async function handleScreenshotCapture(): Promise<string> {
  try {
    console.log('📸 Background: Starting screenshot capture...');
    
    // Check permissions first
    const hasPermissions = await chrome.permissions.contains({
      origins: ['https://*/*', 'http://*/*']
    });
    
    console.log('🔐 Host permissions status:', hasPermissions);
    
    if (!hasPermissions) {
      throw new Error('Missing host permissions. Please grant site access to the extension.');
    }

    // Capture current window (no windowId parameter)
    // Requires host_permissions: ["https://*/*", "http://*/*"] in manifest
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: 'png'
    });

    console.log('✅ Screenshot captured successfully:', {
      size: Math.round(dataUrl.length / 1024) + 'KB'
    });

    return dataUrl;
  } catch (error) {
    console.error('❌ Screenshot capture error:', error);
    throw error;
  }
}

// AI availability check
async function checkAIAvailability() {
  try {
    const availability = {
      summarizer: await checkSingleAPI('Summarizer'),
      translator: await checkSingleAPI('Translator'),
      writer: await checkSingleAPI('Writer'),
      prompt: await checkSingleAPI('LanguageModel'),
      languageDetection: await checkSingleAPI('LanguageDetector')
    };
    
    // Session storage - nem persistent
    await chrome.storage.session.set({ aiAvailability: availability });
    console.log('AI Availability checked:', availability);
    return availability;
  } catch (error) {
    console.error(`Error checking AI availability: ${(error as Error).message}`, error);
    const fallback = { 
      summarizer: 'no', 
      translator: 'no', 
      writer: 'no',
      prompt: 'no',
      languageDetection: 'no',
    };
    await chrome.storage.session.set({ aiAvailability: fallback });
    return fallback;
  }
}

async function checkSingleAPI(apiName: string): Promise<'available' | 'readily' | 'after-download' | 'no'> {
  try {
    const candidates: any[] = [];
    try { candidates.push((globalThis as any)[apiName]); } catch (e) {}

    const API = candidates.find(Boolean);

    if (!API) {
      console.warn(`API '${apiName}' not found. Please ensure it is properly installed and configured.`, { apiName });
      return 'no';
    }

    if (typeof API.availability !== 'function') {
      console.warn(`Availability method for API '${apiName}' is not available. This might indicate a version mismatch or incorrect installation.`, { apiName });
      return 'no';
    }
    
    let status;
    try {
      if (apiName === 'Translator') {
        try {
          status = await API.availability({ sourceLanguage: 'en', targetLanguage: 'hu' });
        } catch (e) {
          status = await API.availability();
        }
      } else {
        status = await API.availability();
      }
    } catch (error) {
      console.warn(`Availability check for API '${apiName}' failed: ${(error as Error).message}`, error);
      return 'no';
    }

    const mapped = mapStatus(status);
    return mapped;
  } catch (error) {
    console.error(`Error checking ${apiName} API: ${(error as Error).message}`, error);
    return 'no';
  }
}

function mapStatus(status: any): 'readily' | 'after-download' | 'no' {
  if (typeof status === 'string') {
    switch (status.toLowerCase()) {
      case 'readily':
      case 'available':
        return 'readily';
      case 'after-download':
      case 'after_download':
        return 'after-download';
      default:
        return 'no';
    }
  }
  return 'no';
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log('🤖 Dude Extension installed');
  
  // Clean up any pending requests from previous session
  try {
    aiService.cleanup();
  } catch (error) {
    console.warn('⚠️ AI service cleanup failed:', error);
  }
  
  checkAIAvailability();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('🤖 Dude Extension startup');
  
  // Clean up any pending requests from previous session
  try {
    aiService.cleanup();
  } catch (error) {
    console.warn('⚠️ AI service cleanup failed:', error);
  }
  
  checkAIAvailability();
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request: { 
  action?: string,
  type?: string,
  data?: { 
    url: string, 
    snippet: string, 
    contextText: string, 
    userAgent: string, 
    timestamp: number,
    origin: string 
  } 
}, _sender, sendResponse) => {
  // Handle screenshot capture request
  if (request.type === 'CAPTURE_SCREENSHOT') {
    handleScreenshotCapture()
      .then(dataUrl => {
        sendResponse({ success: true, dataUrl });
      })
      .catch(error => {
        console.error('❌ Screenshot capture failed in background:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'updateSelectedText') {
    // Store the latest selection for side panel access
    chrome.storage.local.set({ lastSelection: request.data });
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'getCurrentTabInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        sendResponse({
          status: 'ok',
          tab: {
            id: tabs[0].id,
            title: tabs[0].title,
            url: tabs[0].url
          }
        });
      } else {
        sendResponse({ status: 'error', message: 'No active tab found' });
      }
    });
    return true; // Keep message channel open
  }

  if (request.action === 'diagnostic' && request.data) {
    try {
      const diag = request.data;
      const key = `diagnostic:${diag.origin}`;
      // Only store the first diagnostic per origin
      chrome.storage.local.get([key], (res) => {
        if (!res || !res[key]) {
          const payload = {
            origin: diag.origin,
            url: diag.url,
            snippet: diag.snippet,
            contextText: diag.contextText,
            userAgent: diag.userAgent,
            timestamp: diag.timestamp
          };
          const obj: Record<string, any> = {};
          obj[key] = payload;
          chrome.storage.local.set(obj, () => {
            console.warn('Dude background: stored diagnostic for', diag.origin);
          });
        }
      });
    } catch (err) {
      console.error('Diagnostic handling failed:', err);
      return false;
    }
    return true;
  }

  return false;
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
  if (tab.id !== undefined) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-sidepanel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id !== undefined) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
      }
    });
  }
});

// Set default side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
