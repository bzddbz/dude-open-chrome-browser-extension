﻿/**
 * Clean single-class implementation
 */
import { chromeBuiltin } from '../core/chrome-builtin';
import { Preferences, preferencesService } from './preferences.service';
import { Utils } from '../utils/helpers';
import { ErrorHandler } from '../utils/error-handler';
import { TextOperationType, TextOperationResult } from '../types/index';
import { deobfuscateApiKey } from '../utils/crypto';

export class AIService {
  private static instance: AIService;
  private openaiClients: Map<string, any> = new Map(); // Cache clients by config key

  private constructor() {}

  /**
   * Clean up all cached clients (call this when extension shuts down or restarts)
   */
  cleanup(): void {
    console.log('🧹 Cleaning up AI service and all cached clients');
    for (const client of this.openaiClients.values()) {
      if (client && typeof client.cleanup === 'function') {
        client.cleanup();
      }
    }
    this.openaiClients.clear();
  }

  static getInstance(): AIService {
    if (!AIService.instance) AIService.instance = new AIService();
    return AIService.instance;
  }

  /**
   * Determines whether to use Gemini API or Chrome built-in AI for a specific operation
   * @param operationType - The type of operation (summarize, translate, etc.)
   * @param preferences - Optional preferences object
   * @returns true if should use Gemini, false if should use built-in
   */
  private async shouldUseGemini(operationType: string, preferences?: Preferences): Promise<boolean> {
    try {
      const prefs = preferences || await preferencesService.getPreferences();
      const gemini = prefs?.userSettings?.gemini;
      
      console.log('🔍 shouldUseGemini check:', {
        operationType,
        cloudFirst: gemini?.cloudFirst
      });
      
      // Map operation to API availability key
      const apiMap: Record<string, string> = {
        'summarize': 'summarizer',
        'translate': 'translator',
        'rewrite': 'writer',
        'validate': 'writer',
        'customPrompt': 'writer',
        'cleanAndConvertToMarkdown': 'writer',
        'detectLanguage': 'languageDetection'
      };
      
      const apiKey = apiMap[operationType] || 'writer';
      
      // Check cloudFirst setting
      if (gemini?.cloudFirst) {
        console.log('☁️ Cloud-first enabled');
        // Cloud-first enabled: use Gemini if API key exists, fallback to built-in
        if (gemini.apiKey) {
          console.log('✅ Using Gemini (cloud-first + has API key)');
          return true;
        }
        
        // No API key, check built-in availability
        const res = await chrome.storage.session.get(['aiAvailability']);
        const availability = (res as any).aiAvailability;
        const apiStatus = availability?.[apiKey];
        
        console.log('🔍 Built-in availability check:', { apiKey, apiStatus });
        
        // If built-in is available, use it
        if (apiStatus === 'readily' || apiStatus === 'available') {
          console.log('✅ Using built-in (cloud-first but no API key, built-in available)');
          return false;
        }
        
        // Built-in not available and no Gemini key → fail (will throw error)
        console.log('❌ No Gemini key and built-in not available');
        return false;
      }
      
      // Cloud-first NOT enabled: prefer built-in, fallback to Gemini
      console.log('🖥️ Built-in first mode');
      const res = await chrome.storage.session.get(['aiAvailability']);
      const availability = (res as any).aiAvailability;
      const apiStatus = availability?.[apiKey];
      
      console.log('🔍 Built-in availability check:', { apiKey, apiStatus });
      
      // If built-in is readily available, use it
      if (apiStatus === 'readily' || apiStatus === 'available') {
        console.log('✅ Using built-in (preferred and available)');
        return false;
      }
      
      // Built-in not available, try Gemini if API key exists
      if (gemini?.apiKey) {
        console.log('✅ Using Gemini (built-in not available, fallback to Gemini)');
        return true;
      }
      
      // No built-in and no Gemini → fail (will throw error)
      console.log('❌ No built-in available and no Gemini key');
      return false;
    } catch (err) {
      ErrorHandler.logError(err, 'AIService.shouldUseGemini');
      // On error, try Gemini as fallback if API key exists
      const prefs = preferences || await preferencesService.getPreferences();
      const hasKey = !!(prefs?.userSettings?.gemini?.apiKey);
      console.log('⚠️ Error in shouldUseGemini, fallback to Gemini:', hasKey);
      return hasKey;
    }
  }

