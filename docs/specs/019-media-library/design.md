# Design Document

## Overview

The Media Library & Content Workflows feature adds a centralized asset management system to Stitch that enables storage, organization, and reuse of media assets across workflows. The system is architected as two independent but complementary components:

1. **Media Library System**: A standalone storage and metadata management system for media assets (images, videos, audio, documents) that is completely independent of canvases and workflows
2. **Content Workflows**: AI-powered workflows that generate and consume media assets, including wireframe generation and video production pipelines

The Media Library serves as a shared resource pool that any workflow can read from or write to, enabling asset reuse and maintaining a single source of truth for all media content. This design follows Stitch's core principles of database-as-source-of-truth and visual-first philosophy.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MEDIA LIBRARY SYSTEM                            │
│                                                                         │
│  ┌──────────────────────┐         ┌──────────────────────┐            │
│  │  Supabase Storage    │         │  stitch_media Table  │            │
│  │  (stitch-assets)     │◄────────┤  (Metadata)          │            │
│  │                      │         │                      │            │
│  │  - Images            │         │  - IDs & Names       │            │
│  │  - Videos            │         │  - URLs & Paths      │            │
│  │  - Audio             │         │  - Dimensions        │            │
│  │  - Documents         │         │  - Tags & Search     │            │
│  └──────────────────────┘         └──────────────────────┘            │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌───────────────────────┐ ┌───────────────────────┐
        │  Wireframe Workflow   │ │  Video Factory V2     │
        │                       │ │                       │
        │  Script → Parse →     │ │  Select Wireframes →  │
        │  Generate Style →     │ │  Generate Videos →    │
        │  Generate Wireframes  │ │  Generate Voice →     │
        │  ↓                    │ │  Assemble Final       │
        │  WRITES to Library    │ │  READS from Library   │
        └───────────────────────┘ └───────────────────────┘
```

### Data Flow

**Upload Flow (Browser)**:
```
User → File Input → MediaUploader Component → uploadMedia() → 
  Supabase Storage (file) + stitch_media table (metadata) → 
  Media Library UI refresh
```

**Upload Flow (Worker)**:
```
Worker → AI API → URL → uploadFromUrl() → 
  fetch() → Buffer/Stream → Supabase Storage + stitch_media → 
  Return media_id to workflow
```

**Retrieval Flow**:
```
User/Workflow → listMedia(filters) → Query stitch_media → 
  Return metadata with public URLs → Display/Use in workflow
```

### Environment Abstraction

The system must operate in two distinct runtime environments:

1. **Browser Environment**: Uses File, Blob, and DOM APIs for user uploads and previews
2. **Server Environment**: Uses Buffer, Stream, and Node.js APIs for worker-generated content

The media service abstracts these differences through environment detection and conditional API usage.

## Components and Interfaces

### Database Schema

**stitch_media Table**:
```sql
CREATE TABLE stitch_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name text NOT NULL,
  description text,
  
  -- Type categorization
  media_type text NOT NULL CHECK (media_type IN (
    'image', 'wireframe', 'video', 'audio', 'style_reference', 'document'
  )),
  
  -- Storage references
  storage_path text NOT NULL,
  url text NOT NULL,
  thumbnail_path text,
  thumbnail_url text,
  
  -- Technical metadata
  file_size integer,
  mime_type text,
  duration_seconds numeric,
  dimensions jsonb,  -- { width, height }
  
  -- Creative metadata
  metadata jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  
  -- Relationships (optional)
  style_reference_id uuid REFERENCES stitch_media(id),
  source_image_id uuid REFERENCES stitch_media(id),
  
  -- Ownership
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_media_type ON stitch_media(media_type);
CREATE INDEX idx_media_user ON stitch_media(user_id);
CREATE INDEX idx_media_tags ON stitch_media USING GIN(tags);
CREATE INDEX idx_media_search ON stitch_media 
  USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
```

### TypeScript Types

**Core Media Types**:
```typescript
export type MediaType = 
  | 'image' 
  | 'wireframe' 
  | 'video' 
  | 'audio' 
  | 'style_reference' 
  | 'document';

