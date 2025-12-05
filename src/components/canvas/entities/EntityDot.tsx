'use client';

import { motion } from 'framer-motion';
import { StitchEntity } from '@/types/entity';
import { 
  ENTITY_TRAVEL_DURATION_SECONDS, 
  NODE_JUMP_DURATION_SECONDS 
} from '@/lib/canvas/animation-config';

interface EntityDotProps {
  entity: StitchEntity;
  position: { x: number; y: number };
  isSelected: boolean;
  onClick: () => void;
  onDragStart?: (entityId: string) => void;
  onDragEnd?: (entityId: string, targetNodeId: string | null) => void;
}

/**
 * EntityDot Component
 * 
 * Displays an animated entity dot that moves across the canvas.
 * Animation duration is synchronized with edge traversal animations.
 * Supports drag-and-drop for manual entity movement.
 * 
 * Requirements: 
 * - 17.1, 17.2, 17.4 - Synchronized animations
 * - 5.1 - Display visual indicator during drag operation
 */
export function EntityDot({ 
  entity, 
  position, 
  isSelected, 
  onClick,
  onDragStart,
  onDragEnd 
}: EntityDotProps) {
  const glowColor = {
    lead: '#06b6d4',
    customer: '#10b981',
    churned: '#ef4444'
  }[entity.entity_type];

  const isMoving = !!entity.current_edge_id;
  const opacity = entity.entity_type === 'churned' ? 0.6 : 1;

  // Calculate animation duration based on whether entity is moving
  // Synchronized with edge traversal animation duration
  // Requirement 17.2: Both animations complete at the same time
  const animationDuration = isMoving 
    ? ENTITY_TRAVEL_DURATION_SECONDS 
    : NODE_JUMP_DURATION_SECONDS;

  // Handle drag start
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      entityId: entity.id,
      sourceNodeId: entity.current_node_id
    }));
    onDragStart?.(entity.id);
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    // The drop target will handle the actual movement
    // This is just for cleanup
    onDragEnd?.(entity.id, null);
  };

  return (
    <motion.div
      className="absolute cursor-move group"
      style={{ 
        zIndex: 40 // Below EntityDetailPanel (z-50) but above canvas elements
      }}
      animate={{
        left: position.x,
        top: position.y,
      }}
      transition={{
        duration: animationDuration,
        ease: isMoving ? 'linear' : 'easeInOut',
      }}
      onClick={onClick}
      draggable={!isMoving} // Only allow dragging when not currently moving
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Pulse animation when moving */}
      {isMoving && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            width: 28,
            height: 28,
            boxShadow: `0 0 12px ${glowColor}`,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.6, 0.3, 0.6],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Avatar dot */}
      <div
        className="w-7 h-7 rounded-full border-2 flex items-center justify-center relative z-10 transition-transform hover:scale-110"
        style={{
          borderColor: glowColor,
          boxShadow: isSelected ? `0 0 20px ${glowColor}` : `0 0 12px ${glowColor}`,
          backgroundColor: '#1a1a2e',
          opacity,
          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
        }}
      >
        {entity.avatar_url ? (
          <img
            src={entity.avatar_url}
            alt={entity.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-white">
            {entity.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name label (shows on hover) */}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {entity.name}
      </div>
    </motion.div>
  );
}
