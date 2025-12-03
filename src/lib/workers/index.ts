/**
 * Worker module exports
 * Central export point for all worker-related functionality
 */

export { IWorker } from './base';
export { IWorkerRegistry, WorkerRegistry, workerRegistry } from './registry';
export { buildCallbackUrl, triggerCallback, sanitizeForLogging, logWorker } from './utils';
export { ClaudeWorker } from './claude';
export { MiniMaxWorker } from './minimax';
export { ElevenLabsWorker } from './elevenlabs';
export { ShotstackWorker } from './shotstack';

// Register all workers in the global registry
// Validates: Requirement 6.1
import { ClaudeWorker } from './claude';
import { MiniMaxWorker } from './minimax';
import { ElevenLabsWorker } from './elevenlabs';
import { ShotstackWorker } from './shotstack';
import { workerRegistry } from './registry';

// Register Claude worker as "claude"
workerRegistry.register('claude', ClaudeWorker);

// Register MiniMax worker as "minimax"
workerRegistry.register('minimax', MiniMaxWorker);

// Register ElevenLabs worker as "elevenlabs"
workerRegistry.register('elevenlabs', ElevenLabsWorker);

// Register Shotstack worker as "shotstack"
workerRegistry.register('shotstack', ShotstackWorker);
