/**
 * Demo State Management
 * 
 * Server-side state for managing the continuous demo loop.
 * Uses a simple in-memory store since demo state doesn't need persistence.
 */

// Demo session state
interface DemoSession {
  isRunning: boolean;
  sessionId: string | null;
  loopCount: number;
  startedAt: Date | null;
  timeoutIds: NodeJS.Timeout[];
}

// Global demo state (server-side only)
const demoSession: DemoSession = {
  isRunning: false,
  sessionId: null,
  loopCount: 0,
  startedAt: null,
  timeoutIds: [],
};

/**
 * Start the demo session
 * Returns a unique session ID to track this run
 */
export function startDemoSession(): string {
  const sessionId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  demoSession.isRunning = true;
  demoSession.sessionId = sessionId;
  demoSession.loopCount = 0;
  demoSession.startedAt = new Date();
  demoSession.timeoutIds = [];
  return sessionId;
}

/**
 * Check if a session ID is still valid (matches current running session)
 */
export function isSessionValid(sessionId: string): boolean {
  return demoSession.isRunning && demoSession.sessionId === sessionId;
}

/**
 * Stop the demo session and clear all scheduled events
 */
export function stopDemoSession(): void {
  // Clear all scheduled timeouts
  for (const timeoutId of demoSession.timeoutIds) {
    clearTimeout(timeoutId);
  }
  
  demoSession.isRunning = false;
  demoSession.sessionId = null; // Invalidate session so stale callbacks won't fire
  demoSession.loopCount = 0;
  demoSession.startedAt = null;
  demoSession.timeoutIds = [];
}

/**
 * Check if demo is currently running
 */
export function isDemoRunning(): boolean {
  return demoSession.isRunning;
}

/**
 * Register a timeout ID for cleanup
 */
export function registerTimeout(timeoutId: NodeJS.Timeout): void {
  demoSession.timeoutIds.push(timeoutId);
}

/**
 * Increment loop count
 */
export function incrementLoopCount(): number {
  demoSession.loopCount++;
  return demoSession.loopCount;
}

/**
 * Get current loop count
 */
export function getLoopCount(): number {
  return demoSession.loopCount;
}

/**
 * Get demo session info
 */
export function getDemoSessionInfo(): {
  isRunning: boolean;
  loopCount: number;
  startedAt: Date | null;
  runningFor: number | null;
} {
  return {
    isRunning: demoSession.isRunning,
    loopCount: demoSession.loopCount,
    startedAt: demoSession.startedAt,
    runningFor: demoSession.startedAt 
      ? Date.now() - demoSession.startedAt.getTime() 
      : null,
  };
}
