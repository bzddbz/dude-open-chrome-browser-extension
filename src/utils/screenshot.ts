/**
 * Screenshot capture utilities for image analysis
 * @module screenshot
 */

/**
 * Capture the visible area of the current tab as a data URI
 * Uses message passing to background script for proper permissions
 * @returns Promise<string> - Data URI of the screenshot (base64 PNG)
 */
export async function captureVisibleTab(): Promise<string> {
  try {
    console.log('📸 Requesting screenshot from background script...');
    
    // Send message to background script to capture screenshot
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT'
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to capture screenshot');
    }

    console.log('📸 Screenshot captured:', {
      size: response.dataUrl.length
    });

    return response.dataUrl;
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
    throw new Error(`Failed to capture screenshot: ${error}`);
  }
}

/**
 * Capture the full page (scrolling viewport) - more complex, not implemented yet
 * @returns Promise<string> - Data URI of the full page screenshot
 */
export async function captureFullPage(): Promise<string> {
  // TODO: Implement full page capture with scrolling
  // For now, just capture visible area
  return captureVisibleTab();
}

/**
 * Check if we have permission to capture the current tab
 * @returns Promise<boolean>
 */
export async function hasScreenshotPermission(): Promise<boolean> {
  try {
    const permissions = await chrome.permissions.contains({
      permissions: ['activeTab', 'tabs']
    });
    return permissions;
  } catch (error) {
    console.error('❌ Permission check failed:', error);
    return false;
  }
}
