// Text Chunker for Dude Chrome Extension
// Implements recursive character-based text splitting with overlap

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
  minChunkSize?: number;
  maxChunks?: number;
}

export interface ChunkInfo {
  chunks: string[];
  chunkCount: number;
  totalTokens?: number;
}

export class TextChunker {
  private static readonly DEFAULT_CHUNK_SIZE = 20000; // Increased from 4000 to 20000
  private static readonly DEFAULT_OVERLAP = 1000; // Increased from 200 to 1000
  private static readonly MIN_CHUNK_SIZE = 1000; // Increased from 500 to 1000
  private static readonly DEFAULT_MAX_CHUNKS = 50; // New parameter to limit chunks

  /**
   * Split text into chunks using recursive character-based approach
   * @param text The text to split
   * @param options Chunking configuration options
   * @returns Array of text chunks
   */
  static splitIntoChunks(text: string, options: Partial<ChunkingOptions> = {}): string[] {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      chunkOverlap = this.DEFAULT_OVERLAP,
      minChunkSize = this.MIN_CHUNK_SIZE,
      maxChunks = this.DEFAULT_MAX_CHUNKS
    } = options;

    if (!text || text.length <= minChunkSize) {
      return [text];
    }

    // Calculate estimated chunks and adjust if needed
    const estimatedChunks = Math.ceil(text.length / (chunkSize - chunkOverlap));
    if (estimatedChunks > maxChunks) {
      // Increase chunk size to stay within limit
      const adjustedChunkSize = Math.ceil(text.length / maxChunks) + chunkOverlap;
      console.log(`Adjusting chunk size from ${chunkSize} to ${adjustedChunkSize} to limit chunks to ${maxChunks}`);
      return this.splitIntoChunks(text, { ...options, chunkSize: adjustedChunkSize });
    }

    const chunks: string[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      // Calculate end index for this chunk
      let endIndex = Math.min(currentIndex + chunkSize, text.length);
      
      // Try to find natural break points (paragraphs, then sentences)
      if (endIndex < text.length) {
        endIndex = this.findBestBreakPoint(text, currentIndex, endIndex, chunkOverlap);
      }

      const chunk = text.substring(currentIndex, endIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Move to next chunk, accounting for overlap
      currentIndex = Math.max(currentIndex + 1, endIndex - chunkOverlap);
    }

    return chunks;
  }

  /**
   * Get estimated chunk count for a given text
   * @param text The text to analyze
   * @param options Chunking configuration options
   * @returns Estimated number of chunks
   */
  static getChunkCount(text: string, options: Partial<ChunkingOptions> = {}): number {
    const { chunkSize = this.DEFAULT_CHUNK_SIZE } = options;
    
    if (!text || text.length <= this.MIN_CHUNK_SIZE) {
      return 1;
    }

    return Math.ceil((text.length - this.DEFAULT_OVERLAP) / (chunkSize - this.DEFAULT_OVERLAP));
  }

  /**
   * Find the best break point for a chunk
   * Prioritizes: paragraphs > sentences > words > characters
   */
  private static findBestBreakPoint(
    text: string, 
    startIndex: number, 
    endIndex: number, 
    overlap: number
  ): number {
    const chunkText = text.substring(startIndex, endIndex);
    overlap = Math.min(overlap, endIndex - startIndex - this.MIN_CHUNK_SIZE);
    
    // Try paragraph breaks first
    const paragraphBreak = this.findLastParagraphBreak(chunkText);
    if (paragraphBreak > 0 && paragraphBreak >= this.MIN_CHUNK_SIZE) {
      return startIndex + paragraphBreak;
    }

    // Try sentence breaks
    const sentenceBreak = this.findLastSentenceBreak(chunkText);
    if (sentenceBreak > 0 && sentenceBreak >= this.MIN_CHUNK_SIZE) {
      return startIndex + sentenceBreak;
    }

    // Try word breaks
    const wordBreak = this.findLastWordBreak(chunkText);
    if (wordBreak > 0 && wordBreak >= this.MIN_CHUNK_SIZE) {
      return startIndex + wordBreak;
    }

    // Fallback to exact end index
    return endIndex;
  }

