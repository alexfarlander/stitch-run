/**
 * Canvas Breadcrumbs Component
 * Displays navigation breadcrumbs for drill-down navigation
 */

'use client';

import { ChevronRight, Home } from 'lucide-react';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';

export function CanvasBreadcrumbs() {
  const { breadcrumbs, navigateTo, canGoBack } = useCanvasNavigation();

  if (breadcrumbs.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isFirst = index === 0;

        return (
          <div key={item.id} className="flex items-center gap-2">
            <button
              onClick={() => navigateTo(index)}
              disabled={isLast}
              className={`
                flex items-center gap-2 px-3 py-1 rounded text-sm
                transition-all duration-200
                ${
                  isLast
                    ? 'text-cyan-400 bg-cyan-500/10 cursor-default'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }
              `}
            >
              {isFirst && <Home className="w-3 h-3" />}
              <span>{item.name}</span>
              <span className="text-xs text-slate-500 uppercase">
                {item.type === 'bmc' ? 'BMC' : item.type}
              </span>
            </button>

            {!isLast && (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </div>
        );
      })}
    </div>
  );
}
