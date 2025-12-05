/**
 * Supabase Broadcast Helper
 * 
 * Helper functions for broadcasting real-time events from the server.
 * Uses the correct pattern to avoid deprecation warnings.
 */

import { getAdminClient } from './client';

interface BroadcastPayload {
  [key: string]: unknown;
}

/**
 * Broadcast an event to a canvas channel
 * 
 * This creates a channel, subscribes, sends the message, and cleans up.
 * 
 * @param canvasId - The canvas ID to broadcast to
 * @param event - The event name (e.g., 'node_activated', 'edge_fired')
 * @param payload - The event payload
 */
export async function broadcastToCanvas(
  canvasId: string,
  event: string,
  payload: BroadcastPayload
): Promise<void> {
  const supabase = getAdminClient();
  const channelName = `canvas-${canvasId}`;

  try {
    const channel = supabase.channel(channelName);

    // Subscribe first, then send
    await new Promise<void>((resolve, reject) => {
      channel
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Now we can send
            channel
              .send({
                type: 'broadcast',
                event,
                payload,
              })
              .then(() => {
                // Unsubscribe after sending
                supabase.removeChannel(channel);
                resolve();
              })
              .catch((err) => {
                supabase.removeChannel(channel);
                reject(err);
              });
          } else if (status === 'CHANNEL_ERROR') {
            supabase.removeChannel(channel);
            reject(new Error('Channel subscription failed'));
          }
        });

      // Timeout after 5 seconds
      setTimeout(() => {
        supabase.removeChannel(channel);
        reject(new Error('Broadcast timeout'));
      }, 5000);
    });
  } catch (error) {
    console.warn(`[Broadcast] Failed to broadcast ${event} to ${channelName}:`, error);
  }
}

/**
 * Fire-and-forget broadcast (doesn't wait for confirmation)
 * 
 * This is faster but less reliable. Use for non-critical visual updates.
 * 
 * @param canvasId - The canvas ID to broadcast to
 * @param event - The event name
 * @param payload - The event payload
 */
export function broadcastToCanvasAsync(
  canvasId: string,
  event: string,
  payload: BroadcastPayload
): void {
  // Fire and forget - don't await
  broadcastToCanvas(canvasId, event, payload).catch((err) => {
    console.warn(`[Broadcast Async] Failed:`, err);
  });
}
