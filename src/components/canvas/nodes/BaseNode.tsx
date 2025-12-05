/**
 * BaseNode - Visual wrapper for nodes with Frankenstein's Lab aesthetic
 * Handles status-based styling with pulsing glows and neon effects
 */

import { NodeStatus } from '@/types/stitch';
import { CheckCircle2, AlertCircle, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BaseNodeProps {
  id: string;
  type: string;
  status: NodeStatus;
  label: string;
  children?: React.ReactNode;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
}

export function BaseNode({ id, type, status, label, children, onDrop, onDragOver }: BaseNodeProps) {
  return (
    <div
      className={cn(
        'relative min-w-[200px] rounded-lg border-2 bg-slate-900 p-4 transition-all',
        getStatusStyles(status)
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {/* Status indicator badge */}
      <div className="absolute -top-2 -right-2">
        {getStatusIcon(status)}
      </div>

      {/* Node header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-mono text-slate-400 uppercase">
          {type}
        </div>
        <div className="text-xs text-slate-500">
          {id}
        </div>
      </div>

      {/* Node content */}
      <div className="text-sm font-medium text-white mb-2">
        {children || 'Node'}
      </div>

      {/* Status label */}
      <div className={cn(
        'text-xs font-mono',
        getStatusTextColor(status)
      )}>
        {label}
      </div>
    </div>
  );
}

function getStatusStyles(status: NodeStatus): string {
  switch (status) {
    case 'pending':
      return 'opacity-50 border-slate-700';
    
    case 'running':
      return 'border-amber-500 animate-[pulse-running_1.5s_ease-in-out_infinite]';
    
    case 'completed':
      return 'border-[#00ff99] animate-[flash-completed_1s_ease-out_forwards]';
    
    case 'failed':
      return 'border-red-500 animate-[flash-failed_1s_ease-out_forwards]';
    
    case 'waiting_for_user':
      return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] animate-pulse';
    
    default:
      return 'border-slate-700';
  }
}

function getStatusIcon(status: NodeStatus) {
  const iconClass = 'w-5 h-5';
  
  switch (status) {
    case 'completed':
      return (
        <div className="rounded-full bg-[#00ff99] p-1">
          <CheckCircle2 className={cn(iconClass, 'text-slate-900')} />
        </div>
      );
    
    case 'failed':
      return (
        <div className="rounded-full bg-red-500 p-1">
          <AlertCircle className={cn(iconClass, 'text-white')} />
        </div>
      );
    
    case 'running':
      return (
        <div className="rounded-full bg-amber-500 p-1">
          <Loader2 className={cn(iconClass, 'text-white animate-spin')} />
        </div>
      );
    
    case 'waiting_for_user':
      return (
        <div className="rounded-full bg-blue-500 p-1 animate-pulse">
          <User className={cn(iconClass, 'text-white')} />
        </div>
      );
    
    default:
      return null;
  }
}

function getStatusTextColor(status: NodeStatus): string {
  switch (status) {
    case 'pending':
      return 'text-slate-500';
    case 'running':
      return 'text-amber-400';
    case 'completed':
      return 'text-[#00ff99]';
    case 'failed':
      return 'text-red-400';
    case 'waiting_for_user':
      return 'text-blue-400';
    default:
      return 'text-slate-400';
  }
}
