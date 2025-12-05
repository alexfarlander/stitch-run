/**
 * UXInteractionPanel - Human-in-the-loop input panel
 * Appears when a UX node is waiting for user input
 */

'use client';

import { useState } from 'react';
import { User, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UXInteractionPanelProps {
  runId: string;
  nodeId: string;
  nodeLabel?: string;
  prompt?: string;
}

export function UXInteractionPanel({
  runId,
  nodeId,
  nodeLabel,
  prompt,
}: UXInteractionPanelProps) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!input.trim()) {
      setError('Input cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/stitch/complete/${runId}/${nodeId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit input');
      }

      // Success - clear input
      setInput('');
    } catch (_err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-lg border-2 border-blue-500 rounded-lg shadow-[0_0_30px_rgba(59,130,246,0.5)] p-6 min-w-[500px] max-w-[600px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-blue-500 p-2 animate-pulse">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Input Required
            </h3>
            <p className="text-sm text-slate-400">
              {nodeLabel || nodeId}
            </p>
          </div>
        </div>

        {/* Prompt */}
        {prompt && (
          <div className="mb-4 p-3 bg-slate-800/50 rounded border border-slate-700">
            <p className="text-sm text-slate-300">{prompt}</p>
          </div>
        )}

        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your input here..."
          className={cn(
            'w-full h-32 px-4 py-3 bg-slate-800 border-2 rounded-lg',
            'text-white placeholder:text-slate-500',
            'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            'resize-none transition-all',
            error ? 'border-red-500' : 'border-slate-700'
          )}
          disabled={isSubmitting}
        />

        {/* Error */}
        {error && (
          <div className="mt-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !input.trim()}
          className={cn(
            'mt-4 w-full flex items-center justify-center gap-2',
            'px-6 py-3 rounded-lg font-semibold',
            'bg-blue-500 hover:bg-blue-600 text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200',
            'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
            'hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Complete Task
            </>
          )}
        </button>
      </div>
    </div>
  );
}
