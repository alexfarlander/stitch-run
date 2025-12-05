/**
 * Property-based tests for media service
 * Uses fast-check for property-based testing
 * Tests: Properties 19, 20
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import {
  uploadFromUrl,
  uploadMedia,
} from '../media-service';
import type { MediaType } from '../../../types/media';

// ============================================================================
// Test Setup
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const _supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration - reduced for faster testing
const testConfig = { numRuns: 10 };

// Test user ID (we'll get an existing user from the database)
let testUserId: string;

beforeAll(async () => {
  // Get any existing user from the auth.users table using admin client
  const { data: userData, error } = await supabase.auth.admin.listUsers();
  
  if (error || !userData.users || userData.users.length === 0) {
    // No users exist, create a test user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: `media-test-${Date.now()}@stitch.test`,
      password: 'test-password-123',
      email_confirm: true,
    });
    
    if (createError || !newUser.user) {
      throw new Error(`Failed to create test user: ${createError?.message}`);
    }
    
    testUserId = newUser.user.id;
  } else {
    // Use the first existing user
    testUserId = userData.users[0].id;
  }
  
  console.log(`Using test user ID: ${testUserId}`);
});

// ============================================================================
// Generators for property-based testing
// ============================================================================

/**
 * Generate a valid media type
 */
const mediaTypeArb = fc.constantFrom<MediaType>(
  'image',
  'wireframe',
  'video',
  'audio',
  'style_reference',
  'document'
);

/**
 * Generate a valid filename
 */
const filenameArb = fc.string({ minLength: 1, maxLength: 50 }).map(s => 
  s.replace(/[^a-zA-Z0-9._-]/g, '_') + '.png'
);

/**
 * Generate a valid HTTP URL pointing to an image
 * Using a reliable test image service
 */
const validImageUrlArb = fc.nat({ max: 1000 }).map(n => 
  `https://picsum.photos/seed/${n}/200/300`
);

/**
 * Generate metadata
 */
const metadataArb = fc.record({
  prompt: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  scene_index: fc.option(fc.nat({ max: 100 }), { nil: undefined }),
  project_name: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
});

/**
 * Generate tags array
 */
const tagsArb = fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clean up test media using admin client
 */
async function cleanupMedia(mediaId: string): Promise<void> {
  try {
    // Get media record first
    const { data: media } = await supabase
      .from('stitch_media')
      .select('*')
      .eq('id', mediaId)
      .single();
    
    if (media) {
      // Delete from storage
      const pathsToDelete = [media.storage_path];
      if (media.thumbnail_path) {
        pathsToDelete.push(media.thumbnail_path);
      }
      await supabase.storage.from('stitch-assets').remove(pathsToDelete);
      
      // Delete from database
      await supabase.from('stitch_media').delete().eq('id', mediaId);
    }
  } catch (_error) {
    // Ignore cleanup errors
    console.warn(`Cleanup failed for media ${mediaId}:`, error);
  }
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Media Service Property Tests', () => {
  describe('Property 19: URL upload succeeds for valid URLs', () => {
    it('**Feature: media-library, Property 19: URL upload succeeds for valid URLs**', async () => {
      await fc.assert(
        fc.asyncProperty(
          validImageUrlArb,
          filenameArb,
          mediaTypeArb,
          metadataArb,
          tagsArb,
          async (sourceUrl, name, mediaType, metadata, tags) => {
            let mediaId: string | null = null;

            try {
              // Upload from URL with explicit userId
              const media = await uploadFromUrl(
                sourceUrl,
                name,
                mediaType,
                metadata,
                tags,
                testUserId // Pass userId explicitly for worker context
              );

              mediaId = media.id;

              // Verify media record was created
              expect(media).toBeDefined();
              expect(media.id).toBeDefined();
              expect(media.name).toBe(name);
              expect(media.media_type).toBe(mediaType);
              expect(media.url).toBeDefined();
              expect(media.storage_path).toBeDefined();

              // Verify storage path includes user ID prefix
              expect(media.storage_path).toMatch(/^[a-f0-9-]+\//);

              // Verify metadata and tags are preserved
              expect(media.metadata).toEqual(metadata);
              expect(media.tags).toEqual(tags);

              // Verify we can retrieve the media using admin client
              const { data: retrieved } = await supabase
                .from('stitch_media')
                .select('*')
                .eq('id', media.id)
                .single();
              
              expect(retrieved).not.toBeNull();
              expect(retrieved!.id).toBe(media.id);
              expect(retrieved!.url).toBe(media.url);

              // Verify file size is populated
              expect(media.file_size).toBeGreaterThan(0);
            } finally {
              // Cleanup
              if (mediaId) {
                await cleanupMedia(mediaId);
              }
            }
          }
        ),
        testConfig
      );
    }, 180000); // 180 second timeout for network requests and cloud database
  });

  describe('Property 20: Cross-environment upload compatibility', () => {
    it('**Feature: media-library, Property 20: Cross-environment upload compatibility**', async () => {
      await fc.assert(
        fc.asyncProperty(
          filenameArb,
          mediaTypeArb,
          metadataArb,
          tagsArb,
          fc.constantFrom('blob', 'arraybuffer', 'uint8array'),
          async (name, mediaType, metadata, tags, dataType) => {
            let mediaId: string | null = null;

            try {
              // Create test data in different formats
              let fileData: Blob | ArrayBuffer | Uint8Array;
              const testSize = 1024;
              const buffer = new Uint8Array(testSize);
              for (let i = 0; i < testSize; i++) {
                buffer[i] = Math.floor(Math.random() * 256);
              }

              switch (dataType) {
                case 'blob':
                  fileData = new Blob([buffer], { type: 'image/png' });
                  break;
                case 'arraybuffer':
                  fileData = buffer.buffer;
                  break;
                case 'uint8array':
                  fileData = buffer;
                  break;
              }

              // Upload using uploadMedia with explicit userId
              const media = await uploadMedia({
                file: fileData,
                name,
                media_type: mediaType,
                metadata,
                tags,
              }, testUserId); // Pass userId explicitly

              mediaId = media.id;

              // Verify upload succeeded regardless of data type
              expect(media).toBeDefined();
              expect(media.id).toBeDefined();
              expect(media.name).toBe(name);
              expect(media.media_type).toBe(mediaType);
              expect(media.url).toBeDefined();
              expect(media.storage_path).toBeDefined();

              // Verify file size is correct
              expect(media.file_size).toBe(testSize);

              // Verify we can retrieve the media using admin client
              const { data: retrieved } = await supabase
                .from('stitch_media')
                .select('*')
                .eq('id', media.id)
                .single();
              
              expect(retrieved).not.toBeNull();
              expect(retrieved!.id).toBe(media.id);

              // Verify metadata and tags are preserved
              expect(retrieved!.metadata).toEqual(metadata);
              expect(retrieved!.tags).toEqual(tags);
            } finally {
              // Cleanup
              if (mediaId) {
                await cleanupMedia(mediaId);
              }
            }
          }
        ),
        testConfig
      );
    }, 180000); // 180 second timeout for cloud database with many iterations
  });
});
