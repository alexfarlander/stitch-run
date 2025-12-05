/**
 * Link Generator Worker
 * Synchronous worker that generates tracking links with UTM parameters
 * for marketing campaigns and lead tracking
 */

import { IWorker } from './base';
import { NodeConfig } from '@/types/stitch';
import { triggerCallback, logWorker } from './utils';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Link Generator worker implementation
 * Creates unique tracking URLs with UTM parameters and entity tracking
 */
export class LinkGeneratorWorker implements IWorker {
  /**
   * Executes the Link Generator worker
   * Creates a tracking link with UTM parameters and optional entity pre-creation
   */
  async execute(
    runId: string,
    nodeId: string,
    config: NodeConfig,
    input: any
  ): Promise<void> {
    const startTime = Date.now();

    logWorker('info', 'Link Generator worker execution started', {
      worker: 'link-generator',
      runId,
      nodeId,
    });

    try {
      // Extract configuration
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const landingPath = input.landingPath || config.landingPath || '/track';
      const utmSource = input.utm_source || config.utm_source || 'direct';
      const utmMedium = input.utm_medium || config.utm_medium;
      const utmCampaign = input.utm_campaign || config.utm_campaign;
      const utmContent = input.utm_content || config.utm_content;
      const utmTerm = input.utm_term || config.utm_term;
      const redirectTo = input.redirect_to || config.redirect_to;
      const canvasId = input.canvas_id || config.canvas_id;
      const createEntity = input.create_entity !== false && config.create_entity !== false;

      // Generate unique tracking ID
      const trackingId = `${utmSource}_${utmCampaign || 'default'}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Build URL with UTM parameters
      const url = new URL(`${baseUrl}${landingPath}`);
      url.searchParams.set('tracking_id', trackingId);
      url.searchParams.set('utm_source', utmSource);
      
      if (utmMedium) url.searchParams.set('utm_medium', utmMedium);
      if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
      if (utmContent) url.searchParams.set('utm_content', utmContent);
      if (utmTerm) url.searchParams.set('utm_term', utmTerm);
      if (redirectTo) url.searchParams.set('redirect_to', redirectTo);

      const trackingUrl = url.toString();

      // Optionally pre-create entity for tracking
      let entityId: string | undefined;
      if (createEntity && canvasId) {
        try {
          const supabase = createServerClient();
          
          const { data: entity, error } = await supabase
            .from('stitch_entities')
            .insert({
              canvas_id: canvasId,
              name: `Lead from ${utmSource}`,
              entity_type: 'lead',
              metadata: {
                source: utmSource,
                medium: utmMedium,
                campaign: utmCampaign,
                content: utmContent,
                term: utmTerm,
                tracking_id: trackingId,
                link_generated_at: new Date().toISOString(),
              },
              journey: [],
            })
            .select('id')
            .single();

          if (error) {
            logWorker('warn', 'Failed to pre-create entity', {
              worker: 'link-generator',
              runId,
              nodeId,
              error: error.message,
            });
          } else {
            entityId = entity.id;
            logWorker('info', 'Entity pre-created for tracking', {
              worker: 'link-generator',
              runId,
              nodeId,
              entityId,
            });
          }
        } catch (error) {
          logWorker('warn', 'Error pre-creating entity', {
            worker: 'link-generator',
            runId,
            nodeId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const duration = Date.now() - startTime;
      logWorker('info', 'Link Generator worker completed successfully', {
        worker: 'link-generator',
        runId,
        nodeId,
        trackingUrl,
        trackingId,
        entityId,
        duration,
      });

      // Trigger success callback
      await triggerCallback(runId, nodeId, {
        status: 'completed',
        output: {
          tracking_url: trackingUrl,
          tracking_id: trackingId,
          entity_id: entityId,
          utm_params: {
            source: utmSource,
            medium: utmMedium,
            campaign: utmCampaign,
            content: utmContent,
            term: utmTerm,
          },
        },
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const { extractErrorContext } = await import('./utils');
      const errorContext = extractErrorContext(error);

      logWorker('error', 'Link Generator worker failed', {
        worker: 'link-generator',
        runId,
        nodeId,
        error: errorMessage,
        ...errorContext,
        duration,
        phase: 'execution',
      });

      // Trigger failure callback
      try {
        await triggerCallback(runId, nodeId, {
          status: 'failed',
          error: errorMessage,
        });
      } catch (callbackError) {
        const callbackErrorContext = extractErrorContext(callbackError);
        logWorker('error', 'Failed to trigger failure callback for Link Generator worker', {
          worker: 'link-generator',
          runId,
          nodeId,
          originalError: errorMessage,
          callbackError: callbackError instanceof Error ? callbackError.message : 'Unknown error',
          ...callbackErrorContext,
          phase: 'callback',
        });
      }
    }
  }
}
