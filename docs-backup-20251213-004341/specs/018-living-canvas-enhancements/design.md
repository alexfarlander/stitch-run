# Living Canvas Enhancements Design Document

## Overview

The Living Canvas Enhancements feature builds upon the existing Living Canvas foundation (which provides real-time entity tracking and basic status indicators) to add professional-grade animations, interactive configuration tools, time-travel debugging, and AI-powered workflow creation. This design focuses exclusively on frontend visualization and interaction components, leveraging the existing backend infrastructure.

**Key Design Principles:**
1. **Visual First**: Every feature must have an immediate, visible impact on the canvas
2. **Performance**: All animations must maintain 60fps using CSS transforms and GPU acceleration
3. **Progressive Enhancement**: Features should work independently and enhance each other when combined
4. **Existing Backend**: Leverage all existing backend capabilities without modification
5. **User Delight**: Create "wow moments" that make demonstrations memorable

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    Enhanced Visualization Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Edge         │  │ Node Status  │  │ Entity       │         │
│  │ Traversal    │  │ Animations   │  │ Clustering   │         │
│  │ Animation    │  │ (Box-Shadow) │  │ (Badges)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                    Interactive Control Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Node Config  │  │ Timeline     │  │ AI Assistant │         │
│  │ Panel        │  │ Scrubber     │  │ Chat Panel   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                    Existing Living Canvas                        │
│         (Real-time subscriptions, entity tracking)               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Edge Traversal**: Entity movement → Journey event → Edge animation trigger → Pulse animation
2. **Node Animations**: Node status change → Real-time update → CSS animation class applied
3. **Configuration**: User clicks node → Panel opens → Form generated from worker schema → Save updates database
4. **Clustering**: Multiple entities at node → Clustering logic → Badge rendered with count
5. **Time Travel**: User scrubs timeline → Query journey events → Reconstruct state → Update canvas
6. **AI Assistant**: User types message → API call with context → AI response → Graph update

## Components and Interfaces

### 1. Edge Traversal Animation System

**Component**: `JourneyEdge.tsx` (enhancement to existing component)

```typescript
interface JourneyEdgeData {
  // Existing fields...
  isTraversing?: boolean;
  traversalId?: string;
}

// Enhanced JourneyEdge component
function JourneyEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const edgePath = getSmoothStepPath({ sourceX, sourceY, targetX, targetY });
  
  return (
    <>
      {/* Base edge */}
      <path d={edgePath} className="edge-base" />
      
      {/* Traversal pulse */}
      {data.isTraversing && (
        <path
          d={edgePath}
          className="edge-pulse"
          style={{
            stroke: 'url(#cyan-gradient)',
            strokeDasharray: '10 5',
            animation: 'pulse-travel 500ms ease-out'
          }}
        />
      )}
    </>
  );
}
```

**Hook**: `useEdgeTraversal.ts`

```typescript
function useEdgeTraversal(canvasId: string): Map<string, boolean> {
  const [traversingEdges, setTraversingEdges] = useState(new Map());
  
  useEffect(() => {
    const subscription = supabase
      .channel(`journey:${canvasId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'stitch_journey_events',
        filter: `canvas_id=eq.${canvasId}`
      }, (payload) => {
        const event = payload.new as JourneyEvent;
        if (event.event_type === 'edge_start' && event.edge_id) {
          // Mark edge as traversing
          setTraversingEdges(prev => new Map(prev).set(event.edge_id!, true));
          
          // Clear after animation duration
          setTimeout(() => {
            setTraversingEdges(prev => {
              const next = new Map(prev);
              next.delete(event.edge_id!);
              return next;
            });
          }, 500);
        }
      })
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [canvasId]);
  
  return traversingEdges;
}
```

### 2. Enhanced Node Status Animations

**CSS Keyframes** (add to `globals.css`):

```css
@keyframes pulse-running {
  0%, 100% { box-shadow: 0 0 10px rgba(251,191,36,0.5); }
  50% { box-shadow: 0 0 30px rgba(251,191,36,0.9); }
}

