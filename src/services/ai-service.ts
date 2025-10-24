import { chromeBuiltin } from '../core/chrome-builtin';
import { storageService } from './storage-service';
import type { UserPreferences } from '../types/core';
import { ErrorHandler } from '../utils/error-handler';
import { RetryHelper } from '../utils/retry-helper';
import { TextChunker } from '../utils/text-chunker';

export class AIService {
  private static instance: AIService;
  
  private constructor() {}
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private async shouldUseGemini(preferences?: UserPreferences): Promise<boolean> {
    const prefs = preferences || await storageService.getPreferences();
    
    if (!prefs?.gemini?.apiKey) {
      return false;
    }

    if (prefs.gemini.cloudFirst) {
      return true;
    }
    
    // Check availability from session storage
    try {
      const result = await chrome.storage.session.get(['aiAvailability']);
      const availability = result.aiAvailability;
      
      if (availability?.writer && availability.writer !== 'no') {
        return false; // Use built-in
      }
      
      return true; // Fall back to Gemini
    } catch (error) {
      ErrorHandler.logError(error, 'AIService.shouldUseGemini');
      return true;
    }
  }

  private async getGeminiClient() {
    const { default: createGeminiClient } = await import('../core/ai-gemini-client.js');
    return await createGeminiClient();
  }
  
  async summarize(text: string, preferences?: UserPreferences): Promise<string> {
    try {
      const prefs = preferences || await storageService.getPreferences();
      
      if (await this.shouldUseGemini(prefs)) {
        const geminiClient = await this.getGeminiClient();
        const { length, type, format } = prefs.summarization;
        const prompt = `Please summarize the following text in ${length} length and ${type} format: ${format}\n\n${text}`;
        const result = await geminiClient.generate({ text: prompt });
        return result?.text || ErrorHandler.handleAIError(new Error('Summarization failed'), 'Summarization');
      } else {
        return await RetryHelper.withRetry(
          () => chromeBuiltin.summarize(text),
          2,
          2000
        );
      }
    } catch (error) {
      ErrorHandler.logError(error, 'AIService.summarize');
      return ErrorHandler.handleAIError(error, 'Summarization');
    }
  }
  
