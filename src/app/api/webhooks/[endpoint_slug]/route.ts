/**
 * Webhook API Endpoint
 *
 * Receives webhook requests from external services and processes them.
 *
 * POST /api/webhooks/[endpoint_slug]
 *
 * Request Headers:
 * - X-Webhook-Signature: Optional HMAC signature for validation
 * - Content-Type: application/json
 *
 * Request Body:
 * - Any valid JSON payload (structure defined by external service)
 *
 * Response:
 * - 200 OK: Webhook accepted and processed successfully
 * - 401 Unauthorized: Invalid signature
 * - 404 Not Found: Endpoint slug not found or inactive
 * - 429 Too Many Requests: Rate limit exceeded
 * - 500 Internal Server Error: Processing error
 *
 * Validates: Requirements 1.2, 1.5, 2.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { processWebhook } from '@/lib/webhooks/processor';
import { RateLimiters, getClientIdentifier, applyRateLimitHeaders } from '@/lib/api/rate-limiter';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint_slug: string }> }
) {
  try {
    // Step 1: Rate limiting check (10 requests per minute per IP)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await RateLimiters.webhook.check(identifier);

    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many webhook requests. Please try again later.',
          limit: rateLimitResult.limit,
          reset: rateLimitResult.reset,
        },
        { status: 429 }
      );
      return applyRateLimitHeaders(response, rateLimitResult);
    }

    // Step 2: Await params to extract endpoint_slug
    const { endpoint_slug } = await params;

    // Step 3: Extract payload from request body
    // We need both the raw body (for signature validation) and parsed JSON
    const rawBody = await request.text();
    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Step 4: Extract signature from X-Webhook-Signature header
    const signature = request.headers.get('X-Webhook-Signature');

    // Step 5: Call webhook processor
    const result = await processWebhook(
      endpoint_slug,
      rawBody,
      payload,
      signature
    );
    
    // Step 6: Return appropriate HTTP status codes
    if (!result.success) {
      // Determine the appropriate error status code based on the error message
      if (result.error?.includes('not found') || result.error?.includes('inactive')) {
        // Validates: Requirements 1.2
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        );
      } else if (result.error?.includes('signature')) {
        // Validates: Requirements 1.5
        return NextResponse.json(
          { error: result.error },
          { status: 401 }
        );
      } else {
        // Generic processing error
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
    }

    // Success response with rate limit headers
    // Validates: Requirements 2.1
    const response = NextResponse.json(
      {
        success: true,
        webhookEventId: result.webhookEventId,
        entityId: result.entityId,
        workflowRunId: result.workflowRunId,
      },
      { status: 200 }
    );
    return applyRateLimitHeaders(response, rateLimitResult);
    
  } catch (_error) {
    console.error('Webhook API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
