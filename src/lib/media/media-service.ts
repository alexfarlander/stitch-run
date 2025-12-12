/**
 * Media Service
 * 
 * Core service for managing media assets in the Stitch Media Library.
 * Supports both browser and server environments with automatic detection.
 */

import { supabase, getAdminClient } from '../supabase/client';
import type {
  StitchMedia,
  MediaUploadInput,
  MediaFilter,
  MediaType,
  MediaMetadata,
  MediaDimensions,
} from '../../types/media';

// Environment detection
const isBrowser = typeof window !== 'undefined';
const isServer = typeof process !== 'undefined' && process.versions?.node;

// Storage bucket name
const STORAGE_BUCKET = 'stitch-assets';

/**
 * Sanitize filename to remove special characters and spaces
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

/**
 * Extract image dimensions from a File or Blob (browser only)
 */
async function extractImageDimensions(file: File | Blob): Promise<MediaDimensions | undefined> {
  if (!isBrowser) return undefined;
  
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    
    img.src = url;
  });
}

/**
 * Generate storage path for a media file
 */
function generateStoragePath(
  userId: string,
  mediaType: MediaType,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(filename);
  return `${userId}/${mediaType}/${timestamp}_${sanitized}`;
}

/**
 * Get current authenticated user ID
 */
async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  
  return user.id;
}

/**
 * Upload media from browser (File/Blob)
 * NOTE: Can optionally accept explicit userId for server-side usage
 */
export async function uploadMedia(input: MediaUploadInput, userId?: string): Promise<StitchMedia> {
  const finalUserId = userId || await getCurrentUserId();
  
  // Use admin client if userId is explicitly provided (worker context)
  const client = userId ? getAdminClient() : supabase;
  
  // Generate storage path
  const storagePath = generateStoragePath(finalUserId, input.media_type, input.name);
  
  // Extract dimensions for images (browser only)
  let dimensions: MediaDimensions | undefined;
  if (isBrowser && (input.media_type === 'image' || input.media_type === 'wireframe' || input.media_type === 'style_reference')) {
    if (input.file instanceof File || input.file instanceof Blob) {
      dimensions = await extractImageDimensions(input.file);
    }
  }
  
  // Determine file size and mime type
  let fileSize: number | undefined;
  let mimeType: string | undefined;
  
  // Guard browser types to prevent Node.js crashes
  if (isBrowser) {
    if (input.file instanceof File) {
      fileSize = input.file.size;
      mimeType = input.file.type;
    } else if (input.file instanceof Blob) {
      fileSize = input.file.size;
      mimeType = input.file.type;
    }
  }
  
  // Handle ArrayBuffer and Uint8Array (works in both environments)
  if (input.file instanceof ArrayBuffer) {
    fileSize = input.file.byteLength;
  } else if (input.file instanceof Uint8Array) {
    fileSize = input.file.byteLength;
  }
  
  // Fallback: check if it has a size property (for Blob-like objects in Node)
  const fileAny = input.file as any;
  if (!fileSize && typeof fileAny?.size === 'number') {
    fileSize = fileAny.size;
  }
  if (!mimeType && typeof fileAny?.type === 'string') {
    mimeType = fileAny.type;
  }
  
  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError} = await client.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, input.file, {
      contentType: mimeType,
      upsert: false,
    });
  
  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }
  
  // Get public URL
  const { data: urlData } = client.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);
  
  const publicUrl = urlData.publicUrl;
  
  // Create metadata record
  const mediaRecord = {
    name: input.name,
    description: input.description,
    media_type: input.media_type,
    storage_path: storagePath,
    url: publicUrl,
    file_size: fileSize,
    mime_type: mimeType,
    dimensions: dimensions,
    metadata: input.metadata || {},
    tags: input.tags || [],
    user_id: finalUserId,
  };
  
  const { data: insertData, error: insertError } = await client
    .from('stitch_media')
    .insert(mediaRecord)
    .select()
    .single();
  
  if (insertError) {
    // Cleanup: delete uploaded file if database insert fails
    await client.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(`Database insert failed: ${insertError.message}`);
  }
  
  return insertData as StitchMedia;
}

