# Media Library Setup Guide

This guide covers the setup steps for the Media Library feature, including database migration and storage bucket creation.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Local Supabase instance running OR access to production Supabase project
- Environment variables configured in `.env.local`

## Setup Steps

### 1. Create Storage Bucket (Manual Step)

The `stitch-assets` storage bucket must be created manually in the Supabase Dashboard.

#### For Local Development:

1. Open Supabase Studio: `http://localhost:54323` (or your local Supabase URL)
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `stitch-assets`
   - **Public bucket**: ✅ Enabled (for MVP - allows direct URL access)
   - **File size limit**: 50 MB (recommended)
   - **Allowed MIME types**: Leave empty or specify: `image/*,video/*,audio/*,application/pdf`
5. Click **Create bucket**

#### For Production:

1. Go to your Supabase project dashboard at [supabase.com](https://supabase.com)
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket (same settings as above)
5. Click **Create bucket**

### 2. Apply Database Migration

The migration file `009_media_library.sql` creates:
- `stitch_media` table with all required fields
- Indexes for efficient queries (type, user, tags, full-text search)
- Row Level Security (RLS) policies for user data protection
- Storage RLS policies for file access control
- Automatic `updated_at` trigger
- Realtime publication for live updates

#### For Local Development:

```bash
# Reset database and apply all migrations (including 009)
cd stitch-run
supabase db reset
```

#### For Production:

```bash
# Link to your project (first time only)
cd stitch-run
supabase link --project-ref your-project-ref

# Push the new migration
supabase db push
```

### 3. Verify Setup

After applying the migration, verify the setup:

#### Check Table Creation:

```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'stitch_media';
```

#### Check Indexes:

```sql
-- Run in Supabase SQL Editor
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'stitch_media';
```

Expected indexes:
- `idx_stitch_media_type`
- `idx_stitch_media_user`
- `idx_stitch_media_tags`
- `idx_stitch_media_search`
- `idx_stitch_media_style_reference`
- `idx_stitch_media_source_image`
- `idx_stitch_media_created_at`

#### Check RLS Policies:

```sql
-- Run in Supabase SQL Editor
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'stitch_media';
```

Expected policies:
- `Users can view own media` (SELECT)
- `Users can insert own media` (INSERT)
- `Users can update own media` (UPDATE)
- `Users can delete own media` (DELETE)

#### Check Storage Bucket:

1. Navigate to **Storage** in Supabase Dashboard
2. Verify `stitch-assets` bucket exists
3. Check bucket is set to **Public** (for MVP)

#### Check Storage Policies:

```sql
-- Run in Supabase SQL Editor
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%stitch-assets%';
```

Expected storage policies:
- `Authenticated users can upload to own folder`
- `Authenticated users can view own files`
- `Authenticated users can update own files`
- `Authenticated users can delete own files`

### 4. Test Upload (Optional)

You can test the setup by uploading a file through the Supabase Dashboard:

1. Navigate to **Storage** > `stitch-assets`
2. Create a test folder: `test-user-id/image/`
3. Upload a test image
4. Verify you can access the file via the public URL

## Storage Path Structure

Files are organized using this path structure:
```
{user_id}/{media_type}/{timestamp}_{filename}

Example:
550e8400-e29b-41d4-a716-446655440000/wireframe/1701234567890_scene_1.png
```

This structure:
- Isolates user files by user_id
- Organizes by media_type for easier management
- Uses timestamp prefix to prevent filename collisions
- Enables RLS policies to verify ownership via path

## Security Notes

### MVP Configuration (Current):
- **Public bucket**: Enabled for direct URL access
- **RLS policies**: Enforce user ownership via path structure
- **Authentication**: Required for all operations

### Production Considerations (Future):
- Consider migrating to **private bucket** with signed URLs
- Implement signed URL generation with expiration
- Add rate limiting for uploads
- Monitor storage usage and implement quotas

## Troubleshooting

### Migration Fails

If the migration fails, check:
1. All previous migrations (001-008) are applied
2. The `update_updated_at_column()` function exists (created in earlier migrations)
3. The `auth.users` table exists (Supabase built-in)

### Storage Policies Not Working

If storage policies fail:
1. Verify the bucket name is exactly `stitch-assets`
2. Check that `storage.foldername()` function is available (Supabase built-in)
3. Ensure user is authenticated when testing

### RLS Policies Too Restrictive

For development/testing, you can temporarily use public access:

```sql
-- DEVELOPMENT ONLY - Remove in production
DROP POLICY IF EXISTS "Users can view own media" ON stitch_media;
DROP POLICY IF EXISTS "Users can insert own media" ON stitch_media;
DROP POLICY IF EXISTS "Users can update own media" ON stitch_media;
DROP POLICY IF EXISTS "Users can delete own media" ON stitch_media;

CREATE POLICY "Public Media Access" ON stitch_media 
FOR ALL 
USING (true) 
WITH CHECK (true);
```

## Next Steps

After completing this setup:
1. ✅ Database schema is ready
2. ✅ Storage bucket is configured
3. ✅ RLS policies are active
4. → Proceed to implement TypeScript types (`src/types/media.ts`)
5. → Implement media service (`src/lib/media/media-service.ts`)
6. → Build UI components

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
