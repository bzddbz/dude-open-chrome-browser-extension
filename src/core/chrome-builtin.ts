import { preferencesService } from '../services/preferences.service';
import { ErrorHandler } from '../utils/error-handler';

declare global {
  interface Self {
    Summarizer?: { create?: (options?: any) => Promise<any>; availability?: () => Promise<string> };
    Translator?: { create?: (options?: any) => Promise<any>; availability?: (options?: any) => Promise<string> };
    Writer?: { create?: (options?: any) => Promise<any>; availability?: () => Promise<string> };
    LanguageModel?: { create?: (options?: any) => Promise<any>; availability?: () => Promise<string> };
    LanguageDetector?: { create?: (options?: any) => Promise<any>; availability?: () => Promise<string> };
  }
}

export class ChromeBuiltIn {
  private static instance: ChromeBuiltIn;
  private clients: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ChromeBuiltIn {
    if (!ChromeBuiltIn.instance) {
      ChromeBuiltIn.instance = new ChromeBuiltIn();
    }
    return ChromeBuiltIn.instance;
  }

  private async getClient(type: 'summarizer' | 'translator' | 'writer' | 'languageModel' | 'languageDetector'): Promise<any> {
    if (this.clients.has(type)) {
      return this.clients.get(type);
    }

    let client;
    switch (type) {
      case 'summarizer':
        client = (globalThis as any).Summarizer;
        break;
      case 'translator':
        client = (globalThis as any).Translator;
        break;
      case 'writer':
        client = (globalThis as any).Writer;
        break;
      case 'languageModel':
        client = (globalThis as any).LanguageModel;
        break;
      case 'languageDetector':
        client = (globalThis as any).LanguageDetector;
        break;
    }

    if (client) {
      this.clients.set(type, client);
    }
    return client;
  }

  async summarize(text: string): Promise<string> {
    // ensure preferences are loaded (e.g., provider defaults); we don't require summarization prefs here
    const userPreferences = await preferencesService.getPreferences();
    const length = userPreferences.userSettings.summarization.length;
    const type = userPreferences.userSettings.summarization.type;
    const format = userPreferences.userSettings.summarization.format;
    
    // Get output language (for auto-translate feature)
    const autoTranslate = userPreferences.userSettings.translation?.autoTranslateResponse ?? false;
    const targetLang = userPreferences.userSettings.translation?.targetLanguage || 'en';
    
    // Chrome Summarizer API only supports: en, es, ja
    // If user wants other languages, we'll translate after summarizing
    const SUPPORTED_SUMMARIZER_LANGS = ['en', 'es', 'ja'];
    const needsTranslation = autoTranslate && !SUPPORTED_SUMMARIZER_LANGS.includes(targetLang);
    const outputLanguage = needsTranslation ? 'en' : (autoTranslate ? targetLang : 'en');

    const client = await this.getClient('summarizer');
    if (!client) {
      throw new Error('Summarizer not available');
    }

    try {
      let result;
      if (typeof client.summarize === 'function') {
        result = await client.summarize(text, { type, length, format, outputLanguage });
      }
       else if (typeof client.create === 'function') {
        const instance = await client.create({ type, length, format, outputLanguage });
        if (instance.ready) await instance.ready;
        result = await instance.summarize(text);
        if (typeof instance.destroy === 'function') await instance.destroy();
      }
      
      const summaryText = result?.text || result || 'Summarization failed';
      
      // If target language is not supported by Summarizer, translate the result
      if (needsTranslation) {
        console.log(`🔄 Translating summary from ${outputLanguage} to ${targetLang}...`);
        try {
          const translated = await this.translate(summaryText, outputLanguage, targetLang);
          return translated;
        } catch (translateError) {
          console.warn('Translation of summary failed, returning English summary:', translateError);
          return summaryText; // Fallback to English summary if translation fails
        }
      }
      
      return summaryText;
    } catch (error) {
      ErrorHandler.logError(error, 'ChromeBuiltIn.summarize');
      throw new Error(`Summarization failed: ${error}`);
    }
  }

