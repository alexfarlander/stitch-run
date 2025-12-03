'use client';

import { motion } from 'framer-motion';
import { StitchEntity } from '@/types/entity';

interface EntityDotProps {
  entity: StitchEntity;
  position: { x: number; y: number };
  isSelected: boolean;
  onClick: () => void;
}

export function EntityDot({ entity, position, isSelected, onClick }: EntityDotProps) {
  const glowColor = {
    lead: '#06b6d4',
    customer: '#10b981',
    churned: '#ef4444'
  }[entity.entity_type];

  const isMoving = !!entity.current_edge_id;
  const opacity = entity.entity_type === 'churned' ? 0.6 : 1;

  return (
    <motion.div
      className="absolute cursor-pointer group"
      style={{ left: position.x, top: position.y }}
      animate={{ x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      whileHover={{ scale: 1.2 }}
      onClick={onClick}
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
        className="w-7 h-7 rounded-full border-2 flex items-center justify-center relative z-10"
        style={{
          borderColor: glowColor,
          boxShadow: `0 0 12px ${glowColor}`,
          backgroundColor: '#1a1a2e',
          opacity,
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
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        {entity.name}
      </div>
    </motion.div>
  );
}
