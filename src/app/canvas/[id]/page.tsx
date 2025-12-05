'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StitchCanvas, BMCCanvas } from '@/components/canvas';
import { supabase } from '@/lib/supabase/client';
import { StitchFlow } from '@/types/stitch';
import { getCanvasNavigation } from '@/lib/navigation/canvas-navigation';

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const canvasId = params.id as string;
  const [canvas, setCanvas] = useState<StitchFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync navigation state with URL and handle drill-down navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const navigation = getCanvasNavigation();
    const breadcrumbs = navigation.getBreadcrumbs();
    
    // Check if URL canvas is in the breadcrumb stack
    const canvasIndex = breadcrumbs.findIndex(b => b.id === canvasId);
    
    if (canvasIndex >= 0 && canvasIndex < breadcrumbs.length - 1) {
      // User navigated back via browser - sync the stack
      navigation.navigateTo(canvasIndex);
    }
    
    // Subscribe to navigation changes (for drill-down)
    const unsubscribe = navigation.subscribe(() => {
      const newCanvasId = navigation.getCurrentCanvasId();
      if (newCanvasId && newCanvasId !== canvasId) {
        router.push(`/canvas/${newCanvasId}`);
      }
    });
    
    return unsubscribe;
  }, [canvasId, router]);

  useEffect(() => {
    const fetchCanvas = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('stitch_flows')
          .select('*')
          .eq('id', canvasId)
          .maybeSingle();

        if (error) {
          console.error('[Canvas Page] Supabase error:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        if (!data) {
          throw new Error('Canvas not found');
        }

        setCanvas(data as StitchFlow);
      } catch (err: any) {
        console.error('[Canvas Page] Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCanvas();
  }, [canvasId]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="text-cyan-400 text-lg">Loading canvas...</div>
      </div>
    );
  }

  if (error || !canvas) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="text-red-400 text-lg">Error: {error || 'Canvas not found'}</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950">
      {/* Navigation and header hidden for clean canvas view */}
      <div className="flex-1">
        {canvas.canvas_type === 'bmc' ? (
          <BMCCanvas flow={canvas} />
        ) : (
          <StitchCanvas flow={canvas} editable={true} />
        )}
      </div>
    </div>
  );
}
