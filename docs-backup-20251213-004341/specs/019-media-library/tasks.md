# Implementation Plan

- [x] 1. Set up database schema and storage infrastructure
  - Create Supabase Storage bucket 'stitch-assets' (manual step in Supabase Dashboard)
  - Create migration file for stitch_media table with all fields, indexes, and RLS policies
  - Create storage RLS policies for authenticated user access
  - _Requirements: 1.1, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Create TypeScript types and interfaces
  - Create src/types/media.ts with MediaType, StitchMedia, MediaMetadata, MediaDimensions types
  - Add MediaUploadInput, MediaFilter, and MediaUploadInput interfaces
  - Export all types for use across the application
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 3. Implement core media service with environment abstraction
  - Create src/lib/media/media-service.ts with environment detection
  - Implement uploadMedia() for browser File uploads with dimension extraction
  - Implement uploadFromUrl() for server-side URL uploads using Buffer/Stream
  - Implement listMedia() with filtering by type, tags, and full-text search
  - Implement getMedia(), updateMedia(), deleteMedia() operations
  - Implement getDownloadUrl() for public URL access
  - Add helper functions for image dimension extraction and file sanitization
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 3.1, 3.2, 3.3, 3.4, 9.1, 9.2, 9.5, 11.1, 11.2_

- [ ]* 3.1 Write property test for upload creates storage and database records
  - **Property 1: Upload creates both storage and database records**
  - **Validates: Requirements 1.1**

- [ ]* 3.2 Write property test for media type filtering
  - **Property 2: Media type filtering returns only matching types**
  - **Validates: Requirements 1.3, 4.3**

- [ ]* 3.3 Write property test for search functionality
  - **Property 3: Search returns assets containing query terms**
  - **Validates: Requirements 1.4**

- [ ]* 3.4 Write property test for tag filtering
  - **Property 4: Tag filtering returns only tagged assets**
  - **Validates: Requirements 1.5**

- [ ]* 3.5 Write property test for download URL generation
  - **Property 5: Download URL generation succeeds for all assets**
  - **Validates: Requirements 2.2**

- [ ]* 3.6 Write property test for metadata field population
  - **Property 6: Required metadata fields are populated by type**
  - **Validates: Requirements 2.3, 2.4**

- [ ]* 3.7 Write property test for update persistence
  - **Property 7: Updates persist and modify timestamp**
  - **Validates: Requirements 3.1**

- [ ]* 3.8 Write property test for tag mutations
  - **Property 8: Tag mutations update the array correctly**
  - **Validates: Requirements 3.2**

- [ ]* 3.9 Write property test for deletion cleanup
  - **Property 9: Deletion removes all asset artifacts**
  - **Validates: Requirements 3.3, 3.4**

- [ ]* 3.10 Write property test for authorization
  - **Property 10: Authorization restricts asset access**
  - **Validates: Requirements 3.5**

- [x] 3.11 Write property test for URL upload
  - **Property 19: URL upload succeeds for valid URLs**
  - **Validates: Requirements 9.1**

- [x] 3.12 Write property test for cross-environment compatibility
  - **Property 20: Cross-environment upload compatibility**
  - **Validates: Requirements 9.2, 11.2**

- [ ]* 3.13 Write property test for invalid URL handling
  - **Property 21: Invalid URL upload fails gracefully**
  - **Validates: Requirements 9.5**

- [ ]* 3.14 Write property test for upload path structure
  - **Property 22: Upload path includes user ID prefix**
  - **Validates: Requirements 7.1**

- [ ]* 3.15 Write property test for ownership verification
  - **Property 23: Ownership verification prevents unauthorized modifications**
  - **Validates: Requirements 7.4, 7.5**

- [x] 4. Create useMediaLibrary React hook
  - Create src/hooks/useMediaLibrary.ts with state management
  - Implement upload, remove, update, download, refresh actions
  - Add filter state management with setFilter
  - Handle loading and error states
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.2, 3.1, 3.2, 3.3_

- [x] 5. Build media library UI components
  - Create src/components/media/MediaCard.tsx with thumbnail, type badge, and quick actions
  - Create src/components/media/MediaGrid.tsx with responsive grid layout
  - Create src/components/media/MediaList.tsx with table view
  - Create src/components/media/MediaUploader.tsx with drag-drop and file input
  - Create src/components/media/MediaPreview.tsx with type-specific viewers
  - Add loading skeletons and empty states
  - _Requirements: 1.2, 2.1, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 6. Create media library page
  - Create src/app/library/page.tsx with layout and view toggle
  - Add filter sidebar with type, search, and tag filters
  - Integrate MediaGrid and MediaList components
  - Add upload button that opens MediaUploader modal
  - Implement MediaPreview modal for asset details
  - Add download, copy URL, edit, and delete actions
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.5, 3.1, 3.2, 3.3_

