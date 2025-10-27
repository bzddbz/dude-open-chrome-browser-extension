/**
 * OpenAI-compatible API client for local/offline LLMs
 * Compatible with: Ollama, LM Studio, LocalAI, Oobabooga, etc.
 * @module ai-openai-client
 */

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIClientConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeout?: number;
}

export class OpenAICompatibleClient {
  private config: OpenAIClientConfig;

  constructor(config: OpenAIClientConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config
    };
  }

  /**
   * Send a chat completion request to OpenAI-compatible API
   */
  async chat(
    messages: OpenAIMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<string> {
    try {
      // Add system prompt if provided
      const finalMessages = options?.systemPrompt
        ? [{ role: 'system' as const, content: options.systemPrompt }, ...messages]
        : messages;

      const requestBody: OpenAIRequest = {
        model: this.config.model,
        messages: finalMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: false
      };

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      // Add API key if provided (some local servers don't need it)
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      console.log('🔌 OpenAI-compatible request:', {
        baseUrl: this.config.baseUrl,
        model: this.config.model,
        messagesCount: finalMessages.length
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI-compatible API error: ${response.status} - ${errorText}`);
      }

      const data: OpenAIResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI-compatible API');
      }

      const content = data.choices[0].message.content;
      
      console.log('✅ OpenAI-compatible response received:', {
        tokensUsed: data.usage?.total_tokens || 'unknown',
        contentLength: content.length
      });

      return content;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      
      console.error('❌ OpenAI-compatible client error:', error);
      throw new Error(`OpenAI-compatible API failed: ${error.message || error}`);
    }
  }

  /**
   * Simple text generation helper
   */
  async generate(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }): Promise<string> {
    const messages: OpenAIMessage[] = [
      { role: 'user', content: prompt }
    ];

    return this.chat(messages, options);
  }

  /**
   * Test connection to the OpenAI-compatible server
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        method: 'GET',
        headers: this.config.apiKey ? {
          'Authorization': `Bearer ${this.config.apiKey}`
        } : {}
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Server returned ${response.status}`
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed'
      };
    }
  }
}

/**
 * Create OpenAI-compatible client instance
 */
export async function createOpenAIClient(config: OpenAIClientConfig): Promise<OpenAICompatibleClient> {
  return new OpenAICompatibleClient(config);
}

export default createOpenAIClient;