  private async getGeminiClient() {
    const { default: createGeminiClient } = await import('../core/ai-gemini-client');
    return await createGeminiClient();
  }

  private async getOpenAIClient(preferences?: Preferences) {
    const prefs = preferences || await preferencesService.getPreferences();
    const config = prefs?.userSettings?.openaiCompatible;
    
    if (!config || !config.enabled) {
      throw new Error('OpenAI-compatible provider not configured');
    }

    // Create a cache key based on config
    const cacheKey = `${config.baseUrl}:${config.model}:${config.apiKey ? 'with-key' : 'no-key'}`;
    
    // Return cached client if exists
    if (this.openaiClients.has(cacheKey)) {
      console.log('♻️ Reusing cached OpenAI client');
      return this.openaiClients.get(cacheKey);
    }

    // Create new client and cache it
    console.log('🆕 Creating new OpenAI client');
    const { default: createOpenAIClient } = await import('../core/ai-openai-client');
    const client = await createOpenAIClient({
      baseUrl: config.baseUrl,
      model: config.model,
      apiKey: config.apiKey ? deobfuscateApiKey(config.apiKey) : undefined
    });
    
    this.openaiClients.set(cacheKey, client);
    return client;
  }

  /**
   * Determines which AI provider to use: openai-compatible, gemini, or built-in
   * Priority: OpenAI-compatible > Gemini > Built-in
   */
  private async getProviderType(operationType: string, preferences?: Preferences): Promise<'openai-compatible' | 'gemini' | 'built-in'> {
    const prefs = preferences || await preferencesService.getPreferences();
    
    // Check OpenAI-compatible first
    if (prefs?.userSettings?.openaiCompatible?.enabled) {
      console.log('🔌 Using OpenAI-compatible provider');
      return 'openai-compatible';
    }
    
    // Then check Gemini
    if (await this.shouldUseGemini(operationType, prefs)) {
      console.log('☁️ Using Gemini provider');
      return 'gemini';
    }
    
    // Fallback to built-in
    console.log('🖥️ Using Chrome Built-in AI');
    return 'built-in';
  }

  private handleAIError(error: unknown, label: string, fallback = `${label} failed`): string {
    ErrorHandler.logError(error, `AIService.${label}`);
    return fallback;
  }

