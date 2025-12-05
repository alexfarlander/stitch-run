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
  isTraversing?: boolean;
}

/**
 * JourneyEdge Component
 * 
 * Displays an animated edge with traversal pulse effect.
 * The traversal pulse animation is synchronized with entity movement animations.
 * 
 * Requirements: 17.1, 17.2 - Edge pulse synchronized with entity movement
 * Animation duration: 2000ms (matches ENTITY_TRAVEL_DURATION_MS)
 */

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
  style,
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

  const { opacity = 1 } = style || {};

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
        opacity={Number(opacity) * 0.3}
        style={{
          filter: `blur(${glowIntensity * 6}px)`,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />

      {/* Main path - BaseEdge handles its own style including opacity */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#06b6d4',
          strokeWidth: 2,
          filter: `url(#glow-${id})`,
          ...style, // BaseEdge will apply the opacity from style
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
        opacity={opacity}
        style={{
          transition: 'opacity 0.3s ease-in-out',
          pointerEvents: 'none',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Traversal pulse animation - cyan gradient */}
      {edgeData?.isTraversing && (
        <>
          <defs>
            <linearGradient id={`cyan-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={edgePath}
            fill="none"
            stroke={`url(#cyan-gradient-${id})`}
            strokeWidth={4}
            strokeDasharray="12 6"
            className="edge-traversal-pulse"
            opacity={opacity} // Pulse also fades with edge
            style={{
              filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.8))',
              transition: 'opacity 0.3s ease-in-out',
            }}
          />
        </>
      )}

      {/* Tooltip on hover - only visible if edge is visible (opacity > 0) */}
      {isHovered && edgeData?.stats && Number(opacity) > 0 && (
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
        @keyframes edge-pulse {
          from {
            stroke-dashoffset: 24;
            opacity: 1;
          }
          to {
            stroke-dashoffset: 0;
            opacity: 0.6;
          }
        }
        .journey-edge-animated {
          animation: flowAnimation 1s linear infinite;
        }
        .edge-traversal-pulse {
          animation: edge-pulse 2000ms ease-out forwards;
        }
      `}</style>
    </>
  );
}
