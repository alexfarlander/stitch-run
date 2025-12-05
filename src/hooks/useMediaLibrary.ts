/**
 * useMediaLibrary Hook
 * 
 * React hook for managing media library state and operations.
 * Provides upload, remove, update, download, and refresh actions with loading/error states.
 * 
 * Requirements: 1.1, 1.3, 1.4, 1.5, 2.2, 3.1, 3.2, 3.3
 */

import { useState, useCallback, useEffect } from 'react';
import type { StitchMedia, MediaUploadInput, MediaFilter } from '../types/media';
import {
  uploadMedia,
  listMedia,
  updateMedia as updateMediaService,
  deleteMedia,
  getDownloadUrl,
} from '../lib/media/media-service';

interface UseMediaLibraryState {
  media: StitchMedia[];
  loading: boolean;
  error: string | null;
  filter: MediaFilter;
}

interface UseMediaLibraryActions {
  upload: (input: MediaUploadInput) => Promise<StitchMedia>;
  remove: (id: string) => Promise<void>;
  update: (id: string, updates: Partial<Pick<StitchMedia, 'name' | 'description' | 'tags' | 'metadata'>>) => Promise<StitchMedia>;
  download: (id: string) => Promise<string>;
  refresh: () => Promise<void>;
  setFilter: (filter: MediaFilter) => void;
}

export type UseMediaLibraryReturn = UseMediaLibraryState & UseMediaLibraryActions;

/**
 * Hook for managing media library operations
 * 
 * @param initialFilter - Optional initial filter to apply
 * @param autoLoad - Whether to automatically load media on mount (default: true)
 * @returns Media library state and actions
 */
export function useMediaLibrary(
  initialFilter: MediaFilter = {},
  autoLoad: boolean = true
): UseMediaLibraryReturn {
  const [state, setState] = useState<UseMediaLibraryState>({
    media: [],
    loading: false,
    error: null,
    filter: initialFilter,
  });

  /**
   * Load media from the library with current filter
   */
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const mediaList = await listMedia(state.filter);
      setState(prev => ({
        ...prev,
        media: mediaList,
        loading: false,
      }));
    } catch (_err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load media';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    }
  }, [state.filter]);

  /**
   * Upload new media to the library
   */
  const upload = useCallback(async (input: MediaUploadInput): Promise<StitchMedia> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const newMedia = await uploadMedia(input);
      
      // Add to local state
      setState(prev => ({
        ...prev,
        media: [newMedia, ...prev.media],
        loading: false,
      }));
      
      return newMedia;
    } catch (_err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload media';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      throw err;
    }
  }, []);

  /**
   * Remove media from the library
   */
  const remove = useCallback(async (id: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await deleteMedia(id);
      
      // Remove from local state
      setState(prev => ({
        ...prev,
        media: prev.media.filter(m => m.id !== id),
        loading: false,
      }));
    } catch (_err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove media';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      throw err;
    }
  }, []);

  /**
   * Update media metadata
   */
  const update = useCallback(async (
    id: string,
    updates: Partial<Pick<StitchMedia, 'name' | 'description' | 'tags' | 'metadata'>>
  ): Promise<StitchMedia> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const updatedMedia = await updateMediaService(id, updates);
      
      // Update in local state
      setState(prev => ({
        ...prev,
        media: prev.media.map(m => m.id === id ? updatedMedia : m),
        loading: false,
      }));
      
      return updatedMedia;
    } catch (_err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update media';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      throw err;
    }
  }, []);

  /**
   * Get download URL for media
   */
  const download = useCallback(async (id: string): Promise<string> => {
    try {
      return await getDownloadUrl(id);
    } catch (_err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get download URL';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      throw err;
    }
  }, []);

  /**
   * Update filter and trigger refresh
   */
  const setFilter = useCallback((newFilter: MediaFilter) => {
    setState(prev => ({
      ...prev,
      filter: newFilter,
    }));
    // Note: This state update triggers a re-render.
    // The 'refresh' function will be recreated because [state.filter] changes.
    // The useEffect below will detect 'refresh' changed and run it.
  }, []);

  // Single effect to handle loading on mount AND when filter changes
  useEffect(() => {
    if (autoLoad) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh();
    }
  }, [autoLoad, refresh]);

  return {
    // State
    media: state.media,
    loading: state.loading,
    error: state.error,
    filter: state.filter,
    
    // Actions
    upload,
    remove,
    update,
    download,
    refresh,
    setFilter,
  };
}
