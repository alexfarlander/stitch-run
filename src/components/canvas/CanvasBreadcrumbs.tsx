'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { getCanvasNavigation, type CanvasStackItem } from '@/lib/navigation/canvas-navigation';
import { useRouter } from 'next/navigation';

interface CanvasBreadcrumbsProps {
  canvasId?: string;
  canvasName?: string;
  canvasType?: 'bmc' | 'workflow';
}

/**
 * Canvas Breadcrumbs Component
 * 
 * Displays navigation breadcrumbs in the top-left corner showing the current
 * drill-down path. Allows users to navigate back to parent canvases.
 */
export function CanvasBreadcrumbs({ canvasId, canvasName, canvasType }: CanvasBreadcrumbsProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<CanvasStackItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    const navigation = getCanvasNavigation();
    
    // Initialize stack if empty and we have canvas info
    if (canvasId && canvasName && navigation.getBreadcrumbs().length === 0) {
      navigation.drillInto({
        id: canvasId,
        name: canvasName,
        type: canvasType || 'bmc',
      });
    }
    
    // Initial breadcrumbs
    setBreadcrumbs(navigation.getBreadcrumbs());

    // Subscribe to navigation changes
    const unsubscribe = navigation.subscribe(() => {
      setBreadcrumbs(navigation.getBreadcrumbs());
    });

    return unsubscribe;
  }, [canvasId, canvasName, canvasType]);

  const handleBackClick = () => {
    if (typeof window === 'undefined') return;
    if (breadcrumbs.length <= 1) return;
    
    const navigation = getCanvasNavigation();
    const parentCanvas = navigation.goBack();
    
    if (parentCanvas) {
      router.push(`/canvas/${parentCanvas.id}`);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (typeof window === 'undefined') return;
    
    const navigation = getCanvasNavigation();
    const targetCanvas = breadcrumbs[index];
    
    // Navigate to the clicked breadcrumb level
    navigation.navigateTo(index);
    router.push(`/canvas/${targetCanvas.id}`);
  };

  // Always show at least a back button when we have breadcrumbs > 1
  const canGoBack = breadcrumbs.length > 1;

  // Don't render if no breadcrumbs or only one level
  if (!canGoBack) {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 z-50">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl">
        {/* Back button */}
        <button
          onClick={handleBackClick}
          className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          title="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-700" />

        {/* Breadcrumbs */}
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <div key={crumb.id} className="flex items-center gap-2">
              {/* Breadcrumb item */}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                disabled={isLast}
                className={`
                  flex items-center gap-1.5 px-2 py-1 rounded transition-colors
                  ${isLast 
                    ? 'text-cyan-400 cursor-default' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer'
                  }
                `}
                title={`Navigate to ${crumb.name}`}
              >
                {isFirst && <Home className="w-3.5 h-3.5" />}
                <span className="text-sm font-medium max-w-[150px] truncate">{crumb.name}</span>
              </button>

              {/* Separator */}
              {!isLast && (
                <ChevronRight className="w-4 h-4 text-slate-600" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