  async translate(text: string, preferences?: UserPreferences): Promise<string> {
    try {
      const prefs = preferences || await storageService.getPreferences();
      
      if (await this.shouldUseGemini(prefs)) {
        const geminiClient = await this.getGeminiClient();
        let { sourceLanguage, targetLanguage } = prefs.translation;
        
        if (sourceLanguage === 'auto' || prefs.translation.autoDetect) {
          sourceLanguage = await chromeBuiltin.detectLanguage(text);
        }
        
        if (prefs.translation.autoDetect && !targetLanguage) {
          targetLanguage = navigator.language.split('-')[0] || 'en';
        }

        const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`;
        const result = await geminiClient.generate({ text: prompt });
        return result?.text || ErrorHandler.handleAIError(new Error('Translation failed'), 'Translation');
      } else {
        const { sourceLanguage, targetLanguage } = prefs.translation;
        let srcLang = sourceLanguage;
        let tgtLang = targetLanguage;
        
        // Ensure we have valid string values
        if (typeof sourceLanguage !== 'string' || sourceLanguage === null) {
          srcLang = 'en'; // Fallback for invalid sourceLanguage
        }
        if (typeof targetLanguage !== 'string' || targetLanguage === null) {
          tgtLang = 'en'; // Fallback for invalid targetLanguage
        }
        
        if (srcLang === 'auto' || prefs.translation.autoDetect) {
          srcLang = await chromeBuiltin.detectLanguage(text);
        }
        
        console.log('Translation options:', { sourceLang: srcLang, targetLang: tgtLang });
        
        return await RetryHelper.withRetry(
          () => chromeBuiltin.translate(text, srcLang, tgtLang),
          2,
          2000
        );
      }
    } catch (error) {
      ErrorHandler.logError(error, 'AIService.translate');
      return ErrorHandler.handleAIError(error, 'Translation');
    }
  }
  
  async validate(text: string, preferences?: UserPreferences): Promise<string> {
    try {
      const prefs = preferences || await storageService.getPreferences();
      
      if (await this.shouldUseGemini(prefs)) {
        const geminiClient = await this.getGeminiClient();
        const { strictness } = prefs.validation;
        const temperature = strictness === 'strict' ? 0.1 :
                          strictness === 'lenient' ? 0.5 : 0.3;

        const strictnessPrompt = strictness === 'strict'
          ? 'Perform a highly critical credibility analysis of this text.'
          : strictness === 'lenient'
          ? 'Perform a balanced credibility analysis of this text.'
          : 'Evaluate the credibility, truthfulness, and potential bias of this text.';

        const prompt = `${strictnessPrompt}
Analyze the text in the following structured format...

Text to analyze:
"${text}"

Return your response in this exact format:
1. *Source Verification*: ...
2. *Fact-Checking*: ...
3. *AI Detection*: ...
4. *Link & Domain Safety*: ...
5. *Misinformation Risk*: ...
6. *Bias Detection*: ...`;

        const result = await geminiClient.generate({ text: prompt, temperature });
        return result?.text || ErrorHandler.handleAIError(new Error('Validation failed'), 'Validation');
      } else {
        const { strictness } = prefs.validation;
        return await RetryHelper.withRetry(
          () => chromeBuiltin.validate(text, strictness),
          2,
          2000
        );
      }
    } catch (error) {
      ErrorHandler.logError(error, 'AIService.validate');
      return ErrorHandler.handleAIError(error, 'Validation');
    }
  }
  
  async rewrite(text: string, preferences?: UserPreferences): Promise<string> {
    try {
      const prefs = preferences || await storageService.getPreferences();
      
      if (await this.shouldUseGemini(prefs)) {
        const geminiClient = await this.getGeminiClient();
        const { style, tone, complexity } = prefs.rewrite;
        const prompt = `Please rewrite the following text with a ${tone} tone, ${style} style, and ${complexity} complexity:\n\n${text}`;
        const result = await geminiClient.generate({ text: prompt, temperature: 0.1 });
        return result?.text || ErrorHandler.handleAIError(new Error('Rewriting failed'), 'Rewriting');
      } else {
        const { style, tone, complexity } = prefs.rewrite;
        return await RetryHelper.withRetry(
          () => chromeBuiltin.rewrite(text, style, tone, complexity),
          2,
          2000
        );
      }
    } catch (error) {
      ErrorHandler.logError(error, 'AIService.rewrite');
      return ErrorHandler.handleAIError(error, 'Rewriting');
    }
  }
  
  async customPrompt(prompt: string, text: string, preferences?: UserPreferences): Promise<string> {
    try {
      const prefs = preferences || await storageService.getPreferences();
      
      if (await this.shouldUseGemini(prefs)) {
        const geminiClient = await this.getGeminiClient();
        const fullPrompt = `The user has provided the following prompt: "${prompt}". Please respond accordingly to the following text:\n\n${text}`;
        const result = await geminiClient.generate({ text: fullPrompt, temperature: 0.1 });
        return result?.text || ErrorHandler.handleAIError(new Error('Prompting failed'), 'Custom prompt');
      } else {
        return await RetryHelper.withRetry(
          () => chromeBuiltin.customPrompt(prompt, text),
          2,
          2000
        );
      }
    } catch (error) {
      ErrorHandler.logError(error, 'AIService.customPrompt');
      return ErrorHandler.handleAIError(error, 'Custom prompt');
    }
  }
  
  async cleanAndConvertToMarkdown(html: string): Promise<string> {
    try {
      const preferences = await storageService.getPreferences();
      
      if (await this.shouldUseGemini(preferences)) {
        const geminiClient = await this.getGeminiClient();
        const prompt = `Convert the following HTML into clean, well-structured Markdown...`;
        const result = await geminiClient.generate({ text: prompt, temperature: 0.1 });
        return result?.text || ErrorHandler.handleAIError(new Error('Page clipping failed'), 'Page clipping');
      } else {
        // For built-in, we need to check if content is too large and chunk it
        const contentLength = html.length;
        const MAX_BUILTIN_SIZE = 10000; // Conservative limit for built-in
        
        if (contentLength > MAX_BUILTIN_SIZE) {
          console.log(`Content too large for built-in (${contentLength} > ${MAX_BUILTIN_SIZE}), using chunked processing`);
          return await this.summarizeLargeText(html, undefined, preferences);
        } else {
          return await RetryHelper.withRetry(
            () => chromeBuiltin.cleanAndConvertToMarkdown(html),
            2,
            2000
          );
        }
      }
    } catch (error) {
      ErrorHandler.logError(error, 'AIService.cleanAndConvertToMarkdown');
      return ErrorHandler.handleAIError(error, 'Page clipping');
    }
  }
  
  async checkAvailability(): Promise<boolean> {
    try {
      const result = await chrome.storage.session.get(['aiAvailability']);
      const availability = result.aiAvailability;
      
      if (!availability) {
        return false;
      }
      
      return ['readily', 'after-download'].includes(availability.summarizer) ||
             ['readily', 'after-download'].includes(availability.translator) ||
             ['readily', 'after-download'].includes(availability.writer);
    } catch (error) {
      ErrorHandler.logError(error, 'AIService.checkAvailability');
      return false;
    }
  }

  /**
   * Summarize large text using chunking approach
   * @param text Text to summarize
   * @param onProgress Progress callback
   * @param preferences User preferences
   * @returns Promise resolving to summary
   */
  async summarizeLargeText(
    text: string,
    onProgress?: (progress: number, message: string) => void,
    preferences?: UserPreferences
  ): Promise<string> {
    try {
      const prefs = preferences || await storageService.getPreferences();
      
      if (await this.shouldUseGemini(prefs)) {
        return await this.summarizeLargeTextWithGemini(text, onProgress, prefs);
      } else {
        return await this.summarizeLargeTextWithBuiltin(text, onProgress, prefs);
      }
    } catch (error) {
      ErrorHandler.logError(error, 'AIService.summarizeLargeText');
      return ErrorHandler.handleAIError(error, 'Large text summarization');
    }
  }

  /**
   * Process chunks in parallel with timeout protection
   */
  private async processChunksInParallel(
    chunks: string[],
    processFunction: (chunk: string, index: number) => Promise<string>,
    batchSize: number = 3,
    timeoutMs: number = 15000
  ): Promise<string[]> {
    const results: string[] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const chunkIndex = i + batchIndex;
        
        // Add timeout protection
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Chunk ${chunkIndex + 1} processing timeout`)), timeoutMs);
        });
        
        const processingPromise = processFunction(chunk, chunkIndex);
        
        return Promise.race([processingPromise, timeoutPromise]);
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Handle successful results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else {
          console.warn(`Failed to process chunk ${i + index}:`, result.status === 'rejected' ? result.reason : 'Unknown error');
        }
      });
    }
    
    return results;
  }

  /**
   * Summarize large text using Gemini with chunking
   */
  private async summarizeLargeTextWithGemini(
    text: string,
    onProgress?: (progress: number, message: string) => void,
    preferences?: UserPreferences
  ): Promise<string> {
    const geminiClient = await this.getGeminiClient();
    const { length, type, format } = preferences?.summarization || { length: 'medium', type: 'key-points', format: 'markdown' };
    
    // Create chunks with proper quota-based sizing
    let chunkOptions: any = {
      chunkOverlap: 1000,
      minChunkSize: 1000
    };
    
    // For Gemini, use larger chunk size
    chunkOptions.chunkSize = 20000;
    console.log(`Using chunk size for Gemini: ${chunkOptions.chunkSize}`);
    
    const geminiChunkInfo = await TextChunker.createDynamicChunks(text, null, chunkOptions);
    
    if (geminiChunkInfo.chunkCount === 1) {
      // No chunking needed
      const prompt = `Please summarize the following text in ${length} length and ${type} format: ${format}\n\n${text}`;
      const result = await geminiClient.generate({ text: prompt });
      return result?.text || ErrorHandler.handleAIError(new Error('Summarization failed'), 'Summarization');
    }
    
    // Process chunks with progress tracking
    onProgress?.(0, `Split into ${geminiChunkInfo.chunkCount} parts`);
    
    const chunkSummaries = await this.processChunksInParallel(
      geminiChunkInfo.chunks,
      async (chunk: string, index: number) => {
        onProgress?.(
          Math.round((index / geminiChunkInfo.chunks.length) * 50),
          `Summarizing part ${index + 1} of ${geminiChunkInfo.chunks.length}`
        );
        
        const prompt = `Please summarize the following text in ${length} length and ${type} format: ${format}\n\n${chunk}`;
        const result = await geminiClient.generate({ text: prompt });
        return result?.text || '';
      },
      3, // Process 3 chunks in parallel
      15000 // 15 second timeout per chunk
    );
    
    // Create final summary from chunk summaries
    onProgress?.(75, 'Creating final summary');
    return await this.createFinalSummaryWithGemini(chunkSummaries, length, type, format, geminiClient);
  }

  /**
   * Summarize large text using Chrome built-in with chunking
   */
  private async summarizeLargeTextWithBuiltin(
    text: string,
    onProgress?: (progress: number, message: string) => void,
    preferences?: UserPreferences
  ): Promise<string> {
    const { length, type, format } = preferences?.summarization || { length: 'medium', type: 'key-points', format: 'markdown' };
    
    // Get summarizer for quota information
    const summarizer = await this.getBuiltinSummarizer();
    if (!summarizer) {
      throw new Error('Summarizer not available');
    }
    
    // Create chunks with proper quota-based sizing for built-in
    let chunkOptions: any = {
      chunkOverlap: 500, // Smaller overlap for built-in
      minChunkSize: 500  // Smaller minimum for built-in
    };
    
    // For built-in, use much smaller chunks due to quota limits
    if (summarizer && summarizer.inputQuota) {
      const quotaBasedChunkSize = Math.floor(summarizer.inputQuota * 0.6); // Use 60% for safety
      chunkOptions.chunkSize = Math.min(quotaBasedChunkSize, 4000); // Cap at 4000 for built-in
      console.log(`Using quota-based chunk size for built-in: ${chunkOptions.chunkSize} (quota: ${summarizer.inputQuota})`);
    } else {
      chunkOptions.chunkSize = 4000; // Conservative fallback
      console.log(`Using fallback chunk size for built-in: ${chunkOptions.chunkSize}`);
    }
    
    const builtinChunkInfo = await TextChunker.createDynamicChunks(text, summarizer, chunkOptions);
    
    if (builtinChunkInfo.chunkCount === 1) {
      // No chunking needed
      return await this.summarizeWithBuiltin(text, length, type, format);
    }
    
    // Process chunks with progress tracking
    onProgress?.(0, `Split into ${builtinChunkInfo.chunkCount} parts`);
    
    const chunkSummaries = await this.processChunksInParallel(
      builtinChunkInfo.chunks,
      async (chunk: string, index: number) => {
        onProgress?.(
          Math.round((index / builtinChunkInfo.chunks.length) * 50),
          `Summarizing part ${index + 1} of ${builtinChunkInfo.chunks.length}`
        );
        
        return await this.summarizeWithBuiltin(chunk, length, type, format);
      },
      2, // Process 2 chunks in parallel for built-in (more conservative)
      20000 // 20 second timeout for built-in
    );
    
    // Create final summary from chunk summaries
    onProgress?.(75, 'Creating final summary');
    return await this.createFinalSummaryWithBuiltin(chunkSummaries, length, type, format);
  }

  /**
   * Get built-in summarizer instance
   */
  private async getBuiltinSummarizer(): Promise<any> {
    const client = await this.getClient('summarizer');
    if (!client) {
      throw new Error('Summarizer not available');
    }

    try {
      if (typeof client.summarize === 'function') {
        return client;
      } else if (typeof client.create === 'function') {
        const { summarization } = await storageService.getPreferences();
        const { length, type, format } = summarization;
        const instance = await client.create({ type, length, format, outputLanguage: 'en' });
        if (instance.ready) await instance.ready;
        return instance;
      }
    } catch (error) {
      console.warn('Failed to create summarizer instance:', error);
      throw error;
    }
  }

  /**
   * Get AI client by type
   */
  private async getClient(type: 'summarizer' | 'translator' | 'writer' | 'languageModel' | 'languageDetector'): Promise<any> {
    if (type === 'summarizer') {
      return (globalThis as any).Summarizer;
    } else if (type === 'translator') {
      return (globalThis as any).Translator;
    } else if (type === 'writer') {
      return (globalThis as any).Writer;
    } else if (type === 'languageModel') {
      return (globalThis as any).LanguageModel;
    } else if (type === 'languageDetector') {
      return (globalThis as any).LanguageDetector;
    }
    return null;
  }

  /**
   * Summarize with built-in summarizer
   */
  private async summarizeWithBuiltin(
    text: string,
    length: string,
    type: string,
    format: string
  ): Promise<string> {
    const summarizer = await this.getBuiltinSummarizer();
    
    try {
      if (typeof summarizer.summarize === 'function') {
        const result = await summarizer.summarize(text, { type, length, format, outputLanguage: 'en' });
        return result?.text || result || 'Summarization failed';
      } else if (summarizer.summarize) {
        const result = await summarizer.summarize(text, { type, length, format, outputLanguage: 'en' });
        return result?.text || result || 'Summarization failed';
      }
    } catch (error) {
      throw new Error(`Built-in summarization failed: ${error}`);
      return '';
    }
    return 'Summarization failed';
  }

  /**
   * Create final summary from chunk summaries using Gemini
   */
  private async createFinalSummaryWithGemini(
    chunkSummaries: string[],
    length: string,
    type: string,
    format: string,
    geminiClient: any
  ): Promise<string> {
    if (chunkSummaries.length === 1) {
      return chunkSummaries[0];
    }

    const combinedText = chunkSummaries.join('\n\n');
    const prompt = `Please create a final summary in ${length} length and ${type} format: ${format} from these partial summaries:\n\n${combinedText}`;
    
    const result = await geminiClient.generate({ text: prompt });
    return result?.text || ErrorHandler.handleAIError(new Error('Final summary failed'), 'Final summarization');
  }

  /**
   * Create final summary from chunk summaries using built-in
   */
  private async createFinalSummaryWithBuiltin(
    chunkSummaries: string[],
    length: string,
    type: string,
    format: string
  ): Promise<string> {
    if (chunkSummaries.length === 1) {
      return chunkSummaries[0];
    }

    const combinedText = chunkSummaries.join('\n\n');
    return await this.summarizeWithBuiltin(combinedText, length, type, format);
  }
}

export const aiService = AIService.getInstance();