  /**
   * Find the last paragraph break in text
   */
  private static findLastParagraphBreak(text: string): number {
    const patterns = ['\n\n\n', '\n\n'];
    
    for (const pattern of patterns) {
      const index = text.lastIndexOf(pattern);
      if (index > 0) {
        return index + pattern.length;
      }
    }
    
    return -1;
  }

  /**
   * Find the last sentence break in text
   */
  private static findLastSentenceBreak(text: string): number {
    const patterns = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
    
    let bestIndex = -1;
    for (const pattern of patterns) {
      const index = text.lastIndexOf(pattern);
      if (index > bestIndex && index > 0) {
        bestIndex = index + pattern.length;
      }
    }
    
    return bestIndex;
  }

  /**
   * Find the last word break in text
   */
  private static findLastWordBreak(text: string): number {
    const index = text.lastIndexOf(' ');
    return index > 0 ? index : -1;
  }

  /**
   * Add context to a chunk from previous chunk
   * @param chunk Current chunk
   * @param previousChunk Previous chunk for context
   * @param contextSize Amount of context to add
   * @returns Chunk with added context
   */
  static addContextToChunk(
    chunk: string, 
    previousChunk?: string, 
    contextSize: number = this.DEFAULT_OVERLAP
  ): string {
    if (!previousChunk || previousChunk.length <= contextSize) {
      return chunk;
    }

    const context = previousChunk.slice(-contextSize).trim();
    return `[Previous context: ${context}]\n\n${chunk}`;
  }

  /**
   * Measure token usage for a given text using summarizer
   * @param text Text to measure
   * @param summarizer Summarizer instance with measureInputUsage method
   * @returns Promise resolving to token count
   */
  static async measureTokens(text: string, summarizer: any): Promise<number> {
    if (!summarizer || typeof summarizer.measureInputUsage !== 'function') {
      // Improved fallback estimation: roughly 3.5 characters per token for better accuracy
      return Math.ceil(text.length / 3.5);
    }

    try {
      const result = await summarizer.measureInputUsage(text);
      return result || Math.ceil(text.length / 3.5);
    } catch (error) {
      console.warn('Token measurement failed, using fallback estimation:', error);
      return Math.ceil(text.length / 3.5);
    }
  }

  /**
   * Create chunks with dynamic sizing based on token quota
   * @param text Text to chunk
   * @param summarizer Summarizer instance
   * @param options Chunking options
   * @returns Promise resolving to chunk information
   */
  static async createDynamicChunks(
    text: string,
    summarizer: any,
    options: Partial<ChunkingOptions> = {}
  ): Promise<ChunkInfo> {
    const {
      chunkOverlap = this.DEFAULT_OVERLAP,
      minChunkSize = this.MIN_CHUNK_SIZE,
      maxChunks = this.DEFAULT_MAX_CHUNKS
    } = options;

    // Get dynamic chunk size from summarizer quota
    let chunkSize = this.DEFAULT_CHUNK_SIZE;
    if (summarizer && summarizer.inputQuota) {
      // Use 80% of quota to leave room for overlap and context
      chunkSize = Math.floor(summarizer.inputQuota * 0.8);
      chunkSize = Math.max(chunkSize, minChunkSize);
    }

    // Ensure we don't create too many chunks
    const estimatedChunks = Math.ceil(text.length / (chunkSize - chunkOverlap));
    if (estimatedChunks > maxChunks) {
      chunkSize = Math.ceil(text.length / maxChunks) + chunkOverlap;
      console.log(`Adjusted chunk size to ${chunkSize} to limit chunks to ${maxChunks}`);
    }

    const chunks = this.splitIntoChunks(text, { chunkSize, chunkOverlap, minChunkSize, maxChunks });
    
    // Measure total tokens if possible
    let totalTokens;
    if (summarizer && typeof summarizer.measureInputUsage === 'function') {
      try {
        totalTokens = await summarizer.measureInputUsage(text);
      } catch (error) {
        console.warn('Failed to measure total tokens:', error);
      }
    }

    return {
      chunks,
      chunkCount: chunks.length,
      totalTokens
    };
  }
}