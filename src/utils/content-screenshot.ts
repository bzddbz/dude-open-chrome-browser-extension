/**
 * Content script for DOM-based screenshots
 * Injected into web pages to capture screenshots using html2canvas
 */

// Define html2canvas type for browser environment
declare const html2canvas: any;

/**
 * Capture screenshot using html2canvas library
 * This function will be injected into the page context
 */
async function capturePageScreenshot(): Promise<string> {
  try {
    // Check if html2canvas is available
    if (typeof html2canvas === 'undefined') {
      throw new Error('html2canvas library not available');
    }

    console.log('📸 Starting html2canvas capture...');

    // Capture the entire document body
    const canvas = await html2canvas(document.body, {
      height: window.innerHeight,
      width: window.innerWidth,
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
      allowTaint: true,
      scale: 1,
      logging: false
    });

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png', 0.95);
    
    console.log('✅ html2canvas capture completed:', {
      size: Math.round(dataUrl.length / 1024) + 'KB',
      dimensions: `${canvas.width}x${canvas.height}`
    });

    return dataUrl;
  } catch (error) {
    console.error('❌ html2canvas error:', error);
    throw new Error(`Screenshot capture failed: ${error.message}`);
  }
}

// Export for dynamic import
if (typeof window !== 'undefined') {
  (window as any).capturePageScreenshot = capturePageScreenshot;
}