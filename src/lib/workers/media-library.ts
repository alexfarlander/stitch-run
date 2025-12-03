/**
 * Media Library Worker
 * Retrieves full media asset details from the database.
 * Used to hydrate lightweight IDs passed from UI nodes into full metadata objects.
 * 
 * Validates: Requirements 6.1
 */

import { IWorker } from './base';
import { NodeConfig } from '@/types/stitch';
import { triggerCallback, logWorker } from './utils';
import { getMedia, listMedia } from '@/lib/media/media-service';

/**
 * Media Library worker implementation
 * Loads media assets from the database by ID or filter criteria
 */
export class MediaLibraryWorker implements IWorker {
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    const startTime = Date.now();
    
    logWorker('info', 'Media Library worker started', {
      worker: 'media-library',
      runId,
      nodeId,
      operation: config.operation,
    });

    try {
      let result: any;

      // Mode 1: Load specific items by ID (from MediaSelect node)
      // Input might be:
      //   - Raw array: [{ media_id: '...' }, ...]  (direct from MediaSelectNode)
      //   - Wrapped array: { wireframes: [...] } or { selectedAssets: [...] }
      //   - Node-keyed array: { 'select-wireframes': [...] } (from mergeUpstreamOutputs)
      //   - Single item: { media_id: '...' }
      if (config.operation === 'load-metadata' || input?.media_id || Array.isArray(input)) {
        
        // Determine the list of items to process
        let itemsToLoad: any[] = [];
        
        // Case A: Input is the raw array (direct from MediaSelectNode)
        if (Array.isArray(input)) {
          itemsToLoad = input;
          
          logWorker('info', 'Input is raw array from MediaSelectNode', {
            worker: 'media-library',
            runId,
            nodeId,
            count: itemsToLoad.length,
          });
        }
        // Case B: Input is wrapped in a known property (e.g. { wireframes: [...] })
        else if (Array.isArray(input.wireframes)) {
          itemsToLoad = input.wireframes;
          
          logWorker('info', 'Input has wireframes array property', {
            worker: 'media-library',
            runId,
            nodeId,
            count: itemsToLoad.length,
          });
        }
        else if (Array.isArray(input.selectedAssets)) {
          itemsToLoad = input.selectedAssets;
          
          logWorker('info', 'Input has selectedAssets array property', {
            worker: 'media-library',
            runId,
            nodeId,
            count: itemsToLoad.length,
          });
        }
        // Case C: Input is an object with array values (from mergeUpstreamOutputs)
        // When upstream node outputs an array, it gets keyed by node ID
        else if (typeof input === 'object' && input !== null) {
          // Find the first property that is an array of objects with media_id or id
          const arrayProp = Object.keys(input).find(key => {
            const value = input[key];
            return Array.isArray(value) && value.length > 0 && 
                   (value[0]?.media_id || value[0]?.id);
          });
          
          if (arrayProp) {
            itemsToLoad = input[arrayProp];
            
            logWorker('info', 'Input has node-keyed array property', {
              worker: 'media-library',
              runId,
              nodeId,
              propertyKey: arrayProp,
              count: itemsToLoad.length,
            });
          }
          // Case D: Single item wrapped in object
          else if (input.media_id || input.id) {
            itemsToLoad = [input];
            
            logWorker('info', 'Input is single item', {
              worker: 'media-library',
              runId,
              nodeId,
              mediaId: input.media_id || input.id,
            });
          }
        }
        
        if (itemsToLoad.length > 0) {
          logWorker('info', 'Loading media items', {
            worker: 'media-library',
            runId,
            nodeId,
            count: itemsToLoad.length,
          });
          
          const loadedItems = await Promise.all(
            itemsToLoad.map(async (item: any) => {
              const id = item.media_id || item.id;
              if (!id) {
                logWorker('warn', 'Skipping item without ID', {
                  worker: 'media-library',
                  runId,
                  nodeId,
                  item,
                });
                return null;
              }
              return await getMedia(id);
            })
          );
          
          // Filter out nulls
          const validItems = loadedItems.filter(Boolean);
          
          logWorker('info', 'Loaded media items', {
            worker: 'media-library',
            runId,
            nodeId,
            requested: itemsToLoad.length,
            loaded: validItems.length,
          });
          
          // If input was a single item (not an array), output single item
          // Otherwise output object with list for downstream processing
          if (itemsToLoad.length === 1 && !Array.isArray(input) && !input.wireframes) {
            result = validItems[0];
          } else {
            // Standardize output for downstream parallel processing
            result = { 
              media: validItems,
              wireframes: validItems, // Alias for compatibility
              count: validItems.length,
            };
          }
        } else {
          throw new Error('No valid media IDs found in input.');
        }
      }
      
      // Mode 2: Search/List (future use)
      else if (config.operation === 'list' || config.filter) {
        logWorker('info', 'Listing media with filter', {
          worker: 'media-library',
          runId,
          nodeId,
          filter: config.filter,
        });
        
        const mediaList = await listMedia(config.filter || {});
        result = { 
          media: mediaList,
          count: mediaList.length,
        };
      }
      else {
        throw new Error('Unknown operation or missing input for Media Library worker. Specify operation: "load-metadata" or "list"');
      }

      const duration = Date.now() - startTime;
      
      logWorker('info', 'Media Library worker completed', {
        worker: 'media-library',
        runId,
        nodeId,
        duration,
      });

      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: result,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logWorker('error', 'Media Library worker failed', {
        worker: 'media-library',
        runId,
        nodeId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      });

      await triggerCallback(runId, nodeId, {
        status: 'failed',
        error: errorMessage,
      });
    }
  }
}
