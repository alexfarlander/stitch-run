# Implementation Summary: Key Features & Code Highlights

## Worker Integrations

### Overview

Stitch integrates with external AI and media services through a worker adapter pattern. Each worker implements the Stitch Protocol and handles specific tasks like scene generation, video creation, voice synthesis, and video assembly.

### Worker Registry

```typescript
// src/lib/workers/registry.ts
import { ClaudeWorker } from './claude';
import { MinimaxWorker } from './minimax';
import { ElevenLabsWorker } from './elevenlabs';
import { ShotstackWorker } from './shotstack';

const workerRegistry: Record<string, any> = {
  'claude': ClaudeWorker,
  'minimax': MinimaxWorker,
  'elevenlabs': ElevenLabsWorker,
  'shotstack': ShotstackWorker,
};

export function getWorker(workerType: string) {
  const WorkerClass = workerRegistry[workerType];
  if (!WorkerClass) {
    throw new Error(`Unknown worker type: ${workerType}`);
  }
  return new WorkerClass();
}
```

### 1. Claude Worker (Scene Generation)

**Purpose**: Generate structured scene descriptions from text prompts

```typescript
// src/lib/workers/claude.ts
export class ClaudeWorker {
  async execute(runId: string, nodeId: string, config: any, input: any) {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    const response = await anthropic.messages.create({
      model: config.model || 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: input.prompt,
      }],
    });
    
    // Parse JSON response
    const scenes = JSON.parse(response.content[0].text);
    
    // Immediately callback (pseudo-async)
    await fetch(config.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        output: { scenes },
      }),
    });
  }
}
```

**Input**: `{ prompt: "Generate 3 scenes for a product demo video" }`

**Output**: 
```json
{
  "scenes": [
    {
      "visual_prompt": "A modern office with a laptop showing the product dashboard",
      "voice_text": "Welcome to our revolutionary product that transforms how you work",
      "duration": 5
    },
    ...
  ]
}
```

### 2. MiniMax Worker (Image-to-Video)

**Purpose**: Generate video clips from text prompts

```typescript
// src/lib/workers/minimax.ts
export class MinimaxWorker {
  async execute(runId: string, nodeId: string, config: any, input: any) {
    // Fire async video generation
    const response = await fetch('https://api.minimax.io/v1/video/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: input.visual_prompt,
        callback_url: config.callbackUrl,
      }),
    });
    
    // MiniMax will POST to callbackUrl when done
    // No immediate callback - truly async
  }
}
```

**Input**: `{ visual_prompt: "A serene mountain landscape at sunset" }`

**Output** (via callback): `{ videoUrl: "https://cdn.minimax.io/videos/abc123.mp4" }`

### 3. ElevenLabs Worker (Text-to-Speech)

**Purpose**: Generate voice narration from text

```typescript
// src/lib/workers/elevenlabs.ts
export class ElevenLabsWorker {
  async execute(runId: string, nodeId: string, config: any, input: any) {
    // Generate audio
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: input.voice_text,
          model_id: 'eleven_monolingual_v1',
        }),
      }
    );
    
    // Get audio data
    const audioBuffer = await response.arrayBuffer();
    
    // Upload to Supabase Storage
    const supabase = getAdminClient();
    const fileName = `audio-${Date.now()}.mp3`;
    const { data: uploadData } = await supabase.storage
      .from('stitch-media')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
      });
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('stitch-media')
      .getPublicUrl(fileName);
    
    // Callback with audio URL
    await fetch(config.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        output: { audioUrl: publicUrl },
      }),
    });
  }
}
```

**Input**: `{ voice_text: "Welcome to our product demo" }`

**Output**: `{ audioUrl: "https://storage.supabase.co/.../audio-123.mp3" }`

### 4. Shotstack Worker (Video Assembly)

**Purpose**: Combine multiple video and audio clips into final video

```typescript
// src/lib/workers/shotstack.ts
export class ShotstackWorker {
  async execute(runId: string, nodeId: string, config: any, input: any) {
    // Build timeline from scenes
    const timeline = this.buildTimeline(input.scenes);
    
    // Fire async render
    const response = await fetch('https://api.shotstack.io/v1/render', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.SHOTSTACK_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeline,
        output: {
          format: 'mp4',
          resolution: 'hd',
        },
        callback: config.callbackUrl,
      }),
    });
    
    // Shotstack will POST to callbackUrl when done
  }
  
  private buildTimeline(scenes: Scene[]): ShotstackTimeline {
    const videoTrack: ShotstackClip[] = [];
    const audioTrack: ShotstackClip[] = [];
    let currentTime = 0;
    
    for (const scene of scenes) {
      // Add video clip
      videoTrack.push({
        asset: { type: 'video', src: scene.videoUrl },
        start: currentTime,
        length: scene.duration || 5,
      });
      
      // Add audio clip
      if (scene.audioUrl) {
        audioTrack.push({
          asset: { type: 'audio', src: scene.audioUrl },
          start: currentTime,
          length: scene.duration || 5,
        });
      }
      
      currentTime += scene.duration || 5;
    }
    
    return {
      background: '#000000',
      tracks: [
        { clips: videoTrack },
        { clips: audioTrack },
      ],
    };
  }
}
```

**Input**: 
```json
{
  "scenes": [
    {
      "videoUrl": "https://cdn.minimax.io/videos/scene1.mp4",
      "audioUrl": "https://storage.supabase.co/.../audio1.mp3",
      "duration": 5
    },
    ...
  ]
}
```

**Output** (via callback): `{ videoUrl: "https://cdn.shotstack.io/final-video.mp4" }`

## Financial Metrics

### Overview

The financial metrics system calculates business intelligence from entity data, providing real-time visibility into CAC, LTV, MRR, and churn.

### Calculations

```typescript
// src/lib/metrics/calculations.ts

/**
 * Calculate total Customer Acquisition Cost
 */
export function calculateTotalCAC(entities: StitchEntity[]): number {
  return entities.reduce((sum, entity) => {
    return sum + (entity.metadata.cac || 0);
  }, 0);
}

/**
 * Calculate total Lifetime Value
 */
export function calculateTotalRevenue(entities: StitchEntity[]): number {
  const customers = entities.filter(e => e.entity_type === 'customer');
  return customers.reduce((sum, entity) => {
    return sum + (entity.metadata.ltv || 0);
  }, 0);
}

/**
 * Calculate Monthly Recurring Revenue
 */
export function calculateMRR(entities: StitchEntity[]): number {
  const customers = entities.filter(e => e.entity_type === 'customer');
  return customers.reduce((sum, entity) => {
    const plan = entity.metadata.plan;
    const planRevenue = {
      'starter': 29,
      'pro': 99,
      'enterprise': 499,
    }[plan] || 0;
    return sum + planRevenue;
  }, 0);
}

/**
 * Calculate churn rate
 */
export function calculateChurnRate(entities: StitchEntity[]): number {
  const totalCustomers = entities.filter(
    e => e.entity_type === 'customer' || e.entity_type === 'churned'
  ).length;
  
  const churnedCustomers = entities.filter(
    e => e.entity_type === 'churned'
  ).length;
  
  return totalCustomers > 0 ? churnedCustomers / totalCustomers : 0;
}

/**
 * Get customers grouped by plan
 */
export function getCustomersByPlan(entities: StitchEntity[]): Record<string, {
  count: number;
  revenue: number;
}> {
  const customers = entities.filter(e => e.entity_type === 'customer');
  const grouped: Record<string, { count: number; revenue: number }> = {};
  
  for (const customer of customers) {
    const plan = customer.metadata.plan || 'unknown';
    if (!grouped[plan]) {
      grouped[plan] = { count: 0, revenue: 0 };
    }
    grouped[plan].count++;
    grouped[plan].revenue += customer.metadata.ltv || 0;
  }
  
  return grouped;
}
```

### Costs Section Component

```typescript
// src/components/canvas/sections/CostsSection.tsx
export function CostsSection({ canvasId }: { canvasId: string }) {
  const entities = useEntities(canvasId);
  
  const totalCAC = calculateTotalCAC(entities);
  const apiCosts = 1250; // From config
  const infraCosts = 850;
  const totalCosts = totalCAC + apiCosts + infraCosts;
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Costs</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Customer Acquisition</span>
          <span className="font-mono">${totalCAC.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>API Costs</span>
          <span className="font-mono">${apiCosts.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Infrastructure</span>
          <span className="font-mono">${infraCosts.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Total Monthly Costs</span>
          <span className="font-mono">${totalCosts.toFixed(2)}</span>
        </div>
      </div>
      
      <TrendChart data={getCostTrend()} />
    </div>
  );
}
```

### Revenue Section Component

```typescript
// src/components/canvas/sections/RevenueSection.tsx
export function RevenueSection({ canvasId }: { canvasId: string }) {
  const entities = useEntities(canvasId);
  
  const mrr = calculateMRR(entities);
  const totalRevenue = calculateTotalRevenue(entities);
  const customerCount = entities.filter(e => e.entity_type === 'customer').length;
  const byPlan = getCustomersByPlan(entities);
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Revenue</h3>
      
      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-600">Monthly Recurring Revenue</div>
          <div className="text-2xl font-bold">${mrr.toFixed(2)}</div>
          <div className="text-sm text-green-600">↑ 12.5% from last month</div>
        </div>
        
        <div>
          <div className="text-sm text-gray-600">Paying Customers</div>
          <div className="text-2xl font-bold">{customerCount}</div>
        </div>
        
        <div>
          <div className="text-sm text-gray-600 mb-2">By Plan</div>
          {Object.entries(byPlan).map(([plan, data]) => (
            <div key={plan} className="flex justify-between text-sm">
              <span className="capitalize">{plan}</span>
              <span>{data.count} customers</span>
            </div>
          ))}
        </div>
      </div>
      
      <TrendChart data={getRevenueTrend()} />
    </div>
  );
}
```

## Media Library

### Overview

Centralized asset management system for storing and organizing media files (images, videos, audio, documents) used across workflows.

### Media Service

