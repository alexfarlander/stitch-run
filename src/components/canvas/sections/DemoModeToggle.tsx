'use client';

import { memo } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface DemoModeToggleProps {
  showDemo: boolean;
  onToggle: (showDemo: boolean) => void;
  className?: string;
}

/**
 * DemoModeToggle Component
 * 
 * A toggle switch to control demo mode in financial sections.
 * Provides visual feedback and smooth transitions between demo and real data.
 * 
 * Requirements: 1.5
 */
export const DemoModeToggle = memo(({ showDemo, onToggle, className = '' }: DemoModeToggleProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-slate-400">
        {showDemo ? 'Demo' : 'Live'}
      </span>
      <button
        onClick={() => onToggle(!showDemo)}
        className={`
          relative inline-flex h-5 w-9 items-center rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
          ${showDemo 
            ? 'bg-amber-500/30 focus:ring-amber-500' 
            : 'bg-emerald-500/30 focus:ring-emerald-500'
          }
        `}
        title={showDemo ? 'Switch to live data' : 'Switch to demo data'}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full
            transition-transform duration-200 ease-in-out
            flex items-center justify-center
            ${showDemo 
              ? 'translate-x-0.5 bg-amber-500' 
              : 'translate-x-4 bg-emerald-500'
            }
          `}
        >
          {showDemo ? (
            <Eye className="w-2.5 h-2.5 text-slate-900" />
          ) : (
            <EyeOff className="w-2.5 h-2.5 text-slate-900" />
          )}
        </span>
      </button>
    </div>
  );
});

DemoModeToggle.displayName = 'DemoModeToggle';
