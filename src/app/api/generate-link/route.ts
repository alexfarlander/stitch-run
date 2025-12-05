/**
 * Quick Link Generation API
 * 
 * Generates tracking links directly without needing to create/run workflows
 * Perfect for AI Assistant integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      utm_source = 'direct',
      utm_campaign,
      utm_medium,
      utm_content,
      utm_term,
      redirect_to = '/',
      canvas_id,
      create_entity = true,
    } = body;

    // Generate tracking link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const trackingId = `${utm_source}_${utm_campaign || 'default'}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const url = new URL(`${baseUrl}/track`);
    url.searchParams.set('tracking_id', trackingId);
    url.searchParams.set('utm_source', utm_source);
    
    if (utm_medium) url.searchParams.set('utm_medium', utm_medium);
    if (utm_campaign) url.searchParams.set('utm_campaign', utm_campaign);
    if (utm_content) url.searchParams.set('utm_content', utm_content);
    if (utm_term) url.searchParams.set('utm_term', utm_term);
    if (redirect_to) url.searchParams.set('redirect_to', redirect_to);

    const trackingUrl = url.toString();

    // Optionally pre-create entity
    let entityId: string | undefined;
    if (create_entity && canvas_id) {
      try {
        const supabase = createServerClient();
        
        const { data: entity, error } = await supabase
          .from('stitch_entities')
          .insert({
            canvas_id,
            name: `Lead from ${utm_source}`,
            entity_type: 'lead',
            metadata: {
              source: utm_source,
              medium: utm_medium,
              campaign: utm_campaign,
              content: utm_content,
              term: utm_term,
              tracking_id: trackingId,
              link_generated_at: new Date().toISOString(),
            },
            journey: [],
          })
          .select('id')
          .single();

        if (!error && entity) {
          entityId = entity.id;
        }
      } catch (error) {
        console.warn('Failed to pre-create entity:', error);
      }
    }

    return NextResponse.json({
      tracking_url: trackingUrl,
      tracking_id: trackingId,
      entity_id: entityId,
      utm_params: {
        source: utm_source,
        medium: utm_medium,
        campaign: utm_campaign,
        content: utm_content,
        term: utm_term,
      },
      instructions: [
        "✅ Your tracking link is ready!",
        `📋 Share this link: ${trackingUrl}`,
        `🎯 Redirects to: ${redirect_to}`,
        "👥 Visitors will be tracked as leads in your canvas",
      ],
    });

  } catch (error) {
    console.error('Link generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate tracking link' },
      { status: 500 }
    );
  }
}