export interface MediaDimensions {
  width: number;
  height: number;
}

export interface MediaMetadata {
  // Generation metadata
  prompt?: string;
  negative_prompt?: string;
  seed?: number;
  model?: string;
  
  // Organizational
  scene_index?: number;
  project_name?: string;
  
  // For style references
  prompt_prefix?: string;
  
  // For audio
  voice_id?: string;
  text?: string;
  
  // Extensible
  [key: string]: any;
}

export interface StitchMedia {
  id: string;
  name: string;
  description?: string;
  media_type: MediaType;
  
  // Storage
  storage_path: string;
  url: string;
  thumbnail_path?: string;
  thumbnail_url?: string;
  
  // Technical
  file_size?: number;
  mime_type?: string;
  duration_seconds?: number;
  dimensions?: MediaDimensions;
  
  // Creative
  metadata: MediaMetadata;
  tags: string[];
  
  // Relationships
  style_reference_id?: string;
  source_image_id?: string;
  
  // Ownership
  user_id: string;
  created_at: string;
  updated_at: string;
}
```

### Media Service API

**Core Operations**:
```typescript
// Browser-compatible upload
uploadMedia(input: MediaUploadInput): Promise<StitchMedia>

// Server-compatible URL upload
uploadFromUrl(
  sourceUrl: string,
  name: string,
  media_type: MediaType,
  metadata?: MediaMetadata
): Promise<StitchMedia>

// Query operations
listMedia(filter: MediaFilter): Promise<StitchMedia[]>
getMedia(id: string): Promise<StitchMedia | null>

// Update operations
updateMedia(id: string, updates: Partial<StitchMedia>): Promise<StitchMedia>
deleteMedia(id: string): Promise<void>

// URL generation
getDownloadUrl(id: string): Promise<string>
```

### React Components

**Component Hierarchy**:
```
MediaLibraryPage
├── MediaFilters (sidebar)
├── MediaGrid
│   └── MediaCard (multiple)
│       ├── Thumbnail
│       ├── TypeBadge
│       └── QuickActions
├── MediaList
│   └── MediaRow (multiple)
└── MediaUploader (modal)
    ├── DragDropZone
    ├── FileInput
    └── UploadProgress

MediaPreviewModal
├── ImageViewer / VideoPlayer / AudioPlayer
├── MetadataDisplay
└── ActionButtons

MediaPicker (embeddable)
├── MediaGrid (filtered)
└── SelectionState
```

### Worker Integration

**Integrated Workers**:
```typescript
// Scene Parser Worker
interface SceneParserInput {
  script: string;
  target_scene_count?: number;
}

interface SceneParserOutput {
  scenes: Scene[];
  total_duration: number;
}

// Wireframe Generator Worker
interface WireframeGeneratorInput {
  scene_description: string;
  style_reference_id?: string;
  scene_index: number;
  project_name?: string;
}

interface WireframeGeneratorOutput {
  wireframe_id: string;
  url: string;
  thumbnail_url: string;
}

// Image-to-Video Worker
interface ImageToVideoInput {
  image_url: string;
  image_id?: string;
  motion_prompt?: string;
  duration_seconds: number;
}

interface ImageToVideoOutput {
  video_id: string;
  url: string;
  duration_seconds: number;
}
```

## Data Models

### Media Asset Model

**Storage Strategy**:
- Files stored in Supabase Storage bucket: `stitch-assets`
- Path structure: `{user_id}/{media_type}/{timestamp}_{filename}`
- Public bucket for MVP (direct URL access)
- Metadata stored in `stitch_media` table

**Metadata Structure**:
- **Technical**: Automatically extracted (dimensions, file size, MIME type, duration)
- **Creative**: User-provided or AI-generated (prompts, tags, descriptions)
- **Relational**: Optional links to source images or style references

**Search and Discovery**:
- Full-text search on name and description
- Tag-based filtering (array overlap)
- Media type filtering
- User ownership filtering

### Workflow Integration Model

**Media Select Node**:
```typescript
interface MediaSelectNodeData extends NodeConfig {
  label: string;
  mediaType?: MediaType;  // Filter picker
  allowMultiple?: boolean;
  selectedMediaId?: string;  // Persisted selection
}

