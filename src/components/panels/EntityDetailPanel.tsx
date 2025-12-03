'use client';

import { X } from 'lucide-react';
import { StitchEntity } from '@/types/entity';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  entity: StitchEntity | null;
  onClose: () => void;
  onMoveEntity: (entityId: string, targetNodeId: string) => void;
}

export function EntityDetailPanel({ entity, onClose, onMoveEntity }: Props) {
  if (!entity) return null;

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

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Entity Details</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-800 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Avatar and Name */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
            {entity.avatar_url ? (
              <img
                src={entity.avatar_url}
                alt={entity.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-white">
                {entity.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{entity.name}</h3>
            <Badge className={typeColors[entity.entity_type]}>
              {entity.entity_type.charAt(0).toUpperCase() + entity.entity_type.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Contact Info */}
        {entity.email && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Email</label>
            <p className="text-sm text-gray-200 mt-1">{entity.email}</p>
          </div>
        )}

        {/* Business Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {entity.metadata.source && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide">Source</label>
              <p className="text-sm text-gray-200 mt-1 capitalize">{entity.metadata.source}</p>
            </div>
          )}
          {entity.metadata.plan && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide">Plan</label>
              <p className="text-sm text-gray-200 mt-1 capitalize">{entity.metadata.plan}</p>
            </div>
          )}
          {entity.metadata.cac !== undefined && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide">CAC</label>
              <p className="text-sm text-gray-200 mt-1">${entity.metadata.cac}</p>
            </div>
          )}
          {entity.metadata.ltv !== undefined && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide">LTV</label>
              <p className="text-sm text-gray-200 mt-1">${entity.metadata.ltv}</p>
            </div>
          )}
        </div>

        {/* Current Position */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">Current Position</label>
          <p className="text-sm text-gray-200 mt-1">
            {entity.current_node_id && `At: ${entity.current_node_id}`}
            {entity.current_edge_id && `Traveling on: ${entity.current_edge_id} (${Math.round((entity.edge_progress || 0) * 100)}%)`}
          </p>
        </div>

        {/* Journey Timeline */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-3 block">
            Journey Timeline
          </label>
          <div className="space-y-3">
            {entity.journey.map((event, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  {index < entity.journey.length - 1 && (
                    <div className="w-px h-full bg-gray-700 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm text-gray-200 font-medium capitalize">
                    {event.type.replace(/_/g, ' ')}
                  </p>
                  {event.node_id && (
                    <p className="text-xs text-gray-400 mt-1">{event.node_id}</p>
                  )}
                  {event.edge_id && (
                    <p className="text-xs text-gray-400 mt-1">{event.edge_id}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)}</p>
                  {event.note && (
                    <p className="text-xs text-gray-400 mt-1 italic">{event.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timestamps */}
        <div className="pt-4 border-t border-gray-800 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Created</span>
            <span className="text-gray-300">{formatDate(entity.created_at)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Updated</span>
            <span className="text-gray-300">{formatDate(entity.updated_at)}</span>
          </div>
          {entity.completed_at && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Completed</span>
              <span className="text-gray-300">{formatDate(entity.completed_at)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
