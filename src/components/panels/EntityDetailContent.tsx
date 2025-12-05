'use client';

import { User } from 'lucide-react';
import { StitchEntity } from '@/types/entity';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JourneyHistoryPanel } from '@/components/canvas/JourneyHistoryPanel';

interface EntityDetailContentProps {
  entity: StitchEntity | null;
  onClose: () => void;
  onMoveEntity: (entityId: string, targetNodeId: string) => void;
}

/**
 * EntityDetailContent Component
 * 
 * Displays entity details inside the RightSidePanel.
 * Extracted from EntityDetailPanel for the unified panel system.
 */
export function EntityDetailContent({ entity, onClose, onMoveEntity }: EntityDetailContentProps) {
  if (!entity) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <User className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-sm text-center">No entity selected</p>
        <p className="text-xs mt-2 text-gray-600 text-center">
          Click on an entity dot on the canvas to view details
        </p>
      </div>
    );
  }

  const typeColors = {
    lead: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
    customer: 'bg-green-500/20 text-green-400 border-green-500/50',
    churned: 'bg-red-500/20 text-red-400 border-red-500/50'
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNodeName = (nodeId: string) => {
    if (!nodeId) return 'Unknown';
    return nodeId
      .replace('item-', '')
      .replace('section-', '')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Avatar and Name */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
            {entity.avatar_url ? (
              <img
                src={entity.avatar_url}
                alt={entity.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-white">
                {entity.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{entity.name}</h3>
            <Badge className={`${typeColors[entity.entity_type]} text-xs`}>
              {entity.entity_type.charAt(0).toUpperCase() + entity.entity_type.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Contact Info */}
        {entity.email && (
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
            <p className="text-sm text-gray-300 mt-0.5 truncate">{entity.email}</p>
          </div>
        )}

        {/* Current Position */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Current Position</label>
          <p className="text-sm text-gray-200 mt-1">
            {entity.current_node_id ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {formatNodeName(entity.current_node_id)}
              </span>
            ) : entity.current_edge_id ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                Traveling ({Math.round((entity.edge_progress || 0) * 100)}%)
              </span>
            ) : (
              <span className="text-gray-500">Not on canvas</span>
            )}
          </p>
        </div>

        {/* Business Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {entity.metadata?.source && (
            <div className="bg-gray-800/30 rounded-lg p-2.5">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Source</label>
              <p className="text-sm text-gray-200 mt-0.5 capitalize">{entity.metadata.source}</p>
            </div>
          )}
          {entity.metadata?.plan && (
            <div className="bg-gray-800/30 rounded-lg p-2.5">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Plan</label>
              <p className="text-sm text-gray-200 mt-0.5 capitalize">{entity.metadata.plan}</p>
            </div>
          )}
          {entity.metadata?.cac !== undefined && (
            <div className="bg-gray-800/30 rounded-lg p-2.5">
              <label className="text-xs text-gray-500 uppercase tracking-wide">CAC</label>
              <p className="text-sm text-gray-200 mt-0.5">${entity.metadata.cac}</p>
            </div>
          )}
          {entity.metadata?.ltv !== undefined && (
            <div className="bg-gray-800/30 rounded-lg p-2.5">
              <label className="text-xs text-gray-500 uppercase tracking-wide">LTV</label>
              <p className="text-sm text-gray-200 mt-0.5">${entity.metadata.ltv}</p>
            </div>
          )}
        </div>

        {/* Journey History */}
        <div className="pt-3 border-t border-gray-800">
          <JourneyHistoryPanel 
            entityId={entity.id} 
            entityName={entity.name}
            fallbackJourney={entity.journey}
          />
        </div>

        {/* Timestamps */}
        <div className="pt-3 border-t border-gray-800 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Created</span>
            <span className="text-gray-400">{formatDate(entity.created_at)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Updated</span>
            <span className="text-gray-400">{formatDate(entity.updated_at)}</span>
          </div>
          {entity.completed_at && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Completed</span>
              <span className="text-gray-400">{formatDate(entity.completed_at)}</span>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
