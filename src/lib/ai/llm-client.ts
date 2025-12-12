/**
 * LLM Client Interface and Implementations
 * 
 * Provides a unified interface for interacting with Large Language Models (LLMs).
 * Includes retry logic with exponential backoff and comprehensive error handling.
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Base interface for LLM clients
 */
export interface LLMClient {
  /**
   * Complete a prompt with the LLM
   * @param prompt - The prompt to send to the LLM
   * @returns LLM response text
   * @throws LLMError on API errors, timeouts, or rate limits
   */
  complete(prompt: string): Promise<string>;
}

/**
 * Custom error class for LLM-related errors
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Configuration options for Claude LLM client
 */
export interface ClaudeLLMClientConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  initialRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Claude LLM client implementation using Anthropic API
 * 
 * Features:
 * - Exponential backoff retry logic for transient failures
 * - Timeout handling
 * - Rate limit detection and retry
 * - Comprehensive error handling
 */
export class ClaudeLLMClient implements LLMClient {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private maxRetries: number;
  private initialRetryDelayMs: number;
  private maxRetryDelayMs: number;
  private timeoutMs: number;

  constructor(config: ClaudeLLMClientConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature !== undefined ? config.temperature : 1.0;
    this.maxRetries = config.maxRetries !== undefined ? config.maxRetries : 3;
    this.initialRetryDelayMs = config.initialRetryDelayMs || 1000;
    this.maxRetryDelayMs = config.maxRetryDelayMs || 10000;
    this.timeoutMs = config.timeoutMs || 60000; // 60 seconds default
  }

  /**
   * Complete a prompt with Claude
   * Implements retry logic with exponential backoff
   */
  async complete(prompt: string): Promise<string> {
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(prompt);
        return response;
      } catch (error) {
        lastError = error;
        
        // If error is not retryable or we've exhausted retries, throw
        if (!this.isRetryableError(error) || attempt === this.maxRetries) {
          throw this.wrapError(error);
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateRetryDelay(attempt);
        
        console.warn(
          `LLM request failed (attempt ${attempt + 1}/${this.maxRetries + 1}), ` +
          `retrying in ${delay}ms...`,
          error
        );
        
        await this.sleep(delay);
      }
    }
    
    // Should never reach here, but TypeScript needs this
    throw this.wrapError(lastError);
  }

  /**
   * Make the actual API request with timeout
   */
  private async makeRequest(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }, {
        signal: controller.signal as AbortSignal,
      });
      
      clearTimeout(timeoutId);
      
      // Extract text from response
      const textContent = response.content.find(
        (block) => block.type === 'text'
      );
      
      if (!textContent || textContent.type !== 'text') {
        throw new LLMError(
          'No text content in Claude response',
          'NO_TEXT_CONTENT',
          false
        );
      }
      
      return textContent.text;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    // Timeout errors are retryable
    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }
    
    // Anthropic SDK errors
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status?: number }).status;
      
      // Retry on rate limits, server errors, and timeouts
      if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
        return true;
      }
    }
    
    // Network errors are retryable
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('enotfound')
      ) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Wrap errors in LLMError with appropriate metadata
   */
  private wrapError(error: unknown): LLMError {
    // Already an LLMError
    if (error instanceof LLMError) {
      return error;
    }
    
    // Timeout error
    if (error instanceof Error && error.name === 'AbortError') {
      return new LLMError(
        `LLM request timed out after ${this.timeoutMs}ms`,
        'TIMEOUT',
        true,
        error
      );
    }
    
    // Anthropic SDK errors
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status?: number; message?: string }).status;
      const message = (error as { message?: string }).message || 'Unknown error';
      
      if (status === 401) {
        return new LLMError(
          'Invalid API key',
          'INVALID_API_KEY',
          false,
          error
        );
      }
      
      if (status === 429) {
        return new LLMError(
          'Rate limit exceeded',
          'RATE_LIMIT',
          true,
          error
        );
      }
      
      if (status === 400) {
        return new LLMError(
          `Invalid request: ${message}`,
          'INVALID_REQUEST',
          false,
          error
        );
      }
      
      if (status && status >= 500) {
        return new LLMError(
          `Server error: ${message}`,
          'SERVER_ERROR',
          true,
          error
        );
      }
    }
    
    // Generic error
    const message = error instanceof Error ? error.message : String(error);
    return new LLMError(
      `LLM request failed: ${message}`,
      'UNKNOWN_ERROR',
      false,
      error
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: initialDelay * 2^attempt
    const exponentialDelay = this.initialRetryDelayMs * Math.pow(2, attempt);
    
    // Add jitter (random 0-25% of delay) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * Math.random();
    
    // Cap at max delay
    return Math.min(exponentialDelay + jitter, this.maxRetryDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create an LLM client from environment variables
 */
export function createLLMClient(): LLMClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new LLMError(
      'ANTHROPIC_API_KEY environment variable is not set',
      'MISSING_API_KEY',
      false
    );
  }
  
  return new ClaudeLLMClient({
    apiKey,
    model: process.env.AI_MANAGER_MODEL,
    maxTokens: process.env.AI_MANAGER_MAX_TOKENS 
      ? parseInt(process.env.AI_MANAGER_MAX_TOKENS, 10) 
      : undefined,
  });
}
