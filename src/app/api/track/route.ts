/**
 * Tracking Landing Page API
 * 
 * Captures visitor information from tracking links and creates/updates entities
 * Redirects to the specified destination after tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract UTM parameters
    const trackingId = searchParams.get('tracking_id');
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');
    const utmContent = searchParams.get('utm_content');
    const utmTerm = searchParams.get('utm_term');
    const redirectTo = searchParams.get('redirect_to') || '/';
    const entityId = searchParams.get('entity_id');

    // Get visitor information from headers
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer');
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    const supabase = createServerClient();

    // If entity_id is provided, update existing entity
    if (entityId) {
      const { error } = await supabase
        .from('stitch_entities')
        .update({
          metadata: {
            source: utmSource,
            medium: utmMedium,
            campaign: utmCampaign,
            content: utmContent,
            term: utmTerm,
            tracking_id: trackingId,
            visited_at: new Date().toISOString(),
            user_agent: userAgent,
            referer,
            ip,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      if (error) {
        console.error('Failed to update entity:', error);
      }
    } 
    // Otherwise, try to find entity by tracking_id or create a new one
    else if (trackingId) {
      // Try to find existing entity with this tracking_id
      const { data: existingEntity } = await supabase
        .from('stitch_entities')
        .select('id, canvas_id')
        .eq('metadata->>tracking_id', trackingId)
        .single();

      if (existingEntity) {
        // Update existing entity with visit information
        await supabase
          .from('stitch_entities')
          .update({
            metadata: {
              source: utmSource,
              medium: utmMedium,
              campaign: utmCampaign,
              content: utmContent,
              term: utmTerm,
              tracking_id: trackingId,
              visited_at: new Date().toISOString(),
              user_agent: userAgent,
              referer,
              ip,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingEntity.id);
      }
    }

    // Log the tracking event (optional - for analytics)
    console.log('Tracking event:', {
      trackingId,
      utmSource,
      utmCampaign,
      entityId,
      timestamp: new Date().toISOString(),
    });

    // Redirect to the destination
    return NextResponse.redirect(new URL(redirectTo, request.url));

  } catch (error) {
    console.error('Tracking error:', error);
    
    // Still redirect even if tracking fails
    const redirectTo = request.nextUrl.searchParams.get('redirect_to') || '/';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }
}
