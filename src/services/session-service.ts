// Session Service for Dude Chrome Extension
// Manages session lifecycle and state

import { createSession, createAIResult, SessionStatus, AIProvider } from '../types/core';
import type { Session, TabData, AIResult } from '../types/core';
import { storageService } from './storage-service';
import { ErrorHandler } from '../utils/error-handler';

export class SessionService {
  private static instance: SessionService;
  private currentSession: Session | null = null;

  private constructor() {}

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  // Session lifecycle
  async startSession(tabData: TabData): Promise<Session> {
    // Close previous session if exists
    if (this.currentSession) {
      await this.closeSession('abandoned');
    }

    this.currentSession = createSession(tabData);
    await storageService.saveCurrentSession(this.currentSession);
    return this.currentSession;
  }

  async closeSession(status: SessionStatus = 'completed'): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.timestamp = Date.now(); // Update end time
    
    if (status === 'completed' || status === 'auto-saved') {
      await storageService.saveSessionToHistory(this.currentSession!);
    }

    await storageService.clearCurrentSession();
    this.currentSession = null;
  }

  async switchTab(newTabData: TabData): Promise<Session> {
    // Check if we're actually switching to a different tab
    if (this.currentSession && this.currentSession.tabData.url === newTabData.url) {
      // Same tab, no need to switch
      return this.currentSession;
    }

    // Auto-save current session if it has results
    if (this.currentSession && this.currentSession.results.length > 0) {
      await this.closeSession('auto-saved');
    }

    // Start new session for new tab
    return await this.startSession(newTabData);
  }

  // Result management
  addResult(ai: AIProvider, type: AIResult['type'], result: string, originalText: string, userPrompt?: string): void {
    if (!this.currentSession) {
      ErrorHandler.logError(new Error('No active session'), 'SessionService.addResult');
      return;
    }

    const aiResult = createAIResult(ai, type, result, originalText, userPrompt);
    this.currentSession.results.push(aiResult);
    
    // Auto-save current session
    storageService.saveCurrentSession(this.currentSession);
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  async getCurrentSessionResults(): Promise<AIResult[]> {
    if (this.currentSession) {
      return this.currentSession.results;
    }

    // Try to load from storage
    const session = await storageService.getCurrentSession();
    return session?.results || [];
  }

  // Session restoration
  async restoreSession(sessionId: string): Promise<Session | null> {
    const session = await storageService.getSessionFromHistory(sessionId);
    if (session) {
      this.currentSession = session;
      await storageService.saveCurrentSession(session);
    }
    return session;
  }
}

export const sessionService = SessionService.getInstance();
