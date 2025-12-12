/**
 * Base worker interface and utilities
 * Defines the contract that all worker implementations must follow
 */

import { NodeConfig } from '@/types/stitch';

/**
 * Base worker interface that all worker implementations must implement
 */
export interface IWorker {
  /**
   * Executes the worker logic
   * @param runId - The run identifier
   * @param nodeId - The node identifier
   * @param config - Node configuration from the flow graph
   * @param input - Merged input from upstream nodes
   * @returns Promise that resolves when execution is initiated
   */
  execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void>;
}
