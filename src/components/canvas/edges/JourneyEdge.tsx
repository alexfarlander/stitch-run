'use client';

import { useState } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

interface JourneyEdgeData {
  intensity?: number;
  label?: string;
  stats?: {
    totalTraveled?: number;
    conversionRate?: number;
  };
}

export function JourneyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const edgeData = data as JourneyEdgeData | undefined;
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const intensity = edgeData?.intensity ?? 0.6;
  const glowColor = `rgba(6, 182, 212, ${intensity})`;
  const glowIntensity = intensity * 0.5;

  return (
    <>
      <defs>
        <filter id={`glow-${id}`}>
          <feGaussianBlur stdDeviation={glowIntensity * 8} result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={glowColor}
        strokeWidth={12}
        opacity={0.3}
        style={{
          filter: `blur(${glowIntensity * 6}px)`,
        }}
      />

      {/* Main path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#06b6d4',
          strokeWidth: 2,
          filter: `url(#glow-${id})`,
        }}
      />

      {/* Animated dashes - moving along path direction */}
      <path
        d={edgePath}
        fill="none"
        stroke="#22d3ee"
        strokeWidth={2}
        strokeDasharray="8 4"
        className="journey-edge-animated"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Tooltip on hover */}
      {isHovered && edgeData?.stats && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-60}
            y={-30}
            width={120}
            height={50}
            fill="#0f172a"
            stroke="#06b6d4"
            strokeWidth={1}
            rx={4}
            opacity={0.95}
          />
          <text
            x={0}
            y={-10}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize={11}
            fontWeight="600"
          >
            {edgeData.label || 'Journey Path'}
          </text>
          {edgeData.stats.totalTraveled !== undefined && (
            <text
              x={0}
              y={5}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={9}
            >
              Traveled: {edgeData.stats.totalTraveled}
            </text>
          )}
          {edgeData.stats.conversionRate !== undefined && (
            <text
              x={0}
              y={18}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={9}
            >
              Conv: {(edgeData.stats.conversionRate * 100).toFixed(1)}%
            </text>
          )}
        </g>
      )}

      <style jsx>{`
        @keyframes flowAnimation {
          from {
            stroke-dashoffset: 24;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .journey-edge-animated {
          animation: flowAnimation 1s linear infinite;
        }
      `}</style>
    </>
  );
}
