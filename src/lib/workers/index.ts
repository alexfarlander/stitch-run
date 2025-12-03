/**
 * Worker module exports
 * Central export point for all worker-related functionality
 */

export type { IWorker } from './base';
export type { IWorkerRegistry } from './registry';
export { WorkerRegistry, workerRegistry } from './registry';
export { buildCallbackUrl, triggerCallback, sanitizeForLogging, logWorker } from './utils';
export { ClaudeWorker } from './claude';
export { MiniMaxWorker } from './minimax';
export { ElevenLabsWorker } from './elevenlabs';
export { ShotstackWorker } from './shotstack';
export { SceneParserWorker } from './scene-parser';
export { WireframeGeneratorWorker } from './wireframe-generator';
export { ImageToVideoWorker } from './image-to-video';
export { MediaLibraryWorker } from './media-library';

// Register all workers in the global registry
// Validates: Requirement 6.1
import { ClaudeWorker } from './claude';
import { MiniMaxWorker } from './minimax';
import { ElevenLabsWorker } from './elevenlabs';
import { ShotstackWorker } from './shotstack';
import { SceneParserWorker } from './scene-parser';
import { WireframeGeneratorWorker } from './wireframe-generator';
import { ImageToVideoWorker } from './image-to-video';
import { MediaLibraryWorker } from './media-library';
import { workerRegistry } from './registry';

// Register Claude worker as "claude"
workerRegistry.register('claude', ClaudeWorker);

// Register MiniMax worker as "minimax"
workerRegistry.register('minimax', MiniMaxWorker);

// Register ElevenLabs worker as "elevenlabs"
workerRegistry.register('elevenlabs', ElevenLabsWorker);

// Register Shotstack worker as "shotstack"
workerRegistry.register('shotstack', ShotstackWorker);

// Register Scene Parser worker as "scene-parser"
workerRegistry.register('scene-parser', SceneParserWorker);

// Register Wireframe Generator worker as "wireframe-generator"
workerRegistry.register('wireframe-generator', WireframeGeneratorWorker);

// Register Image-to-Video worker as "image-to-video"
workerRegistry.register('image-to-video', ImageToVideoWorker);

// Register Media Library worker as "media-library"
workerRegistry.register('media-library', MediaLibraryWorker);
