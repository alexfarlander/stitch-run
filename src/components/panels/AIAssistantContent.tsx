'use client';

import { useState, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface AIAssistantContentProps {
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

/**
 * AIAssistantContent Component
 * 
 * Chat interface for the AI Assistant, extracted from AIAssistantPanel
 * for use in the unified RightSidePanel.
 */
export function AIAssistantContent({ 
  canvasId, 
  currentNodes = [], 
  onGraphUpdate 
}: AIAssistantContentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    } catch (_error) {
      if (retryCount < AI_RETRY_CONFIG.MAX_RETRIES) {
        const delay = Math.min(
          AI_RETRY_CONFIG.INITIAL_DELAY_MS *
            Math.pow(AI_RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount),
          AI_RETRY_CONFIG.MAX_DELAY_MS
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        return sendAIRequest(userInput, retryCount + 1);
      }

      throw error;
    }
  };

  const handleAIResponse = (data: AIResponse): void => {
    const action = data.action?.toLowerCase();
    
    if (action === AI_ACTIONS.CREATE_WORKFLOW || action === AI_ACTIONS.MODIFY_WORKFLOW) {
      if (data.result?.canvas) {
        const graph = data.result.canvas;
        const validation = validateGraphUpdate(graph, currentNodes);

        if (!validation.valid) {
          const errorMessage: Message = {
            role: 'assistant',
            content: formatValidationErrors(validation.errors),
          };
          setMessages(prev => [...prev, errorMessage]);
        } else {
          if (onGraphUpdate) {
            onGraphUpdate(graph);
          }

          const assistantMessage: Message = {
            role: 'assistant',
            content: data.message || "Done! I've updated the workflow.",
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      } else {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message || 'Done!',
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } else {
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || 'Done!',
      };
      setMessages(prev => [...prev, assistantMessage]);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const data = await sendAIRequest(userInput);
      handleAIResponse(data);
    } catch (_error) {
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Ask me to create or modify workflows!</p>
              <p className="text-xs mt-2 text-gray-500">
                Try: "Create a workflow with 3 nodes"
              </p>
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
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-200'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-gray-800 p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          disabled={isLoading}
          className="flex-1 bg-gray-800 border-gray-700 text-sm"
        />
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          size="icon"
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