interface MediaSelectNodeOutput {
  media_id: string;
  url: string;
  name: string;
  metadata: MediaMetadata;
}
```

**Worker Output Pattern**:
All content-generating workers follow this pattern:
1. Generate content via external API
2. Download result (URL → Buffer/Stream)
3. Upload to Media Library via `uploadFromUrl()`
4. Return media_id and url in worker output
5. Downstream nodes can reference by ID or use URL directly

## Corre
ctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Upload creates both storage and database records
*For any* valid file upload, the system should create both a file in Supabase Storage at the correct path and a metadata record in the stitch_media table with matching storage_path
**Validates: Requirements 1.1**

Property 2: Media type filtering returns only matching types
*For any* media library with mixed asset types and any media type filter, all returned assets should have media_type matching the filter value
**Validates: Requirements 1.3, 4.3**

Property 3: Search returns assets containing query terms
*For any* media library and any search query string, all returned assets should have the query string present in either their name or description field
**Validates: Requirements 1.4**

Property 4: Tag filtering returns only tagged assets
*For any* media library and any tag filter array, all returned assets should have at least one tag from the filter array in their tags field
**Validates: Requirements 1.5**

Property 5: Download URL generation succeeds for all assets
*For any* asset in the media library, calling getDownloadUrl should return a valid URL string without errors
**Validates: Requirements 2.2**

Property 6: Required metadata fields are populated by type
*For any* image asset, the dimensions and file_size fields should be populated; *for any* video or audio asset, the duration_seconds field should be populated
**Validates: Requirements 2.3, 2.4**

Property 7: Updates persist and modify timestamp
*For any* asset and any valid name or description update, the changes should persist in the database and the updated_at timestamp should be greater than the original created_at timestamp
**Validates: Requirements 3.1**

Property 8: Tag mutations update the array correctly
*For any* asset, adding tags should result in those tags appearing in the tags array, and removing tags should result in those tags being absent from the array
**Validates: Requirements 3.2**

Property 9: Deletion removes all asset artifacts
*For any* asset, after deletion, neither the storage file nor the metadata record should exist, and if a thumbnail exists, it should also be removed
**Validates: Requirements 3.3, 3.4**

Property 10: Authorization restricts asset access
*For any* user, querying the media library should return only assets where the user_id matches the authenticated user's ID
**Validates: Requirements 3.5**

Property 11: Media picker output contains required fields
*For any* asset selected through the media picker, the output should contain media_id, url, name, and metadata fields
**Validates: Requirements 4.2**

Property 12: Media selection persists across workflow runs
*For any* workflow with a media-select node, after selecting an asset and completing the run, re-running the workflow should preserve the selectedMediaId in the node data
**Validates: Requirements 4.5**

Property 13: Scene parser produces valid scene structure
*For any* script input to the scene parser, the output should contain a scenes array where each scene has visual_description and voiceover_text fields
**Validates: Requirements 5.1**

Property 14: Generated assets have correct media type
*For any* style reference generation, the resulting media record should have media_type 'style_reference'; *for any* wireframe generation, media_type should be 'wireframe'; *for any* audio generation, media_type should be 'audio'
**Validates: Requirements 5.2, 6.4**

Property 15: Wireframe metadata includes generation parameters
*For any* wireframe generated by the wireframe worker, the metadata field should contain scene_index and prompt fields
**Validates: Requirements 5.4**

Property 16: Video generation creates source image reference
*For any* video generated from a wireframe, the resulting media record should have source_image_id populated with the wireframe's media ID
**Validates: Requirements 6.3**

Property 17: Worker completion creates media library entry
*For any* content-generating worker (wireframe, video, audio) that completes successfully, a corresponding media record should exist in the stitch_media table
**Validates: Requirements 8.1, 8.2, 8.3**

Property 18: Worker-generated assets include metadata and tags
*For any* asset created by a worker, the metadata field should be non-empty and the tags array should contain at least one tag
**Validates: Requirements 8.4, 8.5**

Property 19: URL upload succeeds for valid URLs
*For any* valid HTTP/HTTPS URL pointing to a media file, uploadFromUrl should successfully fetch the file and create a media record
**Validates: Requirements 9.1**

Property 20: Cross-environment upload compatibility
*For any* media upload operation, the system should successfully complete the upload whether executed in a browser context (using File/Blob) or server context (using Buffer/Stream)
**Validates: Requirements 9.2, 11.2**

Property 21: Invalid URL upload fails gracefully
*For any* invalid or unreachable URL, uploadFromUrl should throw an appropriate error without crashing the system
**Validates: Requirements 9.5**

Property 22: Upload path includes user ID prefix
*For any* uploaded asset, the storage_path field should start with the uploading user's ID
**Validates: Requirements 7.1**

Property 23: Ownership verification prevents unauthorized modifications
*For any* asset and any user who is not the owner, attempts to update or delete the asset should fail with an authorization error
**Validates: Requirements 7.4, 7.5**

Property 24: Metadata loading returns complete records
*For any* set of wireframe IDs selected from the media library, loading their metadata should return complete StitchMedia objects with all fields populated
**Validates: Requirements 6.1**

## Error Handling

### Upload Errors

**File Upload Failures**:
- Invalid file types: Return clear error message indicating unsupported MIME type
- File size exceeded: Return error with size limit information
- Storage quota exceeded: Return error with quota information
- Network failures: Retry with exponential backoff, fail after 3 attempts

**URL Upload Failures**:
- Invalid URL format: Validate URL before fetch, return format error
- Unreachable URL: Timeout after 30 seconds, return network error
- Non-media content: Validate MIME type after fetch, return type error
- Fetch errors: Catch and wrap with descriptive message

### Query Errors

**Database Query Failures**:
- Connection errors: Retry with exponential backoff
- Permission denied: Return authorization error with clear message
- Invalid filter parameters: Validate before query, return validation error
- Timeout: Set query timeout to 10 seconds, return timeout error

### Worker Errors

**Generation Failures**:
- API errors: Log full error, return user-friendly message
- Timeout: Implement polling with max 5 minutes wait
- Invalid output: Validate worker output structure, fail with validation error
- Upload failures: Retry upload 3 times before failing worker

### Authorization Errors

**Access Control**:
- Unauthenticated requests: Return 401 with login redirect
- Unauthorized access: Return 403 with ownership information
- Invalid tokens: Return 401 with token refresh prompt
- RLS policy violations: Log policy name, return generic permission error

## Testing Strategy

### Unit Testing

**Media Service Tests**:
- Test uploadMedia with various file types and sizes
- Test listMedia with different filter combinations
- Test updateMedia with various field updates
- Test deleteMedia and verify cleanup
- Test getDownloadUrl returns valid URLs
- Test uploadFromUrl with mock fetch responses

**Component Tests**:
- Test MediaCard renders correctly with different media types
- Test MediaUploader handles file selection and drag-drop
- Test MediaPicker filters and selection state
- Test MediaPreview displays appropriate viewer for each type

**Worker Tests**:
- Test SceneParser with various script formats
- Test WireframeGenerator with mock API responses
- Test ImageToVideo with polling logic
- Test worker error handling and retries

### Property-Based Testing

**Testing Framework**: Use `fast-check` for TypeScript property-based testing with minimum 100 iterations per property.

**Property Test Implementation**:
Each property-based test MUST be tagged with a comment explicitly referencing the correctness property from this design document using the format: `**Feature: media-library, Property {number}: {property_text}**`

**Test Generators**:
```typescript
// Generate random media types
const mediaTypeArb = fc.constantFrom('image', 'wireframe', 'video', 'audio', 'style_reference', 'document');