  private createChunks(text: string, size = 4000, overlap = 500) {
    if (!text) return [''];
    if (text.length <= size) return [text];
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      const end = Math.min(i + size, text.length);
      chunks.push(text.slice(i, end));
      if (end === text.length) break;
      i = Math.max(0, end - overlap);
    }
    return chunks;
  }

  async summarize(text: string, preferences?: Preferences): Promise<string> {
    try {
      const prefs = preferences || await preferencesService.getPreferences();
      const providerType = await this.getProviderType('summarize', prefs);
      
      if (providerType === 'openai-compatible') {
        const openai = await this.getOpenAIClient(prefs);
        const { length, type, format } = prefs.userSettings?.summarization || { length: 'medium', type: 'key-points', format: 'markdown' };
        const autoTranslate = prefs.userSettings?.translation?.autoTranslateResponse ?? false;
        const targetLang = prefs.userSettings?.translation?.targetLanguage || 'en';
        const langInstruction = autoTranslate ? ` Respond in ${targetLang} language.` : '';
        const prompt = `Please summarize the following text in ${length} length and ${type} format: ${format}.${langInstruction}\n\n${text}`;
        return await openai.generate(prompt);
      }
      
      if (providerType === 'gemini') {
        const gemini = await this.getGeminiClient();
        const { length, type, format } = prefs.userSettings?.summarization || { length: 'medium', type: 'key-points', format: 'markdown' };
        const autoTranslate = prefs.userSettings?.translation?.autoTranslateResponse ?? false;
        const targetLang = prefs.userSettings?.translation?.targetLanguage || 'en';
        const langInstruction = autoTranslate ? ` Respond in ${targetLang} language.` : '';
        const prompt = `Please summarize the following text in ${length} length and ${type} format: ${format}.${langInstruction}\n\n${text}`;
        const res = await gemini.generate?.({ text: prompt });
        return res?.text || this.handleAIError(new Error('Summarization failed'), 'Summarization');
      }
      
      return await Utils.retry(() => chromeBuiltin.summarize(text), 2, 2000);
    } catch (err) {
      return this.handleAIError(err, 'Summarization');
    }
  }

  async translate(text: string, preferences?: Preferences): Promise<string> {
    try {
      const prefs = preferences || await preferencesService.getPreferences();
      const providerType = await this.getProviderType('translate', prefs);
      
      if (providerType === 'openai-compatible') {
        const openai = await this.getOpenAIClient(prefs);
        let src = prefs.userSettings?.translation?.sourceLanguage || 'auto';
        let tgt = prefs.userSettings?.translation?.targetLanguage || 'en';
        
        // For non-built-in providers, fallback to 'auto' or browser language
        if (src === 'auto') {
          src = 'auto-detect';
        }
        if (prefs.userSettings?.translation?.autoDetect && !tgt) {
          tgt = navigator.language.split('-')[0] || 'en';
        }
        
        // Convert language codes to full names for better model understanding
        const languageNames: Record<string, string> = {
          'en': 'English',
          'hu': 'Hungarian',
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'zh': 'Chinese',
          'ja': 'Japanese',
          'ko': 'Korean',
          'ru': 'Russian',
          'pt': 'Portuguese',
          'it': 'Italian',
          'ar': 'Arabic',
          'hi': 'Hindi',
          'th': 'Thai',
          'vi': 'Vietnamese'
        };
        
        const srcLang = languageNames[src] || src;
        const tgtLang = languageNames[tgt] || tgt;
        
        console.log(`🌍 Translation request: ${srcLang} → ${tgtLang}`);
        
        const prompt = `Translate the following text from ${srcLang} to ${tgtLang}. Only return the translated text, nothing else:\n\n${text}`;
        return await openai.generate(prompt);
      }
      
      if (providerType === 'gemini') {
        const gemini = await this.getGeminiClient();
        let src = prefs.userSettings?.translation?.sourceLanguage || 'auto';
        let tgt = prefs.userSettings?.translation?.targetLanguage || 'en';
        
        // For non-built-in providers, fallback to 'auto' or browser language
        if (src === 'auto') {
          src = 'auto-detect';
        }
        if (prefs.userSettings?.translation?.autoDetect && !tgt) {
          tgt = navigator.language.split('-')[0] || 'en';
        }
        
        // Convert language codes to full names for better model understanding
        const languageNames: Record<string, string> = {
          'en': 'English',
          'hu': 'Hungarian',
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'zh': 'Chinese',
          'ja': 'Japanese',
          'ko': 'Korean',
          'ru': 'Russian',
          'pt': 'Portuguese',
          'it': 'Italian',
          'ar': 'Arabic',
          'hi': 'Hindi',
          'th': 'Thai',
          'vi': 'Vietnamese'
        };
        
        const srcLang = languageNames[src] || src;
        const tgtLang = languageNames[tgt] || tgt;
        
        console.log(`🌍 Translation request: ${srcLang} → ${tgtLang}`);
        
        const prompt = `Translate the following text from ${srcLang} to ${tgtLang}, only return the translated text:\n\n${text}`;
        const res = await gemini.generate?.({ text: prompt });
        return res?.text || this.handleAIError(new Error('Translation failed'), 'Translation');
      }
      
      // Built-in provider can use Chrome's language detection
      let srcLang = prefs.userSettings?.translation?.sourceLanguage || 'en';
      const tgtLang = prefs.userSettings?.translation?.targetLanguage || 'en';
      
      // Try to detect language only for built-in provider
      if ((srcLang === 'auto' || prefs.userSettings?.translation?.autoDetect) && chromeBuiltin.detectLanguage) {
        try {
          srcLang = await chromeBuiltin.detectLanguage(text);
        } catch (err) {
          console.warn('⚠️ Language detection failed, fallback to English:', err);
          srcLang = 'en';
        }
      } else if (srcLang === 'auto') {
        srcLang = 'en'; // Fallback if detection not available
      }
      
      return await Utils.retry(() => chromeBuiltin.translate(text, srcLang, tgtLang), 2, 2000);
    } catch (err) {
      return this.handleAIError(err, 'Translation');
    }
  }

  async validate(text: string, preferences?: Preferences): Promise<string> {
    try {
      const prefs = preferences || await preferencesService.getPreferences();
      const providerType = await this.getProviderType('validate', prefs);
      
      if (providerType === 'openai-compatible') {
        const openai = await this.getOpenAIClient(prefs);
        const strictness = prefs.userSettings?.validation?.strictness || 'medium';
        const strictPrompt = strictness === 'strict' ? 'Perform a highly critical credibility analysis.' : strictness === 'lenient' ? 'Perform a balanced credibility analysis.' : 'Evaluate credibility and bias.';
        const autoTranslate = prefs.userSettings?.translation?.autoTranslateResponse ?? false;
        const targetLang = prefs.userSettings?.translation?.targetLanguage || 'en';
        const langInstruction = autoTranslate ? ` Respond in ${targetLang} language.` : '';
        const prompt = `${strictPrompt}${langInstruction}\nAnalyze the text:\n\n${text}`;
        return await openai.generate(prompt);
      }
      
      if (providerType === 'gemini') {
        const gemini = await this.getGeminiClient();
        const strictness = prefs.userSettings?.validation?.strictness || 'medium';
        const temp = strictness === 'strict' ? 0.1 : strictness === 'lenient' ? 0.5 : 0.3;
        const strictPrompt = strictness === 'strict' ? 'Perform a highly critical credibility analysis.' : strictness === 'lenient' ? 'Perform a balanced credibility analysis.' : 'Evaluate credibility and bias.';
        const autoTranslate = prefs.userSettings?.translation?.autoTranslateResponse ?? false;
        const targetLang = prefs.userSettings?.translation?.targetLanguage || 'en';
        const langInstruction = autoTranslate ? ` Respond in ${targetLang} language.` : '';
        const prompt = `${strictPrompt}${langInstruction}\nAnalyze the text:\n\n${text}`;
        const res = await gemini.generate?.({ text: prompt, temperature: temp });
        return res?.text || this.handleAIError(new Error('Validation failed'), 'Validation');
      }
      
      const strict = prefs.userSettings?.validation?.strictness || 'medium';
      return await Utils.retry(() => chromeBuiltin.validate(text, strict), 2, 2000);
    } catch (err) {
      return this.handleAIError(err, 'Validation');
    }
  }

  async rewrite(text: string, preferences?: Preferences): Promise<string> {
    try {
      const prefs = preferences || await preferencesService.getPreferences();
      const providerType = await this.getProviderType('rewrite', prefs);
      
      if (providerType === 'openai-compatible') {
        const openai = await this.getOpenAIClient(prefs);
        const { style, tone, complexity } = prefs.userSettings?.rewrite || { style: 'neutral', tone: 'professional', complexity: 'intermediate' };
        const autoTranslate = prefs.userSettings?.translation?.autoTranslateResponse ?? false;
        const targetLang = prefs.userSettings?.translation?.targetLanguage || 'en';
        const langInstruction = autoTranslate ? ` Respond in ${targetLang} language.` : '';
        const prompt = `Please rewrite the following text with a ${tone} tone, ${style} style, and ${complexity} complexity.${langInstruction}\n\n${text}`;
        return await openai.generate(prompt);
      }
      
      if (providerType === 'gemini') {
        const gemini = await this.getGeminiClient();
        const { style, tone, complexity } = prefs.userSettings?.rewrite || { style: 'neutral', tone: 'professional', complexity: 'intermediate' };
        const autoTranslate = prefs.userSettings?.translation?.autoTranslateResponse ?? false;
        const targetLang = prefs.userSettings?.translation?.targetLanguage || 'en';
        const langInstruction = autoTranslate ? ` Respond in ${targetLang} language.` : '';
        const prompt = `Please rewrite the following text with a ${tone} tone, ${style} style, and ${complexity} complexity.${langInstruction}\n\n${text}`;
        const res = await gemini.generate?.({ text: prompt, temperature: 0.1 });
        return res?.text || this.handleAIError(new Error('Rewriting failed'), 'Rewriting');
      }
      
      const { style, tone, complexity } = prefs.userSettings?.rewrite || { style: 'neutral', tone: 'professional', complexity: 'intermediate' };
      return await Utils.retry(() => chromeBuiltin.rewrite(text, style, tone, complexity), 2, 2000);
    } catch (err) {
      return this.handleAIError(err, 'Rewriting');
    }
  }

  async customPrompt(prompt: string, text: string, preferences?: Preferences): Promise<string> {
    try {
      const prefs = preferences || await preferencesService.getPreferences();
      const providerType = await this.getProviderType('customPrompt', prefs);
      
      if (providerType === 'openai-compatible') {
        const openai = await this.getOpenAIClient(prefs);
        const autoTranslate = prefs.userSettings?.translation?.autoTranslateResponse ?? false;
        const targetLang = prefs.userSettings?.translation?.targetLanguage || 'en';
        const langInstruction = autoTranslate ? ` Respond in ${targetLang} language.` : '';
        const full = `You are a helpful assistant. User prompt: "${prompt}".${langInstruction} Respond:\n\n${text}`;
        return await openai.generate(full);
      }
      
      if (providerType === 'gemini') {
        const gemini = await this.getGeminiClient();
        const autoTranslate = prefs.userSettings?.translation?.autoTranslateResponse ?? false;
        const targetLang = prefs.userSettings?.translation?.targetLanguage || 'en';
        const langInstruction = autoTranslate ? ` Respond in ${targetLang} language.` : '';
        const full = `You are a helpful assistant. User prompt: "${prompt}".${langInstruction} Respond:\n\n${text}`;
        const res = await gemini.generate?.({ text: full, temperature: 0.1 });
        return res?.text || this.handleAIError(new Error('Prompting failed'), 'Custom prompt');
      }
      
      return await Utils.retry(() => chromeBuiltin.customPrompt(prompt, text), 2, 2000);
    } catch (err) {
      return this.handleAIError(err, 'Custom prompt');
    }
  }

  async cleanAndConvertToMarkdown(html: string, preferences?: Preferences): Promise<string> {
    try {
      const prefs = preferences || await preferencesService.getPreferences();
      const providerType = await this.getProviderType('cleanAndConvertToMarkdown', prefs);
      
      if (providerType === 'openai-compatible') {
        const openai = await this.getOpenAIClient(prefs);
        const autoTranslate = prefs.userSettings?.translation?.autoTranslateResponse ?? false;
        const targetLang = prefs.userSettings?.translation?.targetLanguage || 'en';
        const langInstruction = autoTranslate ? ` Respond in ${targetLang} language.` : '';
        const prompt = `Convert the following HTML into clean markdown.${langInstruction}\n\n${html}`;
        return await openai.generate(prompt);
      }
      
      if (providerType === 'gemini') {
        const gemini = await this.getGeminiClient();
        const autoTranslate = prefs.userSettings?.translation?.autoTranslateResponse ?? false;
        const targetLang = prefs.userSettings?.translation?.targetLanguage || 'en';
        const langInstruction = autoTranslate ? ` Respond in ${targetLang} language.` : '';
        const prompt = `Convert the following HTML into clean markdown.${langInstruction}\n\n${html}`;
        const res = await gemini.generate?.({ text: prompt, temperature: 0.1 });
        return res?.text || this.handleAIError(new Error('Page clipping failed'), 'Page clipping');
      }
      
      const MAX = 10000;
      if (html.length > MAX) return await this.summarizeLargeText(html, undefined, prefs);
      return await Utils.retry(() => chromeBuiltin.cleanAndConvertToMarkdown(html), 2, 2000);
    } catch (err) {
      return this.handleAIError(err, 'Page clipping');
    }
  }

  /**
   * Analyze an image using vision-capable model
   * @param imageUrl - URL or data URI of the image
   * @param question - Question to ask about the image (optional, defaults to description)
   * @param preferences - User preferences
   */
  async analyzeImage(imageUrl: string, question?: string, preferences?: Preferences): Promise<string> {
    try {
      const prefs = preferences || await preferencesService.getPreferences();
      const providerType = await this.getProviderType('customPrompt', prefs); // Use customPrompt as fallback
      
      // Create system message for better context
      const systemMessage = 'You are analyzing a screenshot of a webpage. Focus on the content and information visible on the page, not on browser elements like tabs, toolbars, or window frames.';
      
      // User question with smart defaults
      const userQuestion = question || 'Analyze this webpage screenshot. Describe what you see, focusing on the main content, text, images, charts, or any other relevant information displayed on the page.';
      
      if (providerType === 'openai-compatible') {
        const openai = await this.getOpenAIClient(prefs);
        const autoTranslate = prefs.userSettings?.translation?.autoTranslateResponse ?? false;
        const targetLang = prefs.userSettings?.translation?.targetLanguage || 'en';
        const langInstruction = autoTranslate ? ` Please respond in ${targetLang} language.` : '';
        
        console.log('🖼️ Analyzing image with OpenAI-compatible provider');
        console.log('🖼️ User question:', userQuestion);
        
        try {
          return await openai.analyzeImageWithSystem(imageUrl, userQuestion + langInstruction, systemMessage);
        } catch (visionError) {
          console.warn('⚠️ Vision analysis failed, trying text-only fallback:', visionError);
          
          // Fallback: Analyze DOM screenshot metadata instead of image content
          const config = prefs?.userSettings?.openaiCompatible;
          const modelName = config?.model || 'unknown';
          
          if (modelName.toLowerCase().includes('gemma') || 
              modelName.toLowerCase().includes('llama') && !modelName.toLowerCase().includes('llava')) {
            const fallbackPrompt = `The model "${modelName}" doesn't support vision. This was a screenshot analysis request. ${langInstruction}
            
Please respond with: "I can see this was a screenshot analysis request, but I'm a text-only model (${modelName}) and cannot analyze images. 
            
To use the vision feature, please load a vision-capable model in Jan such as:
- Qwen2.5-VL-7B-Instruct-Q4_K_M (best quality, slower)
- MiniCPM-V-2_6-int4 (faster alternative)
- LLaVA-1.6-Mistral-7B (good balance)

Then try the screenshot analysis again."`;
            
            return await openai.generate(fallbackPrompt);
          }
          
          throw visionError;
        }
      }
      
      // Gemini and Built-in don't support vision through our current implementation
      throw new Error('Vision analysis requires OpenAI-compatible provider (e.g., Jan with Qwen2.5-VL)');
      
    } catch (err) {
      return this.handleAIError(err, 'Image analysis');
    }
  }

  async summarizeLargeText(text: string, _onProgress?: (n: number, m: string) => void, preferences?: Preferences): Promise<string> {
    try {
      const prefs = preferences || await preferencesService.getPreferences();
      const isGemini = await this.shouldUseGemini('summarize', prefs);
      const chunks = this.createChunks(text, isGemini ? 20000 : 4000, isGemini ? 1000 : 500);
      if (chunks.length === 1) return this.summarize(text, prefs);
      const partials: string[] = [];
      for (let i = 0; i < chunks.length; i++) partials.push(await this.summarize(chunks[i], prefs));
      const combined = partials.join('\n\n');
      return await this.summarize(combined, prefs);
    } catch (err) {
      return this.handleAIError(err, 'Large text summarization');
    }
  }

  async processText(text: string, operation: TextOperationType, userPrompt?: string): Promise<TextOperationResult> {
    const ts = Date.now();
    try {
      let processed = '';
      let operationName = '';
      switch (operation) {
        case TextOperationType.SUMMARIZE:
          processed = await this.summarize(text);
          operationName = 'summarize';
          break;
        case TextOperationType.TRANSLATE:
          processed = await this.translate(text);
          operationName = 'translate';
          break;
        case TextOperationType.VALIDATE:
          processed = await this.validate(text);
          operationName = 'validate';
          break;
        case TextOperationType.REWRITE:
          processed = await this.rewrite(text);
          operationName = 'rewrite';
          break;
        case TextOperationType.CUSTOM_PROMPT:
          if (!userPrompt) throw new Error('Missing user prompt');
          processed = await this.customPrompt(userPrompt, text);
          operationName = 'customPrompt';
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      const result: TextOperationResult = {
        originalText: text,
        processedText: processed || '',
        operationType: operation,
        provider: await this.getProviderType(operationName),
        timestamp: ts
      };
      return result;
    } catch (err) {
      ErrorHandler.logError(err, 'AIService.processText');
      throw err;
    }
  }
}

export const aiService = AIService.getInstance();

