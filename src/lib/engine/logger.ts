/**
 * Execution Logging Utilities
 * Provides structured logging for workflow execution
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

/**
 * Log levels for execution logging
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Base log entry structure
 */
interface BaseLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  runId?: string;
  nodeId?: string;
  [key: string]: unknown;
}

/**
 * Format a log entry as JSON
 */
function formatLogEntry(entry: BaseLogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Log a structured message
 * Exported for use in edge-walker when specific helpers don't exist
 */
export function log(level: LogLevel, message: string, context: Record<string, unknown> = {}): void {
  const entry: BaseLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const formatted = formatLogEntry(entry);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'info':
    case 'debug':
    default:
      console.log(formatted);
      break;
  }
}

/**
 * Log when a node starts execution
 * Validates: Requirement 10.1
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param nodeType - The type of node (Worker, UX, Splitter, Collector)
 * @param input - The input data for the node
 */
export function logNodeExecution(
  runId: string,
  nodeId: string,
  nodeType: string,
  input?: unknown
): void {
  log('info', 'Node execution started', {
    runId,
    nodeId,
    nodeType,
    input: input ? JSON.stringify(input) : undefined,
  });
}

/**
 * Log when a worker is called
 * Validates: Requirement 10.2
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param workerType - The type of worker (claude, minimax, etc.) or 'webhook'
 * @param endpoint - The API endpoint or webhook URL
 * @param payload - The payload sent to the worker
 */
export function logWorkerCall(
  runId: string,
  nodeId: string,
  workerType: string,
  endpoint: string,
  payload: unknown
): void {
  log('info', 'Worker called', {
    runId,
    nodeId,
    workerType,
    endpoint,
    payload: JSON.stringify(payload),
  });
}

/**
 * Log when a callback is received
 * Validates: Requirement 10.3
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param status - The callback status (completed, failed)
 * @param output - The output data from the callback
 * @param error - Error message if status is failed
 */
export function logCallbackReceived(
  runId: string,
  nodeId: string,
  status: string,
  output?: any,
  error?: string
): void {
  log('info', 'Callback received', {
    runId,
    nodeId,
    status,
    output: output ? JSON.stringify(output) : undefined,
    error,
  });
}

/**
 * Log when edge-walking occurs
 * Validates: Requirement 10.4
 * 
 * @param runId - The run ID
 * @param completedNodeId - The node that just completed
 * @param downstreamNodeIds - Array of downstream node IDs that will be triggered
 */
export function logEdgeWalking(
  runId: string,
  completedNodeId: string,
  downstreamNodeIds: string[]
): void {
  log('info', 'Edge-walking triggered', {
    runId,
    completedNodeId,
    downstreamNodeIds,
    downstreamCount: downstreamNodeIds.length,
  });
}

/**
 * Log when an error occurs
 * Validates: Requirement 10.5
 * 
 * @param message - Error message
 * @param error - The error object
 * @param context - Additional context about the error
 */
export function logExecutionError(
  message: string,
  error: Error | unknown,
  context: Record<string, unknown> = {}
): void {
  const errorDetails: Record<string, unknown> = {
    message,
    ...context,
  };
  
  if (error instanceof Error) {
    errorDetails.errorMessage = error.message;
    errorDetails.errorName = error.name;
    errorDetails.stack = error.stack;
  } else {
    errorDetails.error = String(error);
  }
  
  log('error', message, errorDetails);
}

/**
 * Log node state transition
 * 
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param fromStatus - Previous status
 * @param toStatus - New status
 */
export function logNodeStateTransition(
  runId: string,
  nodeId: string,
  fromStatus: string | undefined,
  toStatus: string
): void {
  log('info', 'Node state transition', {
    runId,
    nodeId,
    fromStatus: fromStatus || 'none',
    toStatus,
  });
}

/**
 * Log parallel instance creation
 * 
 * @param runId - The run ID
 * @param splitterNodeId - The splitter node ID
 * @param parallelInstanceIds - Array of parallel instance IDs created
 */
export function logParallelInstanceCreation(
  runId: string,
  splitterNodeId: string,
  parallelInstanceIds: string[]
): void {
  log('info', 'Parallel instances created', {
    runId,
    splitterNodeId,
    parallelInstanceIds,
    instanceCount: parallelInstanceIds.length,
  });
}

/**
 * Log collector waiting state
 * 
 * @param runId - The run ID
 * @param collectorNodeId - The collector node ID
 * @param completedCount - Number of upstream paths completed
 * @param expectedCount - Total number of upstream paths expected
 */
export function logCollectorWaiting(
  runId: string,
  collectorNodeId: string,
  completedCount: number,
  expectedCount: number
): void {
  log('info', 'Collector waiting for upstream completion', {
    runId,
    collectorNodeId,
    completedCount,
    expectedCount,
    remaining: expectedCount - completedCount,
  });
}

/**
 * Log collector firing
 *
 * @param runId - The run ID
 * @param collectorNodeId - The collector node ID
 * @param mergedOutput - The merged output from all upstream paths
 */
export function logCollectorFiring(
  runId: string,
  collectorNodeId: string,
  mergedOutput: unknown
): void {
  log('info', 'Collector firing downstream', {
    runId,
    collectorNodeId,
    mergedOutput: JSON.stringify(mergedOutput),
  });
}

/**
 * Log parallel edge walking
 *
 * @param runId - The run ID
 * @param nodeId - The node ID where edges are being walked
 * @param journeyEdgeCount - Number of journey edges
 * @param systemEdgeCount - Number of system edges
 */
export function logParallelEdgeWalking(
  runId: string,
  nodeId: string,
  journeyEdgeCount: number,
  systemEdgeCount: number
): void {
  log('info', 'Parallel edge walking', {
    runId,
    nodeId,
    journeyEdgeCount,
    systemEdgeCount,
  });
}

/**
 * Log parallel edge walking results
 *
 * @param runId - The run ID
 * @param nodeId - The node ID
 * @param journeyResults - Results from journey edges
 * @param systemResults - Results from system edges
 */
export function logParallelEdgeResults(
  runId: string,
  nodeId: string,
  journeyResults: Array<{ success: boolean; edgeId?: string; error?: string }>,
  systemResults: Array<{ success: boolean; edgeId?: string; error?: string }>
): void {
  log('info', 'Parallel edge walking results', {
    runId,
    nodeId,
    journeyResults,
    systemResults,
    journeySuccessCount: journeyResults.filter(r => r.success).length,
    systemSuccessCount: systemResults.filter(r => r.success).length,
  });
}

/**
 * Log journey edge event
 *
 * @param level - Log level
 * @param message - Log message
 * @param context - Additional context
 */
export function logJourneyEdge(
  level: LogLevel,
  message: string,
  context: Record<string, unknown> = {}
): void {
  log(level, `Journey Edge: ${message}`, context);
}

/**
 * Log system edge event
 *
 * @param level - Log level
 * @param message - Log message
 * @param context - Additional context
 */
export function logSystemEdge(
  level: LogLevel,
  message: string,
  context: Record<string, unknown> = {}
): void {
  log(level, `System Edge: ${message}`, context);
}
