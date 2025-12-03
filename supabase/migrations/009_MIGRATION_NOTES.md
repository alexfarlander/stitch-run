# Migration 009: Media Library - Implementation Notes

## What This Migration Does

This migration sets up the complete database infrastructure for the Media Library feature:

### 1. Database Table: `stitch_media`

Creates a comprehensive media asset table with:
- **Identity fields**: name, description
- **Type categorization**: media_type (image, wireframe, video, audio, style_reference, document)
- **Storage references**: storage_path, url, thumbnail_path, thumbnail_url
- **Technical metadata**: file_size, mime_type, duration_seconds, dimensions (JSONB)
- **Creative metadata**: metadata (JSONB), tags (text array)
- **Relationships**: style_reference_id, source_image_id (self-referencing)
- **Ownership**: user_id (references auth.users)
- **Timestamps**: created_at, updated_at (auto-managed)

### 2. Performance Indexes

Creates 7 indexes for efficient queries:
- `idx_stitch_media_type`: Filter by media type
- `idx_stitch_media_user`: Filter by user
- `idx_stitch_media_tags`: GIN index for tag array queries
- `idx_stitch_media_search`: GIN index for full-text search on name/description
- `idx_stitch_media_style_reference`: Partial index for style reference relationships
- `idx_stitch_media_source_image`: Partial index for source image relationships
- `idx_stitch_media_created_at`: Sort by creation date

### 3. Row Level Security (RLS) Policies

Implements user-based access control:
- **SELECT**: Users can view only their own media
- **INSERT**: Users can insert only with their own user_id
- **UPDATE**: Users can update only their own media
- **DELETE**: Users can delete only their own media

### 4. Storage RLS Policies

Implements file-level access control for the `stitch-assets` bucket:
- **INSERT**: Authenticated users can upload to `{user_id}/*` paths only
- **SELECT**: Authenticated users can view files in their own folder
- **UPDATE**: Authenticated users can update files in their own folder
- **DELETE**: Authenticated users can delete files in their own folder

### 5. Automatic Triggers

- **updated_at trigger**: Automatically updates the `updated_at` timestamp on any row update

### 6. Realtime Support

- Adds `stitch_media` table to Supabase realtime publication for live UI updates

## Requirements Validated

This migration satisfies the following requirements from the spec:

- **Requirement 1.1**: Storage and metadata creation ✅
- **Requirement 7.1**: User ID prefix in storage path ✅
- **Requirement 7.2**: Authentication verification ✅
- **Requirement 7.3**: User ID association ✅
- **Requirement 7.4**: Ownership verification for deletion ✅
- **Requirement 7.5**: Ownership verification for updates ✅

## Manual Steps Required

⚠️ **IMPORTANT**: Before applying this migration, you must:

1. **Create the `stitch-assets` storage bucket** in Supabase Dashboard
   - Navigate to Storage > New bucket
   - Name: `stitch-assets`
   - Public: ✅ Enabled (for MVP)
   - File size limit: 50 MB (recommended)

See [MEDIA_LIBRARY_SETUP.md](../MEDIA_LIBRARY_SETUP.md) for detailed instructions.

## Applying the Migration

### Local Development:
```bash
cd stitch-run
supabase db reset
```

### Production:
```bash
cd stitch-run
supabase link --project-ref your-project-ref
supabase db push
```

## Verification Queries

After applying, verify with these SQL queries:

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'stitch_media';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'stitch_media';

-- Check RLS policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'stitch_media';

-- Check storage policies
SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%stitch-assets%';
```

## Security Model

### Path-Based Ownership
Files are stored with this structure:
```
{user_id}/{media_type}/{timestamp}_{filename}
```

The RLS policies use `storage.foldername(name)[1]` to extract the user_id from the path and verify ownership.

### Public vs Private Bucket

**Current (MVP)**: Public bucket
- Direct URL access without signed URLs
- Simpler implementation
- RLS still enforces ownership for modifications

**Future**: Private bucket
- Generate signed URLs with expiration
- Better security for sensitive content
- Requires code changes in media service

## Rollback

If you need to rollback this migration:

```sql
-- Drop storage policies
DROP POLICY IF EXISTS "Authenticated users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;

-- Drop table (cascades to indexes and triggers)
DROP TABLE IF EXISTS stitch_media CASCADE;

-- Remove from realtime
ALTER PUBLICATION supabase_realtime DROP TABLE stitch_media;
```

## Next Steps

After this migration is applied:
1. ✅ Database schema ready
2. ✅ Storage bucket configured
3. → Implement TypeScript types (Task 2)
4. → Implement media service (Task 3)
5. → Build UI components (Tasks 4-6)
