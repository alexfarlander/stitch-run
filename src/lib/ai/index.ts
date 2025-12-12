/**
 * AI Module - LLM Client and AI Manager
 */

export { LLMError, ClaudeLLMClient, createLLMClient } from './llm-client';
export type { LLMClient, ClaudeLLMClientConfig } from './llm-client';

export {
  stripNodeUIProperties,
  stripEdgeUIProperties,
  stripCanvasUIProperties,
  loadWorkerDefinitions,
  buildAIManagerContext,
  formatContextAsJSON,
} from './context-builder';
export type { StrippedNode, StrippedEdge, StrippedCanvas, AIManagerContext } from './context-builder';

export { buildAIManagerPrompt, buildSimplePrompt } from './prompt-template';
export type { AIManagerAction, PromptTemplateConfig } from './prompt-template';

export {
  ActionExecutorError,
  parseLLMResponse,
  isValidAction,
  validateResponse,
  validateCreateWorkflowPayload,
  validateModifyWorkflowPayload,
  validateRunWorkflowPayload,
  validateGetStatusPayload,
  validatePayload,
  parseAndValidateResponse,
  executeAction,
} from './action-executor';
export type {
  AIManagerResponse,
  CreateWorkflowPayload,
  ModifyWorkflowPayload,
  RunWorkflowPayload,
  GetStatusPayload,
} from './action-executor';
