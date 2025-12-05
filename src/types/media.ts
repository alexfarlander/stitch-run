/**
 * Media Library Types
 * 
 * Type definitions for the Stitch Media Library system.
 * These types support centralized asset management across workflows.
 */

/**
 * Media type categorization for assets in the library
 */
export type MediaType = 
  | 'image' 
  | 'wireframe' 
  | 'video' 
  | 'audio' 
  | 'style_reference' 
  | 'document';

/**
 * Dimensions for image and video assets
 */
export interface MediaDimensions {
  width: number;
  height: number;
}

/**
 * Extensible metadata for media assets
 * Includes generation parameters, organizational info, and custom fields
 */
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
  
  // Extensible for custom metadata
  [key: string]: unknown;
}

/**
 * Complete media asset record from the database
 */
export interface StitchMedia {
  // Identity
  id: string;
  name: string;
  description?: string;
  media_type: MediaType;
  
  // Storage references
  storage_path: string;
  url: string;
  thumbnail_path?: string;
  thumbnail_url?: string;
  
  // Technical metadata
  file_size?: number;
  mime_type?: string;
  duration_seconds?: number;
  dimensions?: MediaDimensions;
  
  // Creative metadata
  metadata: MediaMetadata;
  tags: string[];
  
  // Relationships (optional)
  style_reference_id?: string;
  source_image_id?: string;
  
  // Ownership
  user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Input for uploading media.
 * Supports Browser (File/Blob) and Server (ArrayBuffer/Buffer) environments.
 */
export interface MediaUploadInput {
  file: File | Blob | ArrayBuffer | Uint8Array; // Broader type definition
  name: string; // Name is now required because Blobs/Buffers don't have a built-in .name property
  description?: string;
  media_type: MediaType;
  metadata?: MediaMetadata;
  tags?: string[];
}

/**
 * Filter options for querying media assets
 */
export interface MediaFilter {
  media_type?: MediaType;
  tags?: string[];
  search?: string;
  user_id?: string;
}
