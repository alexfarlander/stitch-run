'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { validateGraphUpdate, formatValidationErrors } from '@/lib/ai/validation';
import { AI_ACTIONS, AI_RETRY_CONFIG } from '@/lib/ai/constants';
import type { Node, Edge } from '@xyflow/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GraphUpdate {
  nodes: Node[];
  edges: Edge[];
}

interface AIAssistantPanelProps {
  canvasId: string;
  currentNodes?: Node[];
  onGraphUpdate?: (graph: GraphUpdate) => void;
}

interface AIResponse {
  action?: string;
  message?: string;
  result?: {
    canvas?: GraphUpdate;
  };
}

export function AIAssistantPanel({ canvasId, currentNodes = [], onGraphUpdate }: AIAssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Property 57: Conversation context cleanup
   * For any conversation end, the System SHALL clear the conversation context.
   * Validates: Requirements 20.4
   */
  useEffect(() => {
    // Clear conversation context when panel closes
    if (!isOpen && messages.length > 0) {
      // Clear messages after a short delay to allow for smooth closing animation
      const timeoutId = setTimeout(() => {
        setMessages([]);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, messages.length]);

  /**
   * Create user message and add to conversation
   */
  const createUserMessage = (content: string): Message => {
    return { role: 'user', content };
  };

  /**
   * Send AI request with exponential backoff retry logic
   */
  const sendAIRequest = async (
    userInput: string,
    retryCount = 0
  ): Promise<AIResponse> => {
    try {
      const response = await fetch('/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: userInput,
          canvasId,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Retry with exponential backoff
      if (retryCount < AI_RETRY_CONFIG.MAX_RETRIES) {
        const delay = Math.min(
          AI_RETRY_CONFIG.INITIAL_DELAY_MS *
            Math.pow(AI_RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
          AI_RETRY_CONFIG.MAX_DELAY_MS
        );

        console.log(`Retrying AI request in ${delay}ms (attempt ${retryCount + 1}/${AI_RETRY_CONFIG.MAX_RETRIES})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendAIRequest(userInput, retryCount + 1);
      }

      throw error;
    }
  };

  /**
   * Handle AI response and update UI accordingly
   */
  const handleAIResponse = (data: AIResponse): void => {
    const action = data.action?.toLowerCase();
    
    // Check if this is a graph update action
    if (action === AI_ACTIONS.CREATE_WORKFLOW || action === AI_ACTIONS.MODIFY_WORKFLOW) {
      if (data.result?.canvas) {
        const graph = data.result.canvas;

        /**
         * Property 31: AI worker type validation
         * For any node created by the AI, the worker type SHALL exist in the WORKER_DEFINITIONS registry.
         * Validates: Requirements 9.3
         *
         * Property 32: AI edge validation
         * For any edge created by the AI, both the source and target nodes SHALL exist in the canvas.
         * Validates: Requirements 9.4
         */
        const validation = validateGraphUpdate(graph, currentNodes);

        if (!validation.valid) {
          // Display validation errors in chat
          const errorMessage: Message = {
            role: 'assistant',
            content: formatValidationErrors(validation.errors),
          };
          setMessages(prev => [...prev, errorMessage]);
        } else {
          // Validation passed, apply the graph update
          if (onGraphUpdate) {
            onGraphUpdate(graph);
          }

          // Add success message
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.message || "Done! I've updated the workflow.",
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      } else {
        // No graph data in response
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message || 'Done!',
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } else {
      // Non-graph update action (e.g., analyze)
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || 'Done!',
      };
      setMessages(prev => [...prev, assistantMessage]);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage = createUserMessage(input);
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Send AI request with retry logic
      const data = await sendAIRequest(userInput);
      
      // Handle the response
      handleAIResponse(data);
    } catch (error) {
      console.error('AI request failed after retries:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /**
   * Handle panel close with context cleanup
   * Validates: Requirements 20.4, 20.5
   */
  const handleClose = () => {
    setIsOpen(false);
    // Context cleanup happens in useEffect
  };

  return (
    <>
      {/* Toggle button - fixed in bottom-right corner */}
      <Button
        className="fixed bottom-4 right-4 rounded-full w-12 h-12 shadow-lg z-40"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Assistant"
      >
        <MessageSquare className="w-5 h-5" />
      </Button>

      {/* Chat panel - fixed bottom-right, above toggle button */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-96 h-[500px] flex flex-col shadow-2xl z-40 bg-gray-900 border-gray-800">
          <CardHeader className="border-b border-gray-800 flex-row items-center justify-between py-4">
            <CardTitle className="text-white">AI Assistant</CardTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              aria-label="Close AI Assistant"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Ask me to create or modify workflows!</p>
                    <p className="text-xs mt-2">Try: "Create a workflow with 3 nodes"</p>
                  </div>
                )}
                
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-800 text-gray-200'
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 text-gray-200 rounded-lg px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="border-t border-gray-800 p-4 gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to create a workflow..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              size="icon"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
