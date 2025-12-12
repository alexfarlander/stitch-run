/**
 * Unit tests for LLM Client
 */

// beforeEach import removed as unused
import { ClaudeLLMClient, LLMError, createLLMClient } from '../llm-client';

// Mock the Anthropic SDK
const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockCreate,
      };
    },
  };
});

describe('ClaudeLLMClient', () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('successful completion', () => {
    it('should return text content from Claude response', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
      });
      
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Hello, world!',
          },
        ],
      });
      
      const result = await client.complete('Test prompt');
      
      expect(result).toBe('Hello, world!');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          messages: [
            {
              role: 'user',
              content: 'Test prompt',
            },
          ],
        }),
        expect.any(Object)
      );
    });
    
    it('should use custom configuration', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
        model: 'claude-opus-4-20250514',
        maxTokens: 8192,
        temperature: 0.5,
      });
      
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
      });
      
      await client.complete('Test');
      
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-20250514',
          max_tokens: 8192,
          temperature: 0.5,
        }),
        expect.any(Object)
      );
    });
  });
  
  describe('error handling', () => {
    it('should throw LLMError when no text content in response', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
      });
      
      mockCreate.mockResolvedValue({
        content: [],
      });
      
      await expect(client.complete('Test')).rejects.toThrow(LLMError);
      await expect(client.complete('Test')).rejects.toThrow('No text content');
    });
    
    it('should wrap 401 errors as INVALID_API_KEY', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'invalid-key',
        maxRetries: 0,
      });
      
      mockCreate.mockRejectedValue({
        status: 401,
        message: 'Invalid API key',
      });
      
      await expect(client.complete('Test')).rejects.toThrow(LLMError);
      
      try {
        await client.complete('Test');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('INVALID_API_KEY');
        expect((error as LLMError).retryable).toBe(false);
      }
    });
    
    it('should wrap 400 errors as INVALID_REQUEST', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
        maxRetries: 0,
      });
      
      mockCreate.mockRejectedValue({
        status: 400,
        message: 'Invalid prompt',
      });
      
      try {
        await client.complete('Test');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('INVALID_REQUEST');
        expect((error as LLMError).retryable).toBe(false);
      }
    });
    
    it('should wrap 429 errors as RATE_LIMIT', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
        maxRetries: 0,
      });
      
      mockCreate.mockRejectedValue({
        status: 429,
        message: 'Rate limit exceeded',
      });
      
      try {
        await client.complete('Test');
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('RATE_LIMIT');
        expect((error as LLMError).retryable).toBe(true);
      }
    });
    
    it('should wrap 500 errors as SERVER_ERROR', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
        maxRetries: 0,
      });
      
      mockCreate.mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      });
      
      try {
        await client.complete('Test');
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('SERVER_ERROR');
        expect((error as LLMError).retryable).toBe(true);
      }
    });
  });
  
  describe('retry logic', () => {
    it('should retry on rate limit errors', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
        maxRetries: 2,
        initialRetryDelayMs: 10,
      });
      
      // Fail twice, then succeed
      mockCreate
        .mockRejectedValueOnce({ status: 429 })
        .mockRejectedValueOnce({ status: 429 })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success' }],
        });
      
      const result = await client.complete('Test');
      
      expect(result).toBe('Success');
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
    
    it('should retry on server errors', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
        maxRetries: 1,
        initialRetryDelayMs: 10,
      });
      
      mockCreate
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success' }],
        });
      
      const result = await client.complete('Test');
      
      expect(result).toBe('Success');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
    
    it('should not retry on non-retryable errors', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
        maxRetries: 3,
      });
      
      mockCreate.mockRejectedValue({ status: 401 });
      
      await expect(client.complete('Test')).rejects.toThrow(LLMError);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
    
    it('should exhaust retries and throw', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
        maxRetries: 2,
        initialRetryDelayMs: 10,
      });
      
      mockCreate.mockRejectedValue({ status: 429 });
      
      await expect(client.complete('Test')).rejects.toThrow(LLMError);
      expect(mockCreate).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
    
    it('should implement exponential backoff', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
        maxRetries: 2,
        initialRetryDelayMs: 100,
        maxRetryDelayMs: 1000,
      });
      
      mockCreate.mockRejectedValue({ status: 429 });
      
      const startTime = Date.now();
      
      try {
        await client.complete('Test');
      } catch {
        // Expected to fail
      }
      
      const elapsed = Date.now() - startTime;
      
      // Should have delays: ~100ms + ~200ms = ~300ms minimum
      // With jitter, could be up to ~375ms
      expect(elapsed).toBeGreaterThanOrEqual(250);
    });
  });
  
  describe('timeout handling', () => {
    it('should timeout long-running requests', async () => {
      const client = new ClaudeLLMClient({
        apiKey: 'test-key',
        timeoutMs: 100,
        maxRetries: 0,
      });
      
      // Mock a request that respects abort signal
      mockCreate.mockImplementation((params, options) => {
        void params;
        return new Promise((resolve, reject) => {
          void resolve;
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const error = new Error('Aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
        });
      });
      
      try {
        await client.complete('Test');
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe('TIMEOUT');
      }
    });
  });
});

describe('createLLMClient', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  it('should create client from environment variables', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    
    const client = createLLMClient();
    
    expect(client).toBeInstanceOf(ClaudeLLMClient);
  });
  
  it('should throw if ANTHROPIC_API_KEY is missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    
    expect(() => createLLMClient()).toThrow(LLMError);
    expect(() => createLLMClient()).toThrow('ANTHROPIC_API_KEY');
  });
  
  it('should use custom model from environment', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.AI_MANAGER_MODEL = 'claude-opus-4-20250514';
    
    const client = createLLMClient();
    
    expect(client).toBeInstanceOf(ClaudeLLMClient);
  });
  
  it('should use custom max tokens from environment', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.AI_MANAGER_MAX_TOKENS = '8192';
    
    const client = createLLMClient();
    
    expect(client).toBeInstanceOf(ClaudeLLMClient);
  });
});
