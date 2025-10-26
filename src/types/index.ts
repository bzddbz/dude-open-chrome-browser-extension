// Core type definitions for Dude Chrome Extension
// @since 1.0.0

import { UserPreferences } from './core';

// Re-export from core types for backward compatibility
export { CONFIG, createSession, createAIResult } from './core';

// Core operation types
export enum TextOperationType {
  SUMMARIZE = 'summarize',
  REWRITE = 'rewrite', 
  VALIDATE = 'validate',
  TRANSLATE = 'translate',
  CUSTOM_PROMPT = 'custom-prompt'
}

// Enhanced operation result with custom prompt support
export interface TextOperationResult {
  originalText: string;
  processedText: string;
  operationType: TextOperationType;
  provider: string;
  timestamp: number;
  userPrompt?: string;
  metadata?: {
    model?: string;
    confidence?: number;
    processingTime?: number;
  };
}

// Storage entities with session support
export interface StoredResult {
  id: string;
  tabId: number;
  result: TextOperationResult;
  sessionId: string;
}

// Application state with custom prompts
export interface ExtensionState {
  activeTabId: number;
  selectedText?: string;
  results: StoredResult[];
  currentSession?: Session;
  customPrompts: Array<{
    prompt: string;
    response: string;
    timestamp: number;
  }>;
}

// Session management with enhanced status
export interface Session {
  id: string;
  tabData: TabData;
  results: TextOperationResult[];
  timestamp: number;
  status: SessionStatus;
  userSettings: UserPreferences;
  clipData?: string;
}

// Session status enum
export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  AUTO_SAVED = 'auto-saved',
  ABANDONED = 'abandoned'
}

// Tab data for session management
export interface TabData {
  id: string;
  url: string;
  title: string;
}

// Selection data with timestamp
export interface SelectionData {
  text: string;
  url: string;
  title: string;
  timestamp?: number;
}

// AI model availability with more granular status
export interface AIModelAvailability {
  summarizer: 'available' | 'readily' | 'after-download' | 'no';
  translator: 'available' | 'readily' | 'after-download' | 'no';
  writer: 'available' | 'readily' | 'after-download' | 'no';
  prompt: 'available' | 'readily' | 'after-download' | 'no';
  languageDetection: 'available' | 'readily' | 'after-download' | 'no';
}

// Voice operation types
export interface VoiceOperation {
  type: 'input' | 'output';
  isActive: boolean;
  confidence?: number;
  transcript?: string;
}

// Export options with enhanced formats
export interface ExportOptions {
  format: 'json' | 'markdown' | 'csv';
  includeMetadata: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}
