/**
 * Worker Registry
 * Centralized mapping system that associates worker types with their implementations
 */

import { IWorker } from './base';

/**
 * Worker Registry interface
 */
export interface IWorkerRegistry {
  /**
   * Registers a worker type with its implementation
   * @param type - The worker type identifier
   * @param workerClass - The worker class constructor
   */
  register(type: string, workerClass: new () => IWorker): void;
  
  /**
   * Retrieves a worker instance for a given type
   * @param type - The worker type identifier
   * @returns Worker instance
   * @throws Error if type is not registered
   */
  getWorker(type: string): IWorker;
  
  /**
   * Checks if a worker type is registered
   * @param type - The worker type identifier
   * @returns true if registered, false otherwise
   */
  hasWorker(type: string): boolean;
}

/**
 * Worker Registry implementation
 * Singleton pattern for global registry access
 */
export class WorkerRegistry implements IWorkerRegistry {
  private static instance: WorkerRegistry;
  private workers: Map<string, new () => IWorker>;

  private constructor() {
    this.workers = new Map();
  }

  /**
   * Gets the singleton instance of the registry
   */
  public static getInstance(): WorkerRegistry {
    if (!WorkerRegistry.instance) {
      WorkerRegistry.instance = new WorkerRegistry();
    }
    return WorkerRegistry.instance;
  }

  /**
   * Registers a worker type with its implementation
   */
  public register(type: string, workerClass: new () => IWorker): void {
    this.workers.set(type, workerClass);
  }

  /**
   * Retrieves a worker instance for a given type
   * @throws Error if type is not registered
   */
  public getWorker(type: string): IWorker {
    const WorkerClass = this.workers.get(type);
    if (!WorkerClass) {
      throw new Error(`Worker type "${type}" is not registered`);
    }
    return new WorkerClass();
  }

  /**
   * Checks if a worker type is registered
   */
  public hasWorker(type: string): boolean {
    return this.workers.has(type);
  }
}

/**
 * Global registry instance
 */
export const workerRegistry = WorkerRegistry.getInstance();
