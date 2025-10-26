/**
 * Minimal error handler used by core adapters
 * Keeps logging centralized and avoids missing import errors
 */
export class ErrorHandler {
    static logError(error: unknown, context?: string): void {
        // Keep this minimal - centralized place to extend later (reporting, telemetry)
        if (context) {
            console.error(`Dude Error [${context}]`, error);
        } else {
            console.error('Dude Error', error);
        }
    }
}

export default ErrorHandler;
