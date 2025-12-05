'use client';

import { useEffect, useState } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';
import { supabase } from '@/lib/supabase/client';

interface SystemEdgeData {
  systemAction?: string;
  label?: string;
}

/**
 * SystemEdge Component
 * 
 * Displays a dashed edge representing background system processes.
 * System edges fire in parallel with journey edges but do not move entities.
 * 
 * Features:
 * - Dashed stroke styling (gray/cyan #64748b)
 * - Pulse animation on edge fire (1 second duration)
 * - Supabase Realtime subscription for 'edge_fired' events
 * 
 * Requirements: 4.2, 4.3
 */
export function SystemEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
}: EdgeProps) {
  const [isPulsing, setIsPulsing] = useState(false);

  const edgeData = data as SystemEdgeData | undefined;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Subscribe to system edge fire events via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('system-edges')
      .on('broadcast', { event: 'edge_fired' }, (payload) => {
        if (payload.payload?.edge_id === id) {
          setIsPulsing(true);
          // Reset pulse after 1 second
          setTimeout(() => setIsPulsing(false), 1000);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [id]);

  // Force visibility when pulsing to override parent opacity: 0 style
  const shouldForceVisible = isPulsing;
  const { opacity = 1 } = style || {};

  return (
    <g style={{ opacity: shouldForceVisible ? 1 : opacity }}>
      {/* Main dashed path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#64748b',
          strokeWidth: 2,
          strokeDasharray: '5 5',
          ...style, // apply other styles but opacity works on the group
        }}
      />

      {/* Pulse animation overlay when edge fires */}
      {isPulsing && (
        <>
          <defs>
            <linearGradient id={`system-pulse-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={edgePath}
            fill="none"
            stroke={`url(#system-pulse-${id})`}
            strokeWidth={4}
            strokeDasharray="5 5"
            className="system-edge-pulse"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))',
            }}
          />
        </>
      )}

      {/* Optional label for system action */}
      {edgeData?.label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-40}
            y={-12}
            width={80}
            height={24}
            fill="#0f172a"
            stroke="#64748b"
            strokeWidth={1}
            rx={4}
            opacity={0.9}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10}
            fontWeight="500"
          >
            {edgeData.label}
          </text>
        </g>
      )}

      <style jsx>{`
        @keyframes system-pulse {
          from {
            opacity: 1;
            stroke-width: 4;
          }
          to {
            opacity: 0;
            stroke-width: 6;
          }
        }
        .system-edge-pulse {
          animation: system-pulse 1000ms ease-out forwards;
        }
      `}</style>
    </g>
  );
}
