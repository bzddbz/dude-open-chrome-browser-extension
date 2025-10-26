/**
 * Session management service
 * Handles session creation, storage, and retrieval
 * @since 1.0.0
 */

import { Utils } from '../utils/helpers';
import { CONFIG } from '../utils/constants';
import { Session, SessionStatus, TabData, TextOperationResult } from '../types/index';

export class SessionService {
    private static instance: SessionService;
    private currentSession: Session | null = null;
    private sessions: Map<string, Session> = new Map();

    private constructor() {}

    /**
     * Get singleton instance
     */
    public static getInstance(): SessionService {
        if (!SessionService.instance) {
            SessionService.instance = new SessionService();
        }
        return SessionService.instance;
    }

    /**
     * Create new session for tab
     */
    public createSession(tabData: TabData): Session {
        const sessionId = Utils.generateId('session');
        const session: Session = {
            id: sessionId,
            tabData,
            results: [],
            timestamp: Date.now(),
            status: SessionStatus.ACTIVE,
            userSettings: {
                // Default settings - will be loaded from storage
                translation: {
                    targetLanguage: 'hu',
                    sourceLanguage: 'en',
                    autoDetect: true,
                    autoTranslateResponse: false
                },
                summarization: {
                    length: 'medium',
                    type: 'key-points',
                    format: 'markdown'
                },
                validation: {
                    strictness: 'medium',
                    checkSources: true,
                    factCheckLevel: 'standard'
                },
                rewrite: {
                    style: 'neutral',
                    tone: 'professional',
                    complexity: 'intermediate'
                },
                storage: {
                    historyLimit: CONFIG.STORAGE.MAX_HISTORY_ITEMS,
                    autoSave: true,
                    autoSaveOnSelectionChange: false,
                    exportFormat: CONFIG.STORAGE.DEFAULT_EXPORT_FORMAT
                },
                general: {
                    theme: 'dark',
                    animations: true,
                    notifications: true
                },
                gemini: {
                    apiKey: '',
                    selectedModel: 'gemini-2.0-flash-lite',
                    cloudFirst: false
                }
            }
        };

        this.currentSession = session;
        this.sessions.set(sessionId, session);
        
        Utils.emit('session-created', { session });
        return session;
    }

    /**
     * Get current active session
     */
    public getCurrentSession(): Session | null {
        return this.currentSession;
    }