  async translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
    const client = await this.getClient('translator');
    if (!client) {
      throw new Error('Translator not available');
    }

    try {
      // Ensure proper language codes
      console.log('Raw language codes:', { sourceLanguage, targetLanguage, sourceLanguageType: typeof sourceLanguage, targetLanguageType: typeof targetLanguage });
      
      // Chrome Translator API expects source and target languages
      // If sourceLanguage is 'auto', detect it first
      let sourceLang = sourceLanguage;
      if (sourceLang === 'auto') {
        console.log('Auto-detecting source language...');
        sourceLang = await this.detectLanguage(text);
        console.log('Detected language:', sourceLang);
      }
      
      const normalizedSource = this.normalizeLanguageCode(sourceLang);
      const normalizedTarget = this.normalizeLanguageCode(targetLanguage);

      console.log('Translation options:', { sourceLang: normalizedSource, targetLang: normalizedTarget });

      // Determine how to instantiate the translator
      let result;
      if (typeof client.translate === 'function') {
        // Translator supports direct translate with separate language arguments
        result = await client.translate(text, normalizedSource, normalizedTarget);
      } else if (typeof client.create === 'function') {
        // Some implementations expect language codes as separate arguments
        const instance = client.create.length >= 2
          ? await client.create(normalizedSource, normalizedTarget)
          : await client.create({ sourceLanguage: normalizedSource, targetLanguage: normalizedTarget });
        if (instance.ready) await instance.ready;
        result = await instance.translate(text);
        if (instance.destroy) await instance.destroy();
      }
      return result?.text || result || String(result);
    } catch (error) {
      ErrorHandler.logError(error, 'ChromeBuiltIn.translate');
      throw new Error(`Translation failed: ${error}`);
    }
  }

  private normalizeLanguageCode(code: string | any): string {
    // Handle array inputs (language detection results)
    if (Array.isArray(code)) {
      // Get the first result with highest confidence
      const firstResult = code[0];
      if (firstResult && firstResult.detectedLanguage) {
        code = firstResult.detectedLanguage;
      } else {
        code = 'en'; // fallback
      }
    }
    
    // Handle object inputs
    if (typeof code === 'object' && code !== null) {
      // Try to extract language code from object
      if (code.code) return code.code;
      if (code.language) return code.language;
      if (code.lang) return code.lang;
      if (code.detectedLanguage) return code.detectedLanguage;
      // Fallback to string representation
      code = String(code);
    }
    
    // Ensure we have a string
    if (typeof code !== 'string') {
      code = String(code);
    }
    
    // Convert language codes to proper format
    const languageMap: { [key: string]: string } = {
      'en': 'en',
      'hu': 'hu',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'zh': 'zh',
      'ja': 'ja',
      'ko': 'ko',
      'ru': 'ru',
      'pt': 'pt',
      'it': 'it',
      'ar': 'ar',
      'hi': 'hi',
      'th': 'th',
      'vi': 'vi'
    };
    
    return languageMap[code] || code;
  }

  async rewrite(text: string, style: string, tone: string, complexity: string): Promise<string> {
    const userPreferences = await preferencesService.getPreferences();
    const autoTranslate = userPreferences.userSettings.translation?.autoTranslateResponse ?? false;
    const targetLang = userPreferences.userSettings.translation?.targetLanguage || 'en';
    
    // Chrome Writer API only supports: en, es, ja
    const SUPPORTED_WRITER_LANGS = ['en', 'es', 'ja'];
    const needsTranslation = autoTranslate && !SUPPORTED_WRITER_LANGS.includes(targetLang);
    const outputLanguage = needsTranslation ? 'en' : (autoTranslate ? targetLang : 'en');
    
    const prompt = `Please rewrite the following text with a ${tone} tone, ${style} style, and ${complexity} complexity:\n\n${text}`;
    
    const client = await this.getClient('writer');
    if (!client) {
      throw new Error('Writer not available');
    }

    try {
      const writer = await client.create({ sharedContext: `Write in ${outputLanguage} language` });
      if (writer.ready) await writer.ready;
      const result = await writer.write(prompt);
      if (writer.destroy) await writer.destroy();
      
      // If target language is not supported by Writer, translate the result
      if (needsTranslation) {
        console.log(`🔄 Translating rewrite from ${outputLanguage} to ${targetLang}...`);
        try {
          const translated = await this.translate(result, outputLanguage, targetLang);
          return translated;
        } catch (translateError) {
          console.warn('Translation of rewrite failed, returning English result:', translateError);
          return result;
        }
      }
      
      return result;
    } catch (error) {
      ErrorHandler.logError(error, 'ChromeBuiltIn.rewrite');
      throw new Error(`Rewriting failed: ${error}`);
    }
  }

  async validate(text: string, strictness: string): Promise<string> {
    const userPreferences = await preferencesService.getPreferences();
    const autoTranslate = userPreferences.userSettings.translation?.autoTranslateResponse ?? false;
    const targetLang = userPreferences.userSettings.translation?.targetLanguage || 'en';
    
    // Chrome Writer API only supports: en, es, ja
    const SUPPORTED_WRITER_LANGS = ['en', 'es', 'ja'];
    const needsTranslation = autoTranslate && !SUPPORTED_WRITER_LANGS.includes(targetLang);
    const outputLanguage = needsTranslation ? 'en' : (autoTranslate ? targetLang : 'en');
    
    const temperature = strictness === 'strict' ? 0.1 : 
                       strictness === 'lenient' ? 0.5 : 0.3;

    const strictnessPrompt = strictness === 'strict'
      ? 'Perform a highly critical credibility analysis of this text.'
      : strictness === 'lenient'
      ? 'Perform a balanced credibility analysis of this text.'
      : 'Evaluate the credibility, truthfulness, and potential bias of this text.';

    // Add current date context to help the model understand temporal context
    const today = new Date();
    const currentDate = today.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const prompt = `IMPORTANT CONTEXT: Today's date is ${currentDate}. When analyzing this text, consider that:
- Events from 2024-2025 are CURRENT or RECENT, not future speculation
- References to dates close to ${currentDate} are REAL-TIME events
- Do NOT flag recent events as "speculation" or "unverifiable future claims"
- Focus on factual accuracy, source credibility, and logical consistency

${strictnessPrompt}

Text to analyze:
"${text}"

Return your response in this exact format:
1. *Source Verification*: Assess the credibility of sources (if mentioned) or lack thereof
2. *Fact-Checking*: Verify factual claims considering the current date is ${currentDate}
3. *AI Detection*: Evaluate if text shows signs of AI generation (repetitive patterns, generic phrasing)
4. *Link & Domain Safety*: Check for suspicious URLs or domains (if present)
5. *Misinformation Risk*: Assess likelihood of misleading or false information
6. *Bias Detection*: Identify potential bias (political, commercial, cultural, etc.)

Be objective and consider temporal context. Recent dates are NOT speculation.`;

    const client = await this.getClient('writer');
    if (!client) {
      throw new Error('Writer not available for validation');
    }

    try {
      const writer = await client.create({ temperature, sharedContext: `Write in ${outputLanguage} language` });
      if (writer.ready) await writer.ready;
      const result = await writer.write(prompt);
      if (writer.destroy) await writer.destroy();
      
      // If target language is not supported by Writer, translate the result
      if (needsTranslation) {
        console.log(`🔄 Translating validation from ${outputLanguage} to ${targetLang}...`);
        try {
          const translated = await this.translate(result, outputLanguage, targetLang);
          return translated;
        } catch (translateError) {
          console.warn('Translation of validation failed, returning English result:', translateError);
          return result;
        }
      }
      
      return result;
    } catch (error) {
      ErrorHandler.logError(error, 'ChromeBuiltIn.validate');
      throw new Error(`Validation failed: ${error}`);
    }
  }

  async customPrompt(prompt: string, text: string): Promise<string> {
    const userPreferences = await preferencesService.getPreferences();
    const autoTranslate = userPreferences.userSettings.translation?.autoTranslateResponse ?? false;
    const targetLang = userPreferences.userSettings.translation?.targetLanguage || 'en';
    
    // Chrome Writer API only supports: en, es, ja
    const SUPPORTED_WRITER_LANGS = ['en', 'es', 'ja'];
    const needsTranslation = autoTranslate && !SUPPORTED_WRITER_LANGS.includes(targetLang);
    const outputLanguage = needsTranslation ? 'en' : (autoTranslate ? targetLang : 'en');
    
    const fullPrompt = `The user has provided the following prompt: "${prompt}". Please respond accordingly to the following text:\n\n${text}`;
    
    const client = await this.getClient('writer');
    if (!client) {
      throw new Error('Writer not available for custom prompt');
    }

    try {
      const writer = await client.create({ sharedContext: `Write in ${outputLanguage} language` });
      if (writer.ready) await writer.ready;
      const result = await writer.write(fullPrompt);
      if (writer.destroy) await writer.destroy();
      
      // If target language is not supported by Writer, translate the result
      if (needsTranslation) {
        console.log(`🔄 Translating custom prompt response from ${outputLanguage} to ${targetLang}...`);
        try {
          const translated = await this.translate(result, outputLanguage, targetLang);
          return translated;
        } catch (translateError) {
          console.warn('Translation of custom prompt failed, returning English result:', translateError);
          return result;
        }
      }
      
      return result;
    } catch (error) {
      ErrorHandler.logError(error, 'ChromeBuiltIn.customPrompt');
      throw new Error(`Custom prompt failed: ${error}`);
    }
  }

  async cleanAndConvertToMarkdown(html: string): Promise<string> {
    const userPreferences = await preferencesService.getPreferences();
    const autoTranslate = userPreferences.userSettings.translation?.autoTranslateResponse ?? false;
    const targetLang = userPreferences.userSettings.translation?.targetLanguage || 'en';
    
    // Chrome Writer API only supports: en, es, ja
    const SUPPORTED_WRITER_LANGS = ['en', 'es', 'ja'];
    const needsTranslation = autoTranslate && !SUPPORTED_WRITER_LANGS.includes(targetLang);
    const outputLanguage = needsTranslation ? 'en' : (autoTranslate ? targetLang : 'en');
    
    const prompt = `Convert the following HTML into clean, well-structured Markdown: ${html}`;

    const client = await this.getClient('writer');
    if (!client) {
      throw new Error('Writer not available for page clipping');
    }

    try {
      const writer = await client.create({ temperature: 0.1, sharedContext: `Write in ${outputLanguage} language` });
      if (writer.ready) await writer.ready;
      const result = await writer.write(prompt);
      if (writer.destroy) await writer.destroy();
      
      // If target language is not supported by Writer, translate the result
      if (needsTranslation) {
        console.log(`🔄 Translating markdown from ${outputLanguage} to ${targetLang}...`);
        try {
          const translated = await this.translate(result, outputLanguage, targetLang);
          return translated;
        } catch (translateError) {
          console.warn('Translation of markdown failed, returning English result:', translateError);
          return result;
        }
      }
      
      return result;
    } catch (error) {
      ErrorHandler.logError(error, 'ChromeBuiltIn.cleanAndConvertToMarkdown');
      throw new Error(`Page clipping failed: ${error}`);
    }
  }

  async detectLanguage(text: string): Promise<string> {
    const client = await this.getClient('languageDetector');
    if (!client) {
      throw new Error('Language detector not available');
    }

    try {
      const detector = await client.create();
      if (detector.ready) await detector.ready;
      const result = await detector.detect(text);
      if (detector.destroy) await detector.destroy();
      return result || 'en';
    } catch (error) {
      ErrorHandler.logError(error, 'ChromeBuiltIn.detectLanguage');
      throw new Error(`Language detection failed: ${error}`);
    }
  }
}

export const chromeBuiltin = ChromeBuiltIn.getInstance();
