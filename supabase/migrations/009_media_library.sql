-- Migration 009: Media Library System
-- Adds stitch_media table for centralized asset management
-- Includes storage RLS policies for authenticated user access

-- ============================================================================
-- PART 1: Create stitch_media table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stitch_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name TEXT NOT NULL,
  description TEXT,
  
  -- Type categorization
  media_type TEXT NOT NULL CHECK (media_type IN (
    'image', 'wireframe', 'video', 'audio', 'style_reference', 'document'
  )),
  
  -- Storage references
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_path TEXT,
  thumbnail_url TEXT,
  
  -- Technical metadata
  file_size INTEGER,
  mime_type TEXT,
  duration_seconds NUMERIC,
  dimensions JSONB,  -- { width, height }
  
  -- Creative metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  
  -- Relationships (optional)
  style_reference_id UUID REFERENCES stitch_media(id) ON DELETE SET NULL,
  source_image_id UUID REFERENCES stitch_media(id) ON DELETE SET NULL,
  
  -- Ownership
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: Create indexes for efficient queries
-- ============================================================================

-- Index for filtering by media type
CREATE INDEX IF NOT EXISTS idx_stitch_media_type 
ON stitch_media(media_type);

-- Index for filtering by user
CREATE INDEX IF NOT EXISTS idx_stitch_media_user 
ON stitch_media(user_id);

-- GIN index for tag array queries
CREATE INDEX IF NOT EXISTS idx_stitch_media_tags 
ON stitch_media USING GIN(tags);

-- GIN index for full-text search on name and description
CREATE INDEX IF NOT EXISTS idx_stitch_media_search 
ON stitch_media USING GIN(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- Index for style reference relationships
CREATE INDEX IF NOT EXISTS idx_stitch_media_style_reference 
ON stitch_media(style_reference_id) WHERE style_reference_id IS NOT NULL;

-- Index for source image relationships
CREATE INDEX IF NOT EXISTS idx_stitch_media_source_image 
ON stitch_media(source_image_id) WHERE source_image_id IS NOT NULL;

-- Index for created_at for sorting
CREATE INDEX IF NOT EXISTS idx_stitch_media_created_at 
ON stitch_media(created_at DESC);

-- ============================================================================
-- PART 3: Add trigger for automatic updated_at updates
-- ============================================================================

-- Reuse the existing update_updated_at_column function
CREATE TRIGGER update_stitch_media_updated_at
  BEFORE UPDATE ON stitch_media
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 4: Enable Row Level Security policies
-- ============================================================================

-- Enable RLS on stitch_media table
ALTER TABLE stitch_media ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own media
CREATE POLICY "Users can view own media" ON stitch_media
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own media
CREATE POLICY "Users can insert own media" ON stitch_media
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own media
CREATE POLICY "Users can update own media" ON stitch_media
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own media
CREATE POLICY "Users can delete own media" ON stitch_media
FOR DELETE
USING (auth.uid() = user_id);

-- HACKATHON MODE: Allow public access for development (comment out above policies if needed)
-- CREATE POLICY "Public Media Access" ON stitch_media 
-- FOR ALL 
-- USING (true) 
-- WITH CHECK (true);

-- ============================================================================
-- PART 5: Storage RLS Policies for stitch-assets bucket
-- ============================================================================

-- Note: Storage bucket 'stitch-assets' must be created manually in Supabase Dashboard
-- These policies assume the bucket exists and is configured as public or private

-- Policy: Authenticated users can upload to their own folder
-- Path structure: {user_id}/{media_type}/{timestamp}_{filename}
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stitch-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Authenticated users can view their own files
CREATE POLICY "Authenticated users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'stitch-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Authenticated users can update their own files
CREATE POLICY "Authenticated users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stitch-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'stitch-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Authenticated users can delete their own files
CREATE POLICY "Authenticated users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'stitch-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- HACKATHON MODE: Allow public read access to all files in stitch-assets
-- Uncomment if bucket is set to public and you want unrestricted read access
-- CREATE POLICY "Public can view stitch-assets"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'stitch-assets');

-- ============================================================================
-- PART 6: Add table to Supabase realtime publication
-- ============================================================================

-- Add stitch_media to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE stitch_media;