    /**
     * Get session by ID
     */
    public getSession(sessionId: string): Session | null {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Add result to current session
     */
    public addResult(result: TextOperationResult): void {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        this.currentSession.results.push(result);
        this.currentSession.timestamp = Date.now();
        
        Utils.emit('result-added', { session: this.currentSession, result });
    }

    /**
     * Update session status
     */
    public updateSessionStatus(status: SessionStatus): void {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        this.currentSession.status = status;
        Utils.emit('session-status-updated', { session: this.currentSession, status });
    }

    /**
     * Save session to storage
     */
    public async saveSession(sessionId?: string): Promise<void> {
        const session = sessionId ? this.getSession(sessionId) : this.currentSession;
        if (!session) {
            throw new Error('No session to save');
        }

        try {
            const storageKey = `${CONFIG.STORAGE.SESSION_PREFIX}${session.id}`;
            await chrome.storage.local.set({ [storageKey]: session });
            
            Utils.emit('session-saved', { session });
        } catch (error) {
            Utils.handleError(error);
            throw new Error(`Failed to save session: ${error}`);
        }
    }

    /**
     * Load session from storage
     */
    public async loadSession(sessionId: string): Promise<Session | null> {
        try {
            const storageKey = `${CONFIG.STORAGE.SESSION_PREFIX}${sessionId}`;
            const result = await chrome.storage.local.get(storageKey);
            const sessionData = result[storageKey];

            if (!sessionData) {
                return null;
            }

            const session = sessionData as Session;
            this.sessions.set(sessionId, session);
            
            Utils.emit('session-loaded', { session });
            return session;
        } catch (error) {
            Utils.handleError(error);
            return null;
        }
    }

    /**
     * Get all sessions from storage
     */
    public async getAllSessions(): Promise<Session[]> {
        try {
            const storage = await chrome.storage.local.get();
            const sessions: Session[] = [];

            for (const [key, value] of Object.entries(storage)) {
                if (key.startsWith(CONFIG.STORAGE.SESSION_PREFIX)) {
                    sessions.push(value as Session);
                }
            }

            return sessions.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            Utils.handleError(error);
            return [];
        }
    }

    /**
     * Delete session
     */
    public async deleteSession(sessionId: string): Promise<void> {
        try {
            const storageKey = `${CONFIG.STORAGE.SESSION_PREFIX}${sessionId}`;
            await chrome.storage.local.remove(storageKey);
            
            this.sessions.delete(sessionId);
            
            if (this.currentSession?.id === sessionId) {
                this.currentSession = null;
            }

            Utils.emit('session-deleted', { sessionId });
        } catch (error) {
            Utils.handleError(error);
            throw new Error(`Failed to delete session: ${error}`);
        }
    }

    /**
     * Clear all sessions
     */
    public async clearAllSessions(): Promise<void> {
        try {
            const storage = await chrome.storage.local.get();
            const keysToRemove: string[] = [];

            for (const key of Object.keys(storage)) {
                if (key.startsWith(CONFIG.STORAGE.SESSION_PREFIX)) {
                    keysToRemove.push(key);
                }
            }

            await chrome.storage.local.remove(keysToRemove);
            
            this.sessions.clear();
            this.currentSession = null;

            Utils.emit('all-sessions-cleared', {});
        } catch (error) {
            Utils.handleError(error);
            throw new Error(`Failed to clear sessions: ${error}`);
        }
    }

    /**
     * Auto-save current session
     */
    public async autoSave(): Promise<void> {
        if (this.currentSession && this.currentSession.userSettings.storage.autoSave) {
            await this.saveSession();
        }
    }

    /**
     * Export sessions
     */
    public async exportSessions(format: 'json' | 'markdown' = 'json'): Promise<string> {
        const sessions = await this.getAllSessions();
        
        if (format === 'json') {
            return JSON.stringify(sessions, null, 2);
        } else if (format === 'markdown') {
            return this.sessionsToMarkdown(sessions);
        }
        
        throw new Error(`Unsupported export format: ${format}`);
    }

    
    /**
     * Export sessions
     */
    public async exportCurrentSection(format: 'json' | 'markdown' = 'json', sessionId: string): Promise<string> {
        const sessions = await this.getAllSessions();
        const actualSession = this.sessions.get(sessionId);
        if (format === 'json') {
            return JSON.stringify(actualSession, null, 2);
        } else if (format === 'markdown') {
            return this.sessionsToMarkdown(actualSession!);
        }
        
        throw new Error(`Unsupported export format: ${format}`);
    }

    /**
     * Convert sessions to markdown format
     */
    private sessionsToMarkdown(sessions: Session[] | Session): string {
        let markdown = '# Dude Extension Sessions\n\n';
        const sessionsGroup: Session[] = [];
        sessionsGroup.push(sessions as Session);
        
        for (const session of sessionsGroup) {
            markdown += `## ${session.tabData.title}\n\n`;
            markdown += `**URL:** ${session.tabData.url}\n`;
            markdown += `**Date:** ${Utils.formatTimestamp(session.timestamp)}\n`;
            markdown += `**Status:** ${session.status}\n\n`;
            
            if (session.results.length > 0) {
                markdown += '### Results\n\n';
                for (const result of session.results) {
                    markdown += `#### ${result.operationType.toUpperCase()}\n\n`;
                    markdown += `**Provider:** ${result.provider}\n`;
                    markdown += `**Timestamp:** ${Utils.formatTimestamp(result.timestamp)}\n\n`;
                    markdown += `**Original Text:**\n${result.originalText}\n\n`;
                    markdown += `**Processed Text:**\n${result.processedText}\n\n`;
                    
                    if (result.userPrompt) {
                        markdown += `**User Prompt:** ${result.userPrompt}\n\n`;
                    }
                    markdown += '---\n\n';
                }
            }
            
            markdown += '\n\n';
        }
        
        return markdown;
    }

    /**
     * Cleanup old sessions
     */
    public async cleanupOldSessions(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
        const sessions = await this.getAllSessions();
        const now = Date.now();
        const sessionsToDelete: string[] = [];

        for (const session of sessions) {
            if (now - session.timestamp > maxAge) {
                sessionsToDelete.push(session.id);
            }
        }

        for (const sessionId of sessionsToDelete) {
            await this.deleteSession(sessionId);
        }

        Utils.emit('sessions-cleaned-up', { deletedCount: sessionsToDelete.length });
    }

    /**
     * Destroy service
     */
    public destroy(): void {
        this.currentSession = null;
        this.sessions.clear();
    }
}
