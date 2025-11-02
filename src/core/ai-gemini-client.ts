// Lightweight Gemini API client wrapper for Dude extension
// Exposes createClient() which returns an object with generate, stream, write and cancel methods.
import { preferencesService } from '../services/preferences.service';
import { deobfuscateApiKey } from '../utils/crypto';

export async function createClient() {
  const controller = { ac: new AbortController() } as any;

const getApiKey = async (): Promise<string> => {
  try {
    const data = await chrome.storage.local.get('geminiApiKey');
    const obfuscated = data?.geminiApiKey || '';
    if (!obfuscated) {
      console.warn('[GeminiClient] No API key found');
      return '';
    }
    // Deobfuscate before use
    const apiKey = deobfuscateApiKey(obfuscated);
    return apiKey;
  } catch (e) {
    console.error('[GeminiClient] Error getting API key:', e);
    return '';
  }
};

  const getModel = async (): Promise<string> => {
  try {
    const data = await chrome.storage.local.get('geminiModel');
    return data?.geminiModel || 'gemini-2.0-flash-lite';
  } catch (e) {
    console.error('[GeminiClient] Error getting model:', e);
    return 'gemini-2.0-flash-lite';
  }
};

const shouldUseGemini = async (): Promise<boolean> => {
  try {
    let cloudFirst = false;
    let apiKey = '';
    // Prefer explicit cloudFirst flag in storage but fall back to preferences default provider
    try {
      const cfg = await chrome.storage.local.get(['geminiCloudFirst','geminiApiKey']);
      cloudFirst = !!cfg?.geminiCloudFirst;
      apiKey = cfg?.geminiApiKey || '';
    } catch (e) {
      // ignore, will try preferences
    }

    if (!cloudFirst) {
      const prefs = await preferencesService.getPreferences();
      cloudFirst = prefs.defaultProviderId === 'gemini';
    }
    
    if (cloudFirst) {
      console.log('[GeminiClient] Using Gemini due to cloudFirst setting');
      return true;
    }
    
    const hasBuiltInAI = !!(globalThis as any).ai;
    const shouldUseGemini = !hasBuiltInAI || !apiKey;
    
    console.log('[GeminiClient] Built-in AI available:', hasBuiltInAI);
    // Do not log any API key related info
    console.log('[GeminiClient] Route decision (Gemini?):', shouldUseGemini);
    
    return shouldUseGemini;
  } catch (error) {
    console.error('[GeminiClient] Error in shouldUseGemini:', error);
    const apiKey = await getApiKey();
    return !!apiKey;
  }
};

  async function generate(request: any, options?: any) {
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid request object');
    }
    const apiKey = await getApiKey();
    const model = await getModel();
    const useGemini = await shouldUseGemini();

    if (!useGemini || !apiKey) {
      // Fallback to demo mode (no provider details logged)
      const inputText = request?.input || request?.instruction || request?.text || '';
      console.warn('[GeminiClient] Using demo mode');
      return { text: `[Demo Gemini] ${String(inputText).slice(0, 300)}` };
    }

    try {
      console.log('[GeminiClient] Making API request with model:', model);
      const headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      };

      // Construct the prompt based on request type
      let prompt = '';
      if (request.system) {
        prompt += `${request.system}\n\n`;
      }
      if (request.user) {
        prompt += `${request.user}`;
      } else if (request.input) {
        prompt += `${request.input}`;
      } else if (request.text) {
        prompt += `${request.text}`;
      } else if (request.instruction) {
        prompt += `${request.instruction}`;
      }

      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 2048,
          topP: options?.topP || 0.95,
          topK: options?.topK || 40
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.ac.signal
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GeminiClient] API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                   data.choices?.[0]?.message?.content || 
                   '[No response from Gemini]';

      console.log('[GeminiClient] API request successful');
      return { text };
    } catch (error: any) {
      console.warn('[GeminiClient] Generate failed', error);
      
      // Handle specific error cases
      if (error.name === 'AbortError') {
        return { text: '[Request cancelled]' };
      }
      
      if (error.message?.includes('401') || error.message?.includes('API key')) {
        console.error('[GeminiClient] Invalid API key detected');
        return { text: '[Invalid API key - please check your Gemini API key in settings]' };
      }
      
      if (error.message?.includes('429')) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      
      throw error;
    }
  }

  async function stream(request: any, onChunk: (chunk: string) => void, options?: any) {
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid request object');
    }
    const apiKey = await getApiKey();
    const model = await getModel();
    const useGemini = await shouldUseGemini();

    if (!useGemini || !apiKey) {
      // Emulate streaming with demo response
      console.warn('[GeminiClient] Using demo mode for streaming');
      const demo = (await generate(request, options)).text || '';
      const parts = demo.match(/.{1,120}/g) || [demo];
      for (const p of parts) {
        if (controller.ac.signal.aborted) break;
        onChunk(p);
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 60));
      }
      return { text: demo };
    }

    try {
      console.log('[GeminiClient] Starting streaming with model:', model);
      const headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      };

      // Construct the prompt
      let prompt = '';
      if (request.system) {
        prompt += `${request.system}\n\n`;
      }
      if (request.user) {
        prompt += `${request.user}`;
      } else if (request.input) {
        prompt += `${request.input}`;
      } else if (request.text) {
        prompt += `${request.text}`;
      } else if (request.instruction) {
        prompt += `${request.instruction}`;
      }

      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 2048,
          topP: options?.topP || 0.95,
          topK: options?.topK || 40
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.ac.signal
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GeminiClient] Streaming API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (response) {
        if (controller.ac.signal.aborted) {
          break;
        }

        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                onChunk(text);
                fullText += text;
              }
            } catch (e) {
              // Ignore parsing errors for individual chunks
              console.debug('[GeminiClient] Failed to parse streaming chunk', e);
            }
          }
        }
      }

      console.log('[GeminiClient] Streaming completed successfully');
      return { text: fullText };
    } catch (error: any) {
      console.warn('[GeminiClient] Stream failed', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      
      throw error;
    }
  }

  async function write(text: string, options?: any) {
    // Convenience wrapper
    return generate({ instruction: text, input: '' }, options);
  }

  async function analyzeImage(imageDataUrl: string, prompt: string, options?: any) {
    const apiKey = await getApiKey();
    const model = await getModel();
    const useGemini = await shouldUseGemini();

    if (!useGemini || !apiKey) {
      console.warn('[GeminiClient] Vision analysis requires API key');
      throw new Error('Gemini vision analysis requires API key');
    }

    try {
      console.log('[GeminiClient] Making vision API request with model:', model);
      
      // Convert data URL to base64 (remove data:image/png;base64, prefix)
      const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      };

      const requestBody = {
        contents: [{
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: "image/png",
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 2048,
          topP: options?.topP || 0.95,
          topK: options?.topK || 40
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.ac.signal
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GeminiClient] Vision API error:', response.status, errorText);
        throw new Error(`Gemini Vision API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                   '[No response from Gemini Vision]';

      console.log('[GeminiClient] Vision API request successful');
      return { text };
    } catch (error: any) {
      console.warn('[GeminiClient] Vision analysis failed', error);
      
      if (error.name === 'AbortError') {
        return { text: '[Vision request cancelled]' };
      }
      
      if (error.message?.includes('401') || error.message?.includes('API key')) {
        console.error('[GeminiClient] Invalid API key for vision');
        return { text: '[Invalid API key - please check your Gemini API key in settings]' };
      }
      
      throw error;
    }
  }

  function cancel() {
    try { controller.ac.abort(); } catch (e) { /* ignore */ }
  }

  return { generate, stream, write, cancel, analyzeImage };
}

// Also export as createGeminiClient for backward compatibility
export const createGeminiClient = createClient;

export default createClient;