```typescript
// src/lib/media/media-service.ts
export class MediaService {
  /**
   * Upload media file
   */
  async uploadMedia(
    file: File,
    metadata: {
      name: string;
      description?: string;
      media_type: string;
      tags?: string[];
    }
  ): Promise<StitchMedia> {
    const supabase = getAdminClient();
    
    // Upload file to storage
    const fileName = `${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('stitch-media')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('stitch-media')
      .getPublicUrl(fileName);
    
    // Create metadata record
    const { data: mediaData, error: mediaError } = await supabase
      .from('stitch_media')
      .insert({
        name: metadata.name,
        description: metadata.description,
        media_type: metadata.media_type,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        tags: metadata.tags || [],
        metadata: {},
      })
      .select()
      .single();
    
    if (mediaError) throw mediaError;
    
    return mediaData as StitchMedia;
  }
  
  /**
   * Upload from URL (for AI-generated content)
   */
  async uploadFromUrl(
    url: string,
    metadata: {
      name: string;
      media_type: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<StitchMedia> {
    // Fetch file from URL
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    // Upload to storage
    const fileName = `${Date.now()}-${metadata.name}`;
    const supabase = getAdminClient();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('stitch-media')
      .upload(fileName, buffer, {
        contentType: response.headers.get('content-type') || 'application/octet-stream',
      });
    
    if (uploadError) throw uploadError;
    
    // Create metadata record
    const { data: mediaData, error: mediaError } = await supabase
      .from('stitch_media')
      .insert({
        name: metadata.name,
        media_type: metadata.media_type,
        file_path: fileName,
        file_size: buffer.byteLength,
        tags: metadata.tags || [],
        metadata: metadata.metadata || {},
      })
      .select()
      .single();
    
    if (mediaError) throw mediaError;
    
    return mediaData as StitchMedia;
  }
  
  /**
   * Query media by filters
   */
  async queryMedia(filters: {
    media_type?: string;
    tags?: string[];
    search?: string;
  }): Promise<StitchMedia[]> {
    const supabase = getAdminClient();
    let query = supabase.from('stitch_media').select('*');
    
    if (filters.media_type) {
      query = query.eq('media_type', filters.media_type);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data as StitchMedia[];
  }
}
```

### Media Picker Component

```typescript
// src/components/media/MediaPicker.tsx
export function MediaPicker({
  mediaType,
  onSelect,
}: {
  mediaType?: string;
  onSelect: (media: StitchMedia) => void;
}) {
  const [media, setMedia] = useState<StitchMedia[]>([]);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    loadMedia();
  }, [mediaType, search]);
  
  async function loadMedia() {
    const service = new MediaService();
    const results = await service.queryMedia({
      media_type: mediaType,
      search,
    });
    setMedia(results);
  }
  
  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search media..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded"
      />
      
      <div className="grid grid-cols-3 gap-4">
        {media.map((item) => (
          <MediaCard
            key={item.id}
            media={item}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </div>
  );
}
```

## Testing Strategy

### Property-Based Testing with fast-check

All features use property-based testing to verify correctness properties:

```typescript
// Example: Entity position tracking
import fc from 'fast-check';

describe('Entity Position Tracking', () => {
  it('Property 1: Position mutual exclusivity', () => {
    // Feature: entity-tracking-system, Property 1: Position mutual exclusivity
    fc.assert(
      fc.property(
        fc.record({
          current_node_id: fc.option(fc.string(), { nil: null }),
          current_edge_id: fc.option(fc.string(), { nil: null }),
          edge_progress: fc.option(fc.float({ min: 0, max: 1 }), { nil: null }),
        }),
        async (position) => {
          // Create entity with position
          const entity = await createEntity({
            ...position,
            canvas_id: 'test-canvas',
            name: 'Test Entity',
            entity_type: 'test',
          });
          
          // Verify mutual exclusivity
          const atNode = entity.current_node_id !== null;
          const onEdge = entity.current_edge_id !== null && entity.edge_progress !== null;
          const unpositioned = !atNode && !onEdge;
          
          // Exactly one should be true
          expect([atNode, onEdge, unpositioned].filter(Boolean).length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Organization

```
src/
├── lib/
│   ├── engine/
│   │   └── __tests__/
│   │       ├── engine.property.test.ts       # Core architecture properties
│   │       └── workflows.integration.test.ts # Integration tests
│   ├── db/
│   │   └── __tests__/
│   │       ├── entity-position.property.test.ts
│   │       └── webhook-events.property.test.ts
│   └── workers/
│       └── __tests__/
│           ├── claude.property.test.ts
│           └── shotstack.property.test.ts
```

## Key Files Reference

### Core Engine
- `src/lib/engine/edge-walker.ts` - Execution engine
- `src/lib/engine/handlers/` - Node type handlers
- `src/lib/engine/index.ts` - Utility functions

### Database
- `src/lib/db/runs.ts` - Run operations
- `src/lib/db/flows.ts` - Flow operations
- `src/lib/db/entities.ts` - Entity operations
- `src/lib/db/webhook-configs.ts` - Webhook config operations

### Workers
- `src/lib/workers/claude.ts` - Claude integration
- `src/lib/workers/minimax.ts` - MiniMax integration
- `src/lib/workers/elevenlabs.ts` - ElevenLabs integration
- `src/lib/workers/shotstack.ts` - Shotstack integration

### Webhooks
- `src/lib/webhooks/adapters/` - Webhook adapters
- `src/lib/webhooks/processor.ts` - Processing logic
- `src/app/api/webhooks/[endpoint_slug]/route.ts` - Endpoint

### Components
- `src/components/canvas/` - Canvas components
- `src/components/media/` - Media library components
- `src/components/canvas/sections/` - BMC section components

### Types
- `src/types/stitch.ts` - All TypeScript types

This completes the implementation summary covering all major features and their key code highlights.
