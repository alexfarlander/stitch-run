/**
 * Centralized real-time subscription hook
 * Manages Supabase channel lifecycle with reference counting
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SubscriptionConfig {
  table: string;
  filter: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

interface SubscriptionCallback<T> {
  (payload: T): void;
}

interface SubscriptionEntry {
  channel: RealtimeChannel;
  refCount: number;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  callbacks: Set<Function>;
}

// Global subscription registry with reference counting
const subscriptionRegistry = new Map<string, SubscriptionEntry>();

/**
 * Centralized real-time subscription hook
 * Manages channel lifecycle and prevents duplicate subscriptions
 * 
 * @param config - Subscription configuration (table, filter, event)
 * @param callback - Function to call when updates are received
 * @param enabled - Whether the subscription is active (default: true)
 * @returns Object containing connection status and error state
 */
export function useRealtimeSubscription<T = any>(
  config: SubscriptionConfig,
  callback: SubscriptionCallback<T>,
  enabled: boolean = true
): {
  status: 'connecting' | 'connected' | 'error';
  error: string | null;
} {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const callbackRef = useRef(callback);
  const mountedRef = useRef(true);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('connected');
      return;
    }

    mountedRef.current = true;

    // Create unique key for this subscription
    const key = `${config.table}:${config.filter}:${config.event || '*'}`;

    // Wrapper to ensure we only call callback if component is still mounted
    const wrappedCallback = (payload: unknown) => {
      if (mountedRef.current) {
        callbackRef.current(payload);
      }
    };

    // Check if subscription already exists
    let entry = subscriptionRegistry.get(key);

    if (entry) {
      // Reuse existing channel
      entry.refCount++;
      entry.callbacks.add(wrappedCallback);
      
      // If channel is already subscribed, update status immediately
      if (mountedRef.current) {
        setStatus('connected');
        setError(null);
      }
    } else {
      // Create new channel
      const channel = supabase
        .channel(key)
        .on(
          'postgres_changes' as unknown,
          {
            event: config.event || '*',
            schema: 'public',
            table: config.table,
            filter: config.filter,
          },
          (payload: unknown) => {
            // Invoke all registered callbacks for this channel
            const currentEntry = subscriptionRegistry.get(key);
            if (currentEntry) {
              currentEntry.callbacks.forEach((cb) => cb(payload));
            }
          }
        )
        .subscribe((subscriptionStatus) => {
          if (!mountedRef.current) return;

          if (subscriptionStatus === 'SUBSCRIBED') {
            setStatus('connected');
            setError(null);
          } else if (subscriptionStatus === 'CHANNEL_ERROR') {
            setStatus('error');
            setError('Subscription failed');
          } else if (subscriptionStatus === 'TIMED_OUT') {
            setStatus('error');
            setError('Subscription timed out');
          }
        });

      // Register new subscription
      entry = {
        channel,
        refCount: 1,
        callbacks: new Set([wrappedCallback]),
      };
      subscriptionRegistry.set(key, entry);
    }

    // Cleanup function
    return () => {
      mountedRef.current = false;

      const currentEntry = subscriptionRegistry.get(key);
      if (!currentEntry) return;

      // Remove this callback
      currentEntry.callbacks.delete(wrappedCallback);
      currentEntry.refCount--;

      // If no more references, clean up the channel
      if (currentEntry.refCount <= 0) {
        currentEntry.channel.unsubscribe();
        subscriptionRegistry.delete(key);
      }
    };
  }, [config.table, config.filter, config.event, enabled]);

  return { status, error };
}

/**
 * Get the current number of active subscriptions (for debugging/testing)
 */
export function getActiveSubscriptionCount(): number {
  return subscriptionRegistry.size;
}

/**
 * Get subscription details for a specific key (for debugging/testing)
 */
export function getSubscriptionDetails(table: string, filter: string, event: string = '*'): {
  refCount: number;
  callbackCount: number;
} | null {
  const key = `${table}:${filter}:${event}`;
  const entry = subscriptionRegistry.get(key);
  
  if (!entry) return null;
  
  return {
    refCount: entry.refCount,
    callbackCount: entry.callbacks.size,
  };
}
