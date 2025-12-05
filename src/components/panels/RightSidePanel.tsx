'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Activity,
  User,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StitchEntity } from '@/types/entity';
import { EventsLogPanel } from './EventsLogPanel';
import { AIAssistantContent } from './AIAssistantContent';
import { EntityDetailContent } from './EntityDetailContent';
import { useCanvasEvents } from '@/hooks/useCanvasEvents';
import type { Node } from '@xyflow/react';

type TabId = 'events' | 'ai' | 'entity';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'events', label: 'Events', icon: <Activity className="w-4 h-4" /> },
  { id: 'ai', label: 'AI', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'entity', label: 'Entity', icon: <User className="w-4 h-4" /> },
];

interface RightSidePanelProps {
  canvasId: string;
  selectedEntity: StitchEntity | null;
  onEntityClose: () => void;
  onMoveEntity: (entityId: string, targetNodeId: string) => void;
  currentNodes?: Node[];
  onGraphUpdate?: (graph: { nodes: Node[]; edges: any[] }) => void;
}

/**
 * RightSidePanel Component
 * 
 * A sliding panel on the right side of the canvas with three tabs:
 * - Events Log: Real-time feed of canvas events
 * - AI Assistant: Chat interface for workflow modifications
 * - Entity Details: Details of the selected entity
 * 
 * Auto-opens on large screens, can be toggled on smaller screens.
 */
export function RightSidePanel({
  canvasId,
  selectedEntity,
  onEntityClose,
  onMoveEntity,
  currentNodes = [],
  onGraphUpdate,
}: RightSidePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('events');
  const { events, clearEvents } = useCanvasEvents(canvasId);

  // Auto-open on large screens
  useEffect(() => {
    const checkScreenSize = () => {
      const isLargeScreen = window.innerWidth >= 1280; // xl breakpoint
      setIsOpen(isLargeScreen);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Switch to entity tab when an entity is selected
  useEffect(() => {
    if (selectedEntity) {
      setActiveTab('entity');
      setIsOpen(true);
    }
  }, [selectedEntity]);

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    if (!isOpen) setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (activeTab === 'entity') {
      onEntityClose();
    }
  };

  return (
    <>
      {/* Toggle button - visible when panel is closed (left side) */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 rounded-r-lg rounded-l-none h-24 w-8 bg-gray-900/90 border border-l-0 border-gray-700 hover:bg-gray-800"
          variant="ghost"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}

      {/* Main panel - LEFT side */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 shadow-2xl z-50',
          'transition-transform duration-300 ease-in-out',
          'flex',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'w-[380px]'
        )}
      >
        {/* Tab bar */}
        <div className="w-12 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-4 gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                'hover:bg-gray-800',
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-gray-200'
              )}
              title={tab.label}
            >
              {tab.icon}
              {/* Badge for events count */}
              {tab.id === 'events' && events.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-[10px] font-bold rounded-full flex items-center justify-center text-white">
                  {events.length > 9 ? '9+' : events.length}
                </span>
              )}
              {/* Badge for entity */}
              {tab.id === 'entity' && selectedEntity && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </button>
          ))}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-all"
            title="Close panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'events' && (
              <EventsLogPanel events={events} onClear={clearEvents} />
            )}
            {activeTab === 'ai' && (
              <AIAssistantContent
                canvasId={canvasId}
                currentNodes={currentNodes}
                onGraphUpdate={onGraphUpdate}
              />
            )}
            {activeTab === 'entity' && (
              <EntityDetailContent
                entity={selectedEntity}
                onClose={onEntityClose}
                onMoveEntity={onMoveEntity}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