/**
 * Upload media from URL (server-side, uses fetch)
 * IMPORTANT: Workers MUST pass userId as they lack an auth session
 */
export async function uploadFromUrl(
  sourceUrl: string,
  name: string,
  media_type: MediaType,
  metadata?: MediaMetadata,
  tags?: string[],
  userId?: string // <--- Added parameter
): Promise<StitchMedia> {
  // Use provided ID or fall back to session (session fails in workers)
  const finalUserId = userId || await getCurrentUserId();
  
  // Use admin client if userId is explicitly provided (worker context)
  const client = userId ? getAdminClient() : supabase;
  
  // Fetch file from URL
  let response: Response;
  try {
    response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`URL fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Get file data as ArrayBuffer (works in both browser and server)
  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get('content-type') || undefined;
  const fileSize = arrayBuffer.byteLength;
  
  // Generate storage path
  const storagePath = generateStoragePath(finalUserId, media_type, name);
  
  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mimeType,
      upsert: false,
    });
  
  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }
  
  // Get public URL
  const { data: urlData } = client.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);
  
  const publicUrl = urlData.publicUrl;
  
  // Create metadata record
  const mediaRecord = {
    name,
    media_type,
    storage_path: storagePath,
    url: publicUrl,
    file_size: fileSize,
    mime_type: mimeType,
    metadata: metadata || {},
    tags: tags || [],
    user_id: finalUserId,
  };
  
  const { data: insertData, error: insertError } = await client
    .from('stitch_media')
    .insert(mediaRecord)
    .select()
    .single();
  
  if (insertError) {
    // Cleanup: delete uploaded file if database insert fails
    await client.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(`Database insert failed: ${insertError.message}`);
  }
  
  return insertData as StitchMedia;
}

/**
 * List media with optional filtering
 */
export async function listMedia(filter?: MediaFilter): Promise<StitchMedia[]> {
  let query = supabase
    .from('stitch_media')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Apply filters
  if (filter?.media_type) {
    query = query.eq('media_type', filter.media_type);
  }
  
  if (filter?.user_id) {
    query = query.eq('user_id', filter.user_id);
  }
  
  if (filter?.tags && filter.tags.length > 0) {
    query = query.overlaps('tags', filter.tags);
  }
  
  if (filter?.search) {
    // Use full-text search
    query = query.textSearch('name', filter.search, {
      type: 'websearch',
      config: 'english',
    });
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to list media: ${error.message}`);
  }
  
  return (data || []) as StitchMedia[];
}

/**
 * Get a single media asset by ID
 */
export async function getMedia(id: string): Promise<StitchMedia | null> {
  const { data, error } = await supabase
    .from('stitch_media')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get media: ${error.message}`);
  }
  
  return data as StitchMedia;
}

/**
 * Update media metadata
 */
export async function updateMedia(
  id: string,
  updates: Partial<Pick<StitchMedia, 'name' | 'description' | 'tags' | 'metadata'>>
): Promise<StitchMedia> {
  const { data, error } = await supabase
    .from('stitch_media')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update media: ${error.message}`);
  }
  
  return data as StitchMedia;
}

/**
 * Delete media asset (removes both storage file and database record)
 */
export async function deleteMedia(id: string): Promise<void> {
  // Get media record first to get storage paths
  const media = await getMedia(id);
  
  if (!media) {
    throw new Error('Media not found');
  }
  
  // Delete from storage
  const pathsToDelete = [media.storage_path];
  if (media.thumbnail_path) {
    pathsToDelete.push(media.thumbnail_path);
  }
  
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(pathsToDelete);
  
  if (storageError) {
    console.error('Storage deletion failed:', storageError);
    // Continue with database deletion even if storage fails
  }
  
  // Delete from database
  const { error: dbError } = await supabase
    .from('stitch_media')
    .delete()
    .eq('id', id);
  
  if (dbError) {
    throw new Error(`Failed to delete media: ${dbError.message}`);
  }
}

/**
 * Get download URL for a media asset
 */
export async function getDownloadUrl(id: string): Promise<string> {
  const media = await getMedia(id);
  
  if (!media) {
    throw new Error('Media not found');
  }
  
  // For public bucket, return the public URL directly
  return media.url;
}
