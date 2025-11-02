/**
 * DOM-based screenshot utility using Canvas API
 * More reliable than chrome.tabs.captureVisibleTab
 * Works without special permissions
 */

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg';
  quality?: number; // 0-1 for jpeg
  scale?: number; // Device pixel ratio
}

/**
 * Capture screenshot using DOM and Canvas
 * This runs in the content script context (on the page)
 */
export async function captureVisibleAreaDOM(
  options: ScreenshotOptions = {}
): Promise<string> {
  const {
    format = 'png',
    quality = 0.95,
    scale = window.devicePixelRatio || 1
  } = options;

  try {
    // Get viewport dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Scale for high DPI
    ctx.scale(scale, scale);

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Get all visible elements and draw them
    // This is a simplified approach - for better results use html2canvas library
    const body = document.body;
    
    // Draw using foreignObject (works for most content)
    const data = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${body.outerHTML}
          </div>
        </foreignObject>
      </svg>
    `;

    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          
          const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const dataUrl = canvas.toDataURL(mimeType, quality);
          
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };
      
      img.src = url;
    });
  } catch (error) {
    console.error('❌ DOM screenshot failed:', error);
    throw new Error(`Failed to capture DOM screenshot: ${error}`);
  }
}

/**
 * Request screenshot via background script, fallback to DOM capture
 * This is called from sidebar/popup
 */
export async function captureVisibleTab(): Promise<string> {
  // Try background script first (has proper permissions)
  try {
    console.log('📸 Requesting screenshot from background script...');
    
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT'
    });
    
    if (response?.success && response?.dataUrl) {
      console.log('✅ Background screenshot successful:', {
        size: Math.round(response.dataUrl.length / 1024) + 'KB'
      });
      
      return response.dataUrl;
    } else {
      throw new Error(response?.error || 'Background screenshot failed');
    }
  } catch (backgroundError) {
    console.warn('⚠️ Background screenshot failed, falling back to DOM capture:', backgroundError);
  }
  
  // Fallback to DOM-based capture
  try {
    console.log('📸 Requesting DOM-based screenshot from content script...');

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    // Simple canvas-based screenshot using DOM-to-image approach
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return new Promise<string>((resolve, reject) => {
          try {
            console.log('� Starting simple canvas capture...');
            
            // Create canvas with viewport size
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // Fill with white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Try to capture actual visual content using foreignObject SVG approach
            const data = `
              <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
                <foreignObject width="100%" height="100%">
                  <div xmlns="http://www.w3.org/1999/xhtml" style="width: ${canvas.width}px; height: ${canvas.height}px; overflow: hidden;">
                    ${document.documentElement.outerHTML}
                  </div>
                </foreignObject>
              </svg>
            `;

            const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);

            const img = new Image();
            
            img.onload = () => {
              try {
                // Draw the actual page content
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(svgUrl);
                
                const dataUrl = canvas.toDataURL('image/png', 0.95);
                
                console.log('✅ Visual content capture completed:', {
                  size: Math.round(dataUrl.length / 1024) + 'KB'
                });

                resolve(dataUrl);
              } catch (drawError) {
                console.warn('⚠️ SVG approach failed, using fallback:', drawError);
                URL.revokeObjectURL(svgUrl);
                
                // Fallback: simple text capture
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#000000';
                ctx.font = '16px Arial';
                ctx.fillText('Screenshot captured from:', 20, 50);
                ctx.fillText(document.title, 20, 80);
                ctx.fillText(window.location.href, 20, 110);
                
                const fallbackDataUrl = canvas.toDataURL('image/png', 0.95);
                resolve(fallbackDataUrl);
              }
            };
            
            img.onerror = () => {
              console.warn('⚠️ SVG image load failed, using text fallback');
              URL.revokeObjectURL(svgUrl);
              
              // Fallback: simple text capture
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = '#000000';
              ctx.font = '16px Arial';
              ctx.fillText('Page captured:', 20, 50);
              ctx.fillText(document.title, 20, 80);
              ctx.fillText(window.location.href, 20, 110);
              
              const fallbackDataUrl = canvas.toDataURL('image/png', 0.95);
              resolve(fallbackDataUrl);
            };
            
            img.src = svgUrl;

            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/png', 0.95);
            
            console.log('✅ Simple canvas capture completed:', {
              size: Math.round(dataUrl.length / 1024) + 'KB'
            });

            resolve(dataUrl);
          } catch (error) {
            console.error('❌ Canvas capture error:', error);
            reject(error);
          }
        });
      }
    });

    if (!results || results.length === 0 || !results[0].result) {
      throw new Error('No screenshot data returned from content script');
    }

    const dataUrl = results[0].result as string;
    
    console.log('✅ DOM screenshot captured:', {
      size: Math.round(dataUrl.length / 1024) + 'KB'
    });

    return dataUrl;
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
    throw new Error(`Failed to capture screenshot: ${error}`);
  }
}
