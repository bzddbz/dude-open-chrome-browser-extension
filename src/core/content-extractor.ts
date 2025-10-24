// Content Extractor for Dude Chrome Extension
// Handles extracting full page content for web clipping

import { TextChunker } from '../utils/text-chunker';

export interface PageContent {
  html: string;
  title: string;
  url: string;
  author?: string;
  description?: string;
  published?: string;
  wordCount: number;
}

export interface ChunkedContent extends PageContent {
  chunks?: string[];
  chunkCount?: number;
  totalTokens?: number;
}

export class ContentExtractor {
  private static instance: ContentExtractor;

  private constructor() {}

  static getInstance(): ContentExtractor {
    if (!ContentExtractor.instance) {
      ContentExtractor.instance = new ContentExtractor();
    }
    return ContentExtractor.instance;
  }

  /**
   * Extract full page content from the current page
   */
  extractFullPageContent(): PageContent {
    const html = document.documentElement.outerHTML;
    const title = document.title || 'Untitled Page';
    const url = window.location.href;
    
    // Extract meta information
    const author = this.extractMetaContent('author') || 
                   this.extractMetaContent('article:author') ||
                   this.extractMetaContent('citation_author');
    
    const description = this.extractMetaContent('description') ||
                       this.extractMetaContent('og:description') ||
                       this.extractMetaContent('twitter:description');
    
    const published = this.extractMetaContent('article:published_time') ||
                     this.extractMetaContent('datePublished') ||
                     this.extractMetaContent('citation_date');

    // Calculate word count from text content
    const textContent = document.body?.innerText || '';
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

    return {
      html,
      title,
      url,
      author,
      description,
      published,
      wordCount
    };
  }

  /**
   * Extract meta content by name or property
   */
  private extractMetaContent(name: string): string | undefined {
    // Try meta name
    const metaName = document.querySelector(`meta[name="${name}"]`);
    if (metaName) {
      return metaName.getAttribute('content') || undefined;
    }

    // Try meta property
    const metaProperty = document.querySelector(`meta[property="${name}"]`);
    if (metaProperty) {
      return metaProperty.getAttribute('content') || undefined;
    }

    // Try meta attribute (only for specific attributes like author)
    if (name === 'author') {
      const metaAttribute = document.querySelector('meta[author]');
      if (metaAttribute) {
        return metaAttribute.getAttribute('content') || undefined;
      }
    }

    return undefined;
  }

  /**
   * Clean HTML content by removing unwanted elements
   */
  cleanHTML(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer',
      '.navigation', '.menu', '.sidebar', '.ads',
      '.advertisement', '.social-media', '.comments',
      'button', 'input[type="button"]', 'input[type="submit"]'
    ];

    unwantedSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // Serialize back to HTML
    return doc.documentElement.outerHTML;
  }

  /**
   * Extract main content from cleaned HTML
   */
  extractMainContent(cleanedHtml: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanedHtml, 'text/html');

    // Try to find main content area
    const mainSelectors = [
      'main', 'article', '[role="main"]',
      '.content', '.main-content', '.article-content',
      '.post-content', '.entry-content'
    ];

    for (const selector of mainSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        return element.innerHTML;
      }
    }

    // Fallback to body content
    return doc.body?.innerHTML || cleanedHtml;
  }

  /**
   * Get content length after cleaning
   */
  getContentLength(html: string): number {
    const cleanedContent = this.cleanHTML(html);
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanedContent, 'text/html');
    return doc.body?.innerText?.length || 0;
  }

  /**
   * Check if content should use chunking based on summarizer quota
   */
  async shouldUseChunking(html: string, summarizer?: any): Promise<boolean> {
    const contentLength = this.getContentLength(html);
    
    if (!summarizer || !summarizer.inputQuota) {
      // Fallback to character-based check with increased threshold
      return contentLength > 20000; // Increased from 4000
    }

    try {
      const tokenCount = await TextChunker.measureTokens(
        this.extractMainContent(this.cleanHTML(html)),
        summarizer
      );
      return tokenCount > summarizer.inputQuota;
    } catch (error) {
      console.warn('Failed to measure tokens, falling back to character count:', error);
      return contentLength > 20000; // Increased from 4000
    }
  }

  /**
   * Create content chunks using dynamic sizing
   */
  async createContentChunks(html: string, summarizer?: any): Promise<ChunkedContent> {
    const cleanedContent = this.cleanHTML(html);
    const mainContent = this.extractMainContent(cleanedContent);
    
    const chunkInfo = await TextChunker.createDynamicChunks(mainContent, summarizer, {
      chunkOverlap: 1000, // Increased from 200
      minChunkSize: 1000, // Increased from 500
      maxChunks: 50 // New parameter to limit chunks
    });

    return {
      html,
      title: document.title || 'Untitled Page',
      url: window.location.href,
      author: this.extractMetaContent('author') ||
             this.extractMetaContent('article:author') ||
             this.extractMetaContent('citation_author'),
      description: this.extractMetaContent('description') ||
                   this.extractMetaContent('og:description') ||
                   this.extractMetaContent('twitter:description'),
      published: this.extractMetaContent('article:published_time') ||
                 this.extractMetaContent('datePublished') ||
                 this.extractMetaContent('citation_date'),
      wordCount: this.extractWordCount(html),
      chunks: chunkInfo.chunks,
      chunkCount: chunkInfo.chunkCount,
      totalTokens: chunkInfo.totalTokens
    };
  }

  /**
   * Extract and clean content in one step
   */
  async extractAndCleanContent(): Promise<string> {
    const html = document.documentElement.outerHTML;
    const cleanedContent = this.cleanHTML(html);
    const mainContent = this.extractMainContent(cleanedContent);
    return mainContent;
  }

  /**
   * Extract word count from HTML
   */
  private extractWordCount(html: string): number {
    const cleanedContent = this.cleanHTML(html);
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanedContent, 'text/html');
    const textContent = doc.body?.innerText || '';
    return textContent.split(/\s+/).filter(word => word.length > 0).length;
  }
}

export const contentExtractor = ContentExtractor.getInstance();
