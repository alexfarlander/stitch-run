'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { StitchCanvas, BMCCanvas } from '@/components/canvas';
import { Navigation } from '@/components/Navigation';
import { supabase } from '@/lib/supabase/client';
import { StitchFlow } from '@/types/stitch';

export default function CanvasPage() {
  const params = useParams();
  const canvasId = params.id as string;
  const [canvas, setCanvas] = useState<StitchFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCanvas = async () => {
      try {
        const { data, error } = await supabase
          .from('stitch_flows')
          .select('*')
          .eq('id', canvasId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Canvas not found');

        setCanvas(data as StitchFlow);
      } catch (err: any) {
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
      <Navigation />
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">{canvas.name}</h1>
        <p className="text-sm text-slate-400 mt-1">Living Business Model Canvas</p>
      </div>
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
