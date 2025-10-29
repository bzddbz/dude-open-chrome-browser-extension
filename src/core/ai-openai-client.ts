/**
 * OpenAI-compatible API client for local/offline LLMs
 * Compatible with: Ollama, LM Studio, LocalAI, Jan, Oobabooga, etc.
 * Supports vision models (image analysis)
 * @module ai-openai-client
 */

export interface OpenAITextContent {
  type: 'text';
  text: string;
}

export interface OpenAIImageContent {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export type OpenAIMessageContent = string | Array<OpenAITextContent | OpenAIImageContent>;

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: OpenAIMessageContent;
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
  private currentController: AbortController | null = null;

  constructor(config: OpenAIClientConfig) {
    this.config = {
      timeout: 120000, // 120 seconds (2 minutes) for slower reasoning models like DeepSeek-R1
      ...config
    };
  }

  /**
   * Cancel any ongoing request
   */
  private cancelCurrentRequest(): void {
    if (this.currentController) {
      console.log('🚫 Cancelling previous request');
      this.currentController.abort();
      this.currentController = null;
    }
  }

  /**
   * Clean up any pending requests (call this when shutting down)
   */
  cleanup(): void {
    this.cancelCurrentRequest();
    console.log('🧹 OpenAI client cleaned up');
  }

  /**
   * Send a chat completion request to OpenAI-compatible API with custom timeout
   */
  private async chatWithTimeout(
    messages: OpenAIMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    },
    timeoutMs?: number
  ): Promise<string> {
    const originalTimeout = this.config.timeout;
    if (timeoutMs) {
      this.config.timeout = timeoutMs;
    }
    
    try {
      return await this.chat(messages, options);
    } finally {
      this.config.timeout = originalTimeout;
    }
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

      // Cancel any previous request before starting a new one
      this.cancelCurrentRequest();

      // Create new controller for this request
      this.currentController = new AbortController();
      const timeoutId = setTimeout(() => {
        if (this.currentController) {
          this.currentController.abort();
        }
      }, this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: this.currentController.signal
      });

      clearTimeout(timeoutId);
      
      // Clear the current controller on successful completion
      this.currentController = null;

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

    } catch (error: unknown) {
      // Clear the current controller on error
      this.currentController = null;
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request cancelled or timeout after ${this.config.timeout}ms`);
      }
      
      console.error('❌ OpenAI-compatible client error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`OpenAI-compatible API failed: ${errorMessage}`);
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
   * Analyze an image with a text prompt (vision models)
   * @param imageUrl - URL of the image to analyze (can be http(s):// or data: URI)
   * @param prompt - Question or instruction about the image
   * @param options - Optional temperature and max tokens
   */
  async analyzeImage(
    imageUrl: string,
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      detail?: 'low' | 'high' | 'auto';
    }
  ): Promise<string> {
    console.log('🖼️ OpenAI-compatible image analysis request:', {
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      imageUrl: imageUrl.substring(0, 100) + '...',
      promptLength: prompt.length,
      imageSize: Math.round(imageUrl.length / 1024) + 'KB'
    });
    
    // Debug: save first 200 chars to see if image data is valid
    console.log('🔍 Image data preview:', imageUrl.substring(0, 200));

    const messages: OpenAIMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: options?.detail || 'auto'
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ];

    // Vision models need longer timeout (5 minutes instead of 2)
    return this.chatWithTimeout(messages, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    }, 300000); // 5 minutes for vision models
  }

  /**
   * Analyze an image with system message and user prompt (vision models)
   * @param imageUrl - URL of the image to analyze (can be http(s):// or data: URI)
   * @param userPrompt - User's question or instruction about the image
   * @param systemMessage - System message to provide context
   * @param options - Optional temperature and max tokens
   */
  async analyzeImageWithSystem(
    imageUrl: string,
    userPrompt: string,
    systemMessage: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      detail?: 'low' | 'high' | 'auto';
    }
  ): Promise<string> {
    console.log('🖼️ OpenAI-compatible image analysis with system message:', {
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      imageUrl: imageUrl.substring(0, 100) + '...',
      userPromptLength: userPrompt.length,
      systemMessageLength: systemMessage.length,
      imageSize: Math.round(imageUrl.length / 1024) + 'KB'
    });

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: systemMessage
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: options?.detail || 'auto'
            }
          },
          {
            type: 'text',
            text: userPrompt
          }
        ]
      }
    ];

    // Vision models need longer timeout (5 minutes instead of 2)
    return this.chatWithTimeout(messages, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    }, 300000); // 5 minutes for vision models
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
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
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