// Generate random media metadata
const mediaMetadataArb = fc.record({
  prompt: fc.option(fc.string()),
  scene_index: fc.option(fc.nat()),
  project_name: fc.option(fc.string()),
});

// Generate random StitchMedia objects
const stitchMediaArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1 }),
  media_type: mediaTypeArb,
  storage_path: fc.string(),
  url: fc.webUrl(),
  metadata: mediaMetadataArb,
  tags: fc.array(fc.string()),
  user_id: fc.uuid(),
});

// Generate random file uploads
const fileUploadArb = fc.record({
  name: fc.string({ minLength: 1 }),
  type: fc.constantFrom('image/png', 'video/mp4', 'audio/mp3'),
  size: fc.nat({ max: 50 * 1024 * 1024 }), // Max 50MB
});
```

**Property Test Examples**:
```typescript
// Property 2: Media type filtering
test('Property 2: Media type filtering returns only matching types', () => {
  fc.assert(
    fc.property(
      fc.array(stitchMediaArb),
      mediaTypeArb,
      async (mediaLibrary, filterType) => {
        // Setup: Insert media into test database
        await setupTestMedia(mediaLibrary);
        
        // Execute: Filter by type
        const results = await listMedia({ media_type: filterType });
        
        // Verify: All results match filter
        return results.every(m => m.media_type === filterType);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 9: Deletion removes all artifacts
test('Property 9: Deletion removes all asset artifacts', () => {
  fc.assert(
    fc.property(
      stitchMediaArb,
      async (media) => {
        // Setup: Create media with thumbnail
        const created = await uploadMedia(media);
        
        // Execute: Delete media
        await deleteMedia(created.id);
        
        // Verify: Neither storage nor database record exists
        const dbRecord = await getMedia(created.id);
        const storageExists = await checkStorageExists(created.storage_path);
        
        return dbRecord === null && !storageExists;
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**End-to-End Workflows**:
- Test complete wireframe generation workflow from script to library
- Test video factory workflow reading from and writing to library
- Test media picker integration in workflow execution
- Test cross-environment upload (browser and server)

**Database Integration**:
- Test RLS policies with different user contexts
- Test full-text search with various query patterns
- Test concurrent uploads and queries
- Test transaction rollback on partial failures

**Storage Integration**:
- Test Supabase Storage upload and download
- Test public URL generation
- Test file cleanup on deletion
- Test storage quota handling

## Implementation Notes

### Environment Detection

```typescript
// Detect runtime environment
const isBrowser = typeof window !== 'undefined';
const isServer = typeof process !== 'undefined' && process.versions?.node;

// Use appropriate APIs
if (isBrowser) {
  // Use File, Blob, FileReader
} else if (isServer) {
  // Use Buffer, Stream, fs
}
```

### Async Worker Pattern

All content-generating workers follow this pattern:
1. Mark node as 'running'
2. Call external API (with timeout)
3. Poll for completion (if async API)
4. Download result
5. Upload to Media Library
6. Trigger callback with media_id
7. Mark node as 'completed'

### Storage Path Convention

```
{user_id}/{media_type}/{timestamp}_{sanitized_filename}

Example:
550e8400-e29b-41d4-a716-446655440000/wireframe/1701234567890_scene_1.png
```

### Public vs Private Buckets

**MVP Strategy**: Use public bucket for simplicity
- Direct URL access without signed URLs
- Simpler implementation
- Suitable for non-sensitive content

**Future Enhancement**: Migrate to private bucket
- Generate signed URLs with expiration
- Better security for user content
- Implement in updateMedia to add signed URL generation

### Worker Registry Integration

Register new workers in `src/lib/workers/registry.ts`:
```typescript
import { SceneParserWorker } from './scene-parser';
import { WireframeGeneratorWorker } from './wireframe-generator';
import { ImageToVideoWorker } from './image-to-video';

workerRegistry.register('scene-parser', new SceneParserWorker());
workerRegistry.register('wireframe-generator', new WireframeGeneratorWorker());
workerRegistry.register('image-to-video', new ImageToVideoWorker());
```