- [x] 7. Create MediaPicker component for workflow integration
  - Create src/components/media/MediaPicker.tsx with selection state
  - Add media type filtering prop
  - Implement single and multiple selection modes
  - Add onSelect callback with selected media data
  - Style for embedding in workflow panels
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Implement MediaSelectNode for workflows
  - Create src/components/canvas/nodes/MediaSelectNode.tsx
  - Add node configuration for mediaType filter and allowMultiple
  - Implement selectedMediaId persistence in node data
  - Show thumbnail preview of selected media
  - Add "Select from Library" button that opens MediaPicker
  - Output media_id, url, name, and metadata on selection
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 8.1 Write property test for media picker output structure
  - **Property 11: Media picker output contains required fields**
  - **Validates: Requirements 4.2**

- [ ]* 8.2 Write property test for selection persistence
  - **Property 12: Media selection persists across workflow runs**
  - **Validates: Requirements 4.5**

- [x] 9. Create Scene Parser worker
  - Create src/lib/workers/scene-parser.ts implementing IWorker
  - Use Claude API to parse script into scenes array
  - Extract visual_description and voiceover_text for each scene
  - Validate scene structure before returning
  - Handle parsing errors gracefully
  - Register worker in worker registry
  - _Requirements: 5.1_

- [x] 9.1 Write property test for scene parser output structure
  - **Property 13: Scene parser produces valid scene structure**
  - **Validates: Requirements 5.1**

- [x] 10. Create Wireframe Generator worker
  - Create src/lib/workers/wireframe-generator.ts implementing IWorker
  - Implement adapter pattern for image generation APIs (Ideogram, DALL-E, Mock)
  - Build prompt from scene_description and style_reference
  - Call image generation API with timeout and retry logic
  - Download generated image from API response URL
  - Upload to Media Library using uploadFromUrl with type 'wireframe'
  - Include scene_index and prompt in metadata
  - Tag with 'wireframe', 'ai-generated', and project_name
  - Return wireframe_id and url in callback
  - Register worker in worker registry
  - _Requirements: 5.2, 5.4, 8.1, 8.4, 8.5_

- [ ]* 10.1 Write property test for wireframe media type
  - **Property 14: Generated assets have correct media type (wireframe)**
  - **Validates: Requirements 5.2**

- [ ]* 10.2 Write property test for wireframe metadata
  - **Property 15: Wireframe metadata includes generation parameters**
  - **Validates: Requirements 5.4**

- [x] 10.3 Write property test for worker creates media entry
  - **Property 17: Worker completion creates media library entry (wireframe)**
  - **Validates: Requirements 8.1**

- [ ]* 10.4 Write property test for worker metadata and tags
  - **Property 18: Worker-generated assets include metadata and tags**
  - **Validates: Requirements 8.4, 8.5**

- [ ] 11. Create Image-to-Video worker
  - Create src/lib/workers/image-to-video.ts implementing IWorker
  - Implement adapter pattern for video APIs (Runway, Pika, Kling, Mock)
  - Call image-to-video API with image_url and motion_prompt
  - Implement polling logic for async API completion (max 5 minutes)
  - Download generated video from API response
  - Upload to Media Library using uploadFromUrl with type 'video'
  - Set source_image_id to reference the input wireframe
  - Include motion_prompt and model in metadata
  - Return video_id and url in callback
  - Register worker in worker registry
  - _Requirements: 6.2, 6.3, 6.6, 8.2, 8.4, 8.5_

- [ ]* 11.1 Write property test for video source image reference
  - **Property 16: Video generation creates source image reference**
  - **Validates: Requirements 6.3**

- [ ]* 11.2 Write property test for worker creates video entry
  - **Property 17: Worker completion creates media library entry (video)**
  - **Validates: Requirements 8.2**

- [x] 12. Create Wireframe Generation workflow seed
  - Create src/lib/seeds/wireframe-workflow.ts
  - Define workflow with nodes: Script Input (UX) → Parse Scenes (Worker) → Style Setup (UX) → Generate Style Reference (Worker) → Style Approval (UX) → Scene Splitter → Wireframe Generator (parallel) → Scene Collector → Wireframe Review (UX)
  - Configure Scene Splitter to split scenes array
  - Configure Wireframe Generator nodes with style_reference_id input
  - Configure Scene Collector to wait for all wireframes
  - Add seed function to insert workflow into database
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 13. Create Video Factory V2 workflow seed
  - Create src/lib/seeds/video-factory-v2.ts
  - Define workflow with nodes: Select Wireframes (MediaSelect) → Load Wireframes (Worker) → Voice Settings (UX) → Scene Splitter → [Generate Video (Worker) + Generate Voice (Worker) + Mix Scene (Worker)] (parallel) → Scene Collector → Music Selection (MediaSelect) → Final Assembly (Worker) → Final Review (UX)
  - Configure MediaSelect nodes to filter by media_type
  - Configure parallel scene processing with splitter/collector
  - Configure Final Assembly to concatenate videos
  - Add seed function to insert workflow into database
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 13.1 Write property test for metadata loading
  - **Property 24: Metadata loading returns complete records**
  - **Validates: Requirements 6.1**

- [x] 14. Add navigation and integration
  - Add Media Library link to main navigation
  - Update workflow node type registry to include MediaSelectNode
  - Add media library icon and styling
  - Test end-to-end workflow from upload to workflow usage
  - _Requirements: 1.2, 4.1_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