@keyframes flash-completed {
  0% { box-shadow: 0 0 50px rgba(0,255,153,1); }
  100% { box-shadow: 0 0 15px rgba(0,255,153,0.4); }
}

@keyframes flash-failed {
  0% { box-shadow: 0 0 50px rgba(239,68,68,1); }
  100% { box-shadow: 0 0 15px rgba(239,68,68,0.4); }
}
```

**Component Enhancement**: `BaseNode.tsx`

```typescript
function getStatusStyles(status: NodeStatus['status']) {
  switch (status) {
    case 'running':
      return 'animate-[pulse-running_1.5s_ease-in-out_infinite]';
    case 'completed':
      return 'animate-[flash-completed_1s_ease-out_forwards]';
    case 'failed':
      return 'animate-[flash-failed_1s_ease-out_forwards]';
    default:
      return '';
  }
}
```

### 3. Node Configuration Panel

**Component**: `NodeConfigPanel.tsx`

```typescript
interface NodeConfigPanelProps {
  nodeId: string | null;
  canvasId: string;
  onClose: () => void;
  onSave: (nodeId: string, config: NodeConfig) => Promise<void>;
}

function NodeConfigPanel({ nodeId, canvasId, onClose, onSave }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<NodeConfig | null>(null);
  const [workerType, setWorkerType] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Load node configuration
  useEffect(() => {
    if (nodeId) {
      fetchNodeConfig(canvasId, nodeId).then(setConfig);
    }
  }, [nodeId, canvasId]);
  
  // Get worker schema
  const workerSchema = WORKER_DEFINITIONS[workerType]?.input || {};
  
  // Validate field
  const validateField = (fieldName: string, value: any) => {
    const field = workerSchema[fieldName];
    if (field.required && !value) {
      return 'This field is required';
    }
    if (field.pattern && !new RegExp(field.pattern).test(value)) {
      return field.errorMessage || 'Invalid format';
    }
    return null;
  };
  
  // Handle save
  const handleSave = async () => {
    // Validate all fields
    const newErrors: Record<string, string> = {};
    Object.keys(workerSchema).forEach(fieldName => {
      const error = validateField(fieldName, config?.[fieldName]);
      if (error) newErrors[fieldName] = error;
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    await onSave(nodeId!, config!);
    onClose();
  };
  
  return (
    <Sheet open={!!nodeId} onOpenChange={onClose}>
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle>Node Configuration</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 mt-4">
          {/* Worker Type Selector */}
          <Select value={workerType} onValueChange={setWorkerType}>
            <SelectTrigger>
              <SelectValue placeholder="Select worker type" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(WORKER_DEFINITIONS).map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Dynamic Form Fields */}
          {Object.entries(workerSchema).map(([fieldName, fieldDef]) => (
            <div key={fieldName}>
              <Label>{fieldDef.label || fieldName}</Label>
              <Input
                value={config?.[fieldName] || ''}
                onChange={(e) => {
                  setConfig({ ...config, [fieldName]: e.target.value });
                  const error = validateField(fieldName, e.target.value);
                  setErrors({ ...errors, [fieldName]: error || '' });
                }}
                onBlur={() => {
                  const error = validateField(fieldName, config?.[fieldName]);
                  setErrors({ ...errors, [fieldName]: error || '' });
                }}
              />
              {errors[fieldName] && (
                <p className="text-sm text-red-500 mt-1">{errors[fieldName]}</p>
              )}
            </div>
          ))}
          
          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={Object.values(errors).some(e => e)}
          >
            Save Configuration
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 4. Entity Clustering System

**Component**: `EntityCluster.tsx`

```typescript
interface EntityClusterProps {
  count: number;
  position: { x: number; y: number };
  nodeId: string;
  entities: StitchEntity[];
  onClick: () => void;
}

function EntityCluster({ count, position, entities, onClick }: EntityClusterProps) {
  const [showPopover, setShowPopover] = useState(false);
  
  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <div
          className="entity-cluster"
          style={{
            position: 'absolute',
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -50%)'
          }}
          onClick={onClick}
        >
          <div className="cluster-badge">
            {count}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2">
          {entities.map(entity => (
            <div key={entity.id} className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={entity.avatar_url} />
                <AvatarFallback>{entity.name[0]}</AvatarFallback>
              </Avatar>
              <span>{entity.name}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Enhanced EntityOverlay Logic**:

```typescript
function EntityOverlay({ canvasId }: { canvasId: string }) {
  const { entities } = useCanvasEntities(canvasId);
  const { nodes } = useReactFlow();
  
  // Group entities by node
  const entitiesByNode = entities.reduce((acc, entity) => {
    const nodeId = entity.current_node_id;
    if (!acc[nodeId]) acc[nodeId] = [];
    acc[nodeId].push(entity);
    return acc;
  }, {} as Record<string, StitchEntity[]>);
  
  return (
    <>
      {Object.entries(entitiesByNode).map(([nodeId, nodeEntities]) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;
        
        // Cluster if more than 5 entities
        if (nodeEntities.length > 5) {
          return (
            <EntityCluster
              key={nodeId}
              count={nodeEntities.length}
              position={node.position}
              entities={nodeEntities}
              onClick={() => {/* handle click */}}
            />
          );
        }
        
        // Otherwise show individual dots
        return nodeEntities.map((entity, index) => (
          <AnimatedEntityDot
            key={entity.id}
            entity={entity}
            offset={index}
          />
        ));
      })}
    </>
  );
}
```

### 5. Timeline Scrubber System

**Component**: `TimelineScrubber.tsx`

```typescript
interface TimelineScrubberProps {
  runId: string;
  onTimestampChange: (timestamp: string | null) => void;
}

function TimelineScrubber({ runId, onTimestampChange }: TimelineScrubberProps) {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  useEffect(() => {
    // Fetch all journey events for this run
    fetchJourneyEvents(runId).then(setEvents);
  }, [runId]);
  
  const handleSliderChange = (value: number[]) => {
    const index = value[0];
    setSelectedIndex(index);
    onTimestampChange(events[index]?.timestamp || null);
  };
  
  const handleMarkerClick = (index: number) => {
    setSelectedIndex(index);
    onTimestampChange(events[index].timestamp);
  };
  
  return (
    <div className="timeline-scrubber">
      <Slider
        value={[selectedIndex ?? events.length - 1]}
        min={0}
        max={events.length - 1}
        step={1}
        onValueChange={handleSliderChange}
      />
      
      {/* Event markers */}
      <div className="timeline-markers">
        {events.map((event, index) => {
          if (event.event_type === 'node_complete' || event.event_type === 'node_failure') {
            return (
              <div
                key={index}
                className={`marker ${event.event_type}`}
                style={{ left: `${(index / events.length) * 100}%` }}
                onClick={() => handleMarkerClick(index)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="marker-dot" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {event.event_type} at {new Date(event.timestamp).toLocaleTimeString()}
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          }
          return null;
        })}
      </div>
      
      {/* Exit time travel button */}
      {selectedIndex !== null && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedIndex(null);
            onTimestampChange(null);
          }}
        >
          Exit Time Travel
        </Button>
      )}
    </div>
  );
}
```

**Hook**: `useTimelineNodeStates.ts`

```typescript
function useTimelineNodeStates(runId: string, timestamp: string | null) {
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState>>({});
  
  useEffect(() => {
    if (!timestamp) {
      // Return to real-time
      fetchCurrentRun(runId).then(run => setNodeStates(run.node_states));
      return;
    }
    
    // Reconstruct state from journey events
    fetchJourneyEvents(runId, { before: timestamp }).then(events => {
      const reconstructed: Record<string, NodeState> = {};
      
      events.forEach(event => {
        const nodeId = event.node_id;
        if (!nodeId) return;
        
        switch (event.event_type) {
          case 'node_arrival':
            reconstructed[nodeId] = { status: 'running' };
            break;
          case 'node_complete':
            reconstructed[nodeId] = { status: 'completed', output: event.metadata?.output };
            break;
          case 'node_failure':
            reconstructed[nodeId] = { status: 'failed', error: event.metadata?.error };
            break;
        }
      });
      
      setNodeStates(reconstructed);
    });
  }, [runId, timestamp]);
  
  return nodeStates;
}
```

### 6. AI Assistant Panel

**Component**: `AIAssistantPanel.tsx`

```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantPanelProps {
  canvasId: string;
  onGraphUpdate: (graph: { nodes: Node[]; edges: Edge[] }) => void;
}

function AIAssistantPanel({ canvasId, onGraphUpdate }: AIAssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Call AI manager API
      const response = await fetch('/api/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: input,
          canvasId,
          conversationHistory: messages
        })
      });
      
      const data = await response.json();
      
      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || 'Done!'
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Handle graph updates
      if (data.action === 'createWorkflow' || data.action === 'modifyWorkflow') {
        onGraphUpdate(data.result.graph);
      }
    } catch (error) {
      console.error('AI request failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      {/* Toggle button */}
      <Button
        className="fixed bottom-4 right-4 rounded-full w-12 h-12"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MessageSquare />
      </Button>
      
      {/* Chat panel */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-96 h-[500px] flex flex-col">
          <CardHeader>
            <CardTitle>AI Assistant</CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <p>{msg.content}</p>
              </div>
            ))}
            {isLoading && <Spinner />}
          </CardContent>
          
          <CardFooter>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Ask me to create a workflow..."
            />
            <Button onClick={handleSubmit} disabled={isLoading}>
              Send
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
```

### 7. Enhanced Drill-Down Animations

**Component Enhancement**: `CanvasRouter.tsx`

```typescript
function CanvasRouter() {
  const { currentCanvas, direction } = useCanvasNavigation();
  
  // Determine animation based on direction
  const getAnimationProps = () => {
    if (direction === 'in') {
      return {
        initial: { scale: 2, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.5, opacity: 0 }
      };
    } else {
      return {
        initial: { scale: 0.5, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 2, opacity: 0 }
      };
    }
  };
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentCanvas.id}
        {...getAnimationProps()}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {currentCanvas.type === 'bmc' ? (
          <BMCCanvas canvasId={currentCanvas.id} />
        ) : (
          <WorkflowCanvas canvasId={currentCanvas.id} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Component**: `SectionNode.tsx` (enhancement)

```typescript
function SectionNode({ data }: NodeProps) {
  const hasChildWorkflow = !!data.child_canvas_id;
  
  return (
    <div className="section-node">
      {/* Existing section content */}
      
      {/* Drill-down indicator */}
      {hasChildWorkflow && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="drill-down-icon">
              <Layers className="w-4 h-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Double-click to drill down
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
```

## Data Models

### TypeScript Interfaces

```typescript
// Edge traversal state
interface EdgeTraversalState {
  edgeId: string;
  isTraversing: boolean;
  traversalId: string;
  startTime: number;
}

// Node configuration
interface NodeConfig {
  workerType: string;
  inputs: Record<string, any>;
  entityMovement?: {
    targetNodeId?: string;
    targetSectionId?: string;
  };
}

// Worker definition schema
interface WorkerDefinition {
  name: string;
  description: string;
  input: Record<string, FieldDefinition>;
  output: Record<string, FieldDefinition>;
}

interface FieldDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  label?: string;
  placeholder?: string;
  pattern?: string;
  errorMessage?: string;
}

// Timeline state
interface TimelineState {
  runId: string;
  events: JourneyEvent[];
  currentTimestamp: string | null;
  reconstructedNodeStates: Record<string, NodeState>;
}

// AI conversation
interface AIConversation {
  canvasId: string;
  messages: Message[];
  context: {
    currentNodes: Node[];
    currentEdges: Edge[];
    availableWorkers: string[];
  };
}

// Entity cluster
interface EntityCluster {
  nodeId: string;
  entities: StitchEntity[];
  position: { x: number; y: number };
  count: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Edge traversal animation trigger

*For any* entity movement from node A to node B, the system SHALL set isTraversing=true on the connecting edge when the movement begins.
**Validates: Requirements 1.1**

### Property 2: Edge traversal animation duration

*For any* edge traversal animation, the animation SHALL complete within 500 milliseconds from start to finish.
**Validates: Requirements 1.3**

### Property 3: Multiple traversal independence

*For any* set of concurrent entity movements on the same edge, each movement SHALL have its own independent animation state without interference.
**Validates: Requirements 1.4**

### Property 4: Edge default state

*For any* edge that is not currently being traversed, the edge SHALL have isTraversing=false.
**Validates: Requirements 1.5**

### Property 5: Node status animation mapping

*For any* node with status "running", "completed", or "failed", the Canvas SHALL apply the corresponding CSS animation class.
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 6: Idle node styling

*For any* node with status "idle", the Canvas SHALL not apply any animated effects.
**Validates: Requirements 2.4**

### Property 7: Configuration panel display

*For any* workflow node that is clicked, the Canvas SHALL display the configuration panel with the node's current settings.
**Validates: Requirements 3.1, 3.2**

### Property 8: Worker type schema update

*For any* change to the worker type selection, the System SHALL update the form fields to match the new worker's input schema.
**Validates: Requirements 3.3**

### Property 9: Configuration save atomicity

*For any* configuration save operation, the System SHALL update the database and close the panel as a single atomic operation.
**Validates: Requirements 3.4**

### Property 10: Configuration cancel preservation

*For any* configuration panel close without save, the node configuration in the database SHALL remain unchanged.
**Validates: Requirements 3.5**

### Property 11: Entity clustering threshold

*For any* node with more than 5 entities, the Canvas SHALL display a single cluster badge instead of individual entity dots.
**Validates: Requirements 4.1**

### Property 12: Cluster count accuracy

*For any* cluster badge displayed, the count SHALL equal the exact number of entities at that node.
**Validates: Requirements 4.2**

### Property 13: Individual entity display threshold

*For any* node with 5 or fewer entities, the Canvas SHALL display individual entity dots for each entity.
**Validates: Requirements 4.4**

### Property 14: Cluster count reactivity

*For any* change in the number of entities at a node, the cluster count SHALL update to reflect the new total.
**Validates: Requirements 4.5**

### Property 15: Manual entity movement validation

*For any* manual entity move to a target node, the System SHALL verify the target node exists before updating the database.
**Validates: Requirements 5.2, 14.1**

### Property 16: Invalid drop rollback

*For any* entity drop on an invalid target, the entity position SHALL remain at its original location.
**Validates: Requirements 5.3**

### Property 17: Manual move event recording

*For any* manual entity movement, the System SHALL create a journey event with event_type="manual_move".
**Validates: Requirements 5.4**

### Property 18: Timeline scrubber display condition

*For any* completed workflow run, the Canvas SHALL display the timeline scrubber component.
**Validates: Requirements 6.1**

### Property 19: Timeline state reconstruction

*For any* timestamp selected on the timeline, the Canvas SHALL display node statuses that match the historical state at that timestamp.
**Validates: Requirements 6.2**

### Property 20: Timeline entity positions

*For any* timestamp selected on the timeline, the Canvas SHALL display entity positions as they were at that point in history.
**Validates: Requirements 6.3**

### Property 21: Time travel exit restoration

*For any* exit from time travel mode, the Canvas SHALL return to displaying the current real-time state.
**Validates: Requirements 6.5**

### Property 22: State reconstruction query range

*For any* state reconstruction at timestamp T, the System SHALL query all journey events with timestamp <= T.
**Validates: Requirements 7.1**

### Property 23: Node arrival event processing

*For any* journey event with event_type="node_arrival", the state reconstruction SHALL set the node status to "running".
**Validates: Requirements 7.2**

### Property 24: Node complete event processing

*For any* journey event with event_type="node_complete", the state reconstruction SHALL set the node status to "completed".
**Validates: Requirements 7.3**

### Property 25: Node failure event processing

*For any* journey event with event_type="node_failure", the state reconstruction SHALL set the node status to "failed".
**Validates: Requirements 7.4**

### Property 26: AI panel display toggle

*For any* click on the AI assistant icon, the Canvas SHALL toggle the visibility of the chat panel.
**Validates: Requirements 8.1**

### Property 27: AI request transmission

*For any* message submitted by the user, the System SHALL send a request to the AI manager API.
**Validates: Requirements 8.2**

### Property 28: AI workflow creation application

*For any* AI response with action="createWorkflow", the System SHALL add the new nodes and edges to the canvas.
**Validates: Requirements 8.3**

### Property 29: AI workflow modification application

*For any* AI response with action="modifyWorkflow", the System SHALL update the existing canvas graph.
**Validates: Requirements 8.4**

### Property 30: AI canvas context inclusion

*For any* AI request, the System SHALL include the current canvas ID in the request payload.
**Validates: Requirements 9.1**

### Property 31: AI worker type validation

*For any* node created by the AI, the worker type SHALL exist in the WORKER_DEFINITIONS registry.
**Validates: Requirements 9.3**

### Property 32: AI edge validation

*For any* edge created by the AI, both the source and target nodes SHALL exist in the canvas.
**Validates: Requirements 9.4**

### Property 33: Drill-in animation parameters

*For any* drill-down navigation into a section, the Canvas SHALL animate from scale 2 to scale 1.
**Validates: Requirements 10.1**

### Property 34: Drill-out animation parameters

*For any* navigation back to BMC, the Canvas SHALL animate from scale 0.5 to scale 1.
**Validates: Requirements 10.2**

### Property 35: Drill animation duration

*For any* drill-down or drill-out animation, the animation SHALL use a 300ms duration.
**Validates: Requirements 10.3**

### Property 36: Drill-down icon display condition

*For any* section node with a child_canvas_id, the Canvas SHALL display a layers icon.
**Validates: Requirements 11.1**

### Property 37: Drill-down icon absence condition

*For any* section node without a child_canvas_id, the Canvas SHALL not display the drill-down icon.
**Validates: Requirements 11.3**

### Property 38: Worker definitions access

*For any* configuration panel load, the System SHALL have access to all worker types from WORKER_DEFINITIONS.
**Validates: Requirements 12.1, 12.2**

### Property 39: Worker schema field generation

*For any* selected worker type, the System SHALL generate form fields for each field in the worker's input schema.
**Validates: Requirements 12.4**

### Property 40: Required field validation

*For any* required field that is empty, the System SHALL display a validation error message.
**Validates: Requirements 13.1**

### Property 41: Save button state with errors

*For any* configuration form with validation errors, the save button SHALL be disabled.
**Validates: Requirements 13.4**

### Property 42: Edge existence validation

*For any* entity movement between nodes, the System SHALL verify an edge exists connecting the source and target nodes.
**Validates: Requirements 14.2**

### Property 43: Validation failure prevention

*For any* validation failure, the System SHALL prevent the movement and display an error message.
**Validates: Requirements 14.3**

### Property 44: Timeline event markers

*For any* node completion or failure event, the timeline SHALL display a marker at the corresponding timestamp.
**Validates: Requirements 15.1, 15.2**

### Property 45: Marker click navigation

*For any* timeline marker click, the Canvas SHALL update the timeline position to that marker's timestamp.
**Validates: Requirements 15.3**

### Property 46: AI suggestion application

*For any* accepted AI suggestion, the System SHALL apply the suggested changes to the canvas.
**Validates: Requirements 16.4**

### Property 47: Animation synchronization start

*For any* entity movement, the edge traversal animation SHALL start at the same time as the entity animation.
**Validates: Requirements 17.1**

### Property 48: Animation synchronization end

*For any* entity movement, the edge traversal animation SHALL complete at the same time as the entity animation.
**Validates: Requirements 17.2**

### Property 49: Cinematic mode duration consistency

*For any* entity movement in cinematic mode, both the entity and edge animations SHALL use the configured duration.
**Validates: Requirements 17.4**

### Property 50: Real-time input validation

*For any* user input in a configuration field, the System SHALL validate the input immediately as the user types.
**Validates: Requirements 18.1**

### Property 51: Validation error display timing

*For any* validation failure, the System SHALL display the error message immediately below the field.
**Validates: Requirements 18.2**

### Property 52: Validation error clearing

*For any* field that becomes valid, the System SHALL remove any previous error messages.
**Validates: Requirements 18.3**

### Property 53: Back button display condition

*For any* workflow canvas view, the Canvas SHALL display a "Back to Surface" button.
**Validates: Requirements 19.1**

### Property 54: Back button navigation

*For any* click on the "Back to Surface" button, the Canvas SHALL navigate to the parent BMC view.
**Validates: Requirements 19.2**

### Property 55: Back button absence at top level

*For any* top-level BMC view, the Canvas SHALL not display the "Back to Surface" button.
**Validates: Requirements 19.5**

### Property 56: Conversation history inclusion

*For any* AI message sent, the System SHALL include all previous messages in the conversation history.
**Validates: Requirements 20.1**

### Property 57: Conversation context cleanup

*For any* conversation end, the System SHALL clear the conversation context.
**Validates: Requirements 20.4**

## Error Handling

### Animation Errors

- **Animation Failure**: If CSS animation fails to apply, log error but don't block UI
- **Timing Errors**: If animation duration exceeds expected time, complete immediately
- **Concurrent Animations**: Handle multiple simultaneous animations without visual glitches
- **Performance Degradation**: If frame rate drops below 30fps, reduce animation complexity

### Configuration Panel Errors

- **Schema Load Failure**: Display error message and disable form if worker schema can't be loaded
- **Validation Errors**: Show inline error messages for each invalid field
- **Save Failures**: Display error toast and keep panel open to allow retry
- **Network Errors**: Show connection error and provide retry button

### Timeline Scrubber Errors

- **Event Query Failure**: Display error message and disable scrubber
- **State Reconstruction Failure**: Fall back to showing current state
- **Invalid Timestamp**: Clamp to valid range (first to last event)
- **Missing Events**: Handle gaps in event history gracefully

### AI Assistant Errors

- **API Failure**: Display error message in chat and allow retry
- **Invalid Response**: Show error and log details for debugging
- **Graph Update Failure**: Roll back changes and notify user
- **Context Loss**: Start fresh conversation if context becomes invalid

### Entity Clustering Errors

- **Position Calculation Failure**: Fall back to default position
- **Cluster Overflow**: Handle very large entity counts (>1000) with pagination
- **Popover Errors**: Gracefully handle popover rendering failures

## Testing Strategy

### Unit Testing

The system will use **Vitest** for unit testing with the following focus areas:

1. **Edge Traversal Animation**
   - Test isTraversing flag setting on entity movement
   - Test animation timeout clearing after 500ms
   - Test multiple concurrent traversals

2. **Node Status Animations**
   - Test CSS class application for each status
   - Test animation timing and duration
   - Test status transitions

3. **Configuration Panel**
   - Test form field generation from worker schema
   - Test validation logic for required fields
   - Test save and cancel operations

4. **Entity Clustering**
   - Test clustering threshold (>5 entities)
   - Test count accuracy
   - Test individual display for <=5 entities

5. **Timeline Scrubber**
   - Test event marker generation
   - Test state reconstruction from events
   - Test timeline navigation

6. **AI Assistant**
   - Test message sending and receiving
   - Test graph update application
   - Test context management

### Property-Based Testing

The system will use **fast-check** for property-based testing. Each property-based test will run a minimum of 100 iterations to ensure comprehensive coverage.

Each property-based test MUST be tagged with a comment explicitly referencing the correctness property from this design document using the format: **Feature: living-canvas-enhancements, Property {number}: {property_text}**

Property-based tests will focus on:

1. **Animation Properties**
   - Property 1: Edge traversal trigger (test with random entity movements)
   - Property 2: Animation duration (test timing consistency)
   - Property 5: Status animation mapping (test all status values)

2. **Validation Properties**
   - Property 15: Movement validation (test with random node IDs)
   - Property 31: Worker type validation (test with random worker types)
   - Property 42: Edge existence validation (test with random node pairs)

3. **State Reconstruction Properties**
   - Property 22: Query range (test with random timestamps)
   - Property 23-25: Event processing (test with random event sequences)

4. **Clustering Properties**
   - Property 11: Clustering threshold (test with random entity counts)
   - Property 12: Count accuracy (test with varying entity numbers)

5. **Configuration Properties**
   - Property 38: Worker definitions access (test with all worker types)
   - Property 39: Field generation (test with random worker schemas)

### Integration Testing

1. **End-to-End Animation Flow**
   - Test entity movement triggering both entity and edge animations
   - Verify animations complete synchronously
   - Confirm journey events are recorded

2. **Configuration Workflow**
   - Test opening panel, editing config, and saving
   - Verify database updates and panel closure
   - Test cancel operation preserves original config

3. **Timeline Time Travel**
   - Test scrubbing through complete workflow execution
   - Verify state reconstruction accuracy
   - Test exiting time travel mode

4. **AI Workflow Creation**
   - Test creating workflow via AI chat
   - Verify nodes and edges are added correctly
   - Test modification of existing workflows

5. **Drill-Down Navigation**
   - Test navigation from BMC to workflow and back
   - Verify animations play correctly
   - Confirm state preservation across navigation

## Performance Considerations

### Animation Performance

- Use CSS transforms and opacity for GPU acceleration
- Limit concurrent animations to prevent frame drops
- Use `will-change` CSS property for animated elements
- Debounce rapid state changes to prevent animation thrashing

### Real-Time Updates

- Batch multiple entity updates into single render cycle
- Use React.memo to prevent unnecessary re-renders
- Implement virtual scrolling for large entity lists in popovers
- Throttle timeline scrubber updates to 60fps

### Memory Management

- Clean up animation timeouts on component unmount
- Unsubscribe from real-time channels when not needed
- Limit conversation history to last 50 messages
- Cache worker definitions to avoid repeated lookups

### Scalability

- Support up to 100 concurrent entity animations
- Handle timelines with 10,000+ events efficiently
- Support entity clusters with 1000+ entities
- Maintain 60fps with 50+ nodes on canvas

## Implementation Notes

### CSS Animation Strategy

All animations should use CSS keyframes for optimal performance:
- Node status animations: box-shadow keyframes
- Edge traversal: stroke-dashoffset animation
- Drill-down: scale and opacity transforms
- Entity movement: translate transforms

### Worker Registry Integration

The configuration panel must dynamically load worker schemas:
```typescript
import { WORKER_DEFINITIONS } from '@/lib/workers/registry';

// Access schema
const schema = WORKER_DEFINITIONS[workerType].input;
```

### Timeline Event Filtering

Optimize timeline queries with proper indexing:
```sql
CREATE INDEX idx_journey_events_timestamp 
ON stitch_journey_events(run_id, timestamp);
```

### AI Context Management

Keep AI context lightweight:
- Include only node IDs and types, not full configurations
- Limit conversation history to recent messages
- Clear context after 30 minutes of inactivity

## API Endpoints

### Entity Movement API

```typescript
// POST /api/entities/[entityId]/move
interface MoveEntityRequest {
  targetNodeId: string;
  manual?: boolean;
}

interface MoveEntityResponse {
  success: boolean;
  entity: StitchEntity;
  journeyEvent: JourneyEvent;
}
```

### Node Configuration API

```typescript
// PUT /api/canvas/[canvasId]/nodes/[nodeId]/config
interface UpdateNodeConfigRequest {
  workerType: string;
  inputs: Record<string, any>;
}

interface UpdateNodeConfigResponse {
  success: boolean;
  node: Node;
}
```

### Timeline API

```typescript
// GET /api/runs/[runId]/timeline
interface TimelineResponse {
  events: JourneyEvent[];
  startTime: string;
  endTime: string;
}

// GET /api/runs/[runId]/state?timestamp=<iso-string>
interface HistoricalStateResponse {
  nodeStates: Record<string, NodeState>;
  entityPositions: Record<string, { nodeId: string; edgeId?: string }>;
}
```

### AI Assistant API

```typescript
// POST /api/ai-manager
interface AIRequest {
  request: string;
  canvasId: string;
  conversationHistory: Message[];
}

interface AIResponse {
  message: string;
  action?: 'createWorkflow' | 'modifyWorkflow' | 'analyze';
  result?: {
    graph?: { nodes: Node[]; edges: Edge[] };
    suggestions?: string[];
  };
}
```
