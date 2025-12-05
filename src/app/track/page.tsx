/**
 * Tracking Landing Page
 * 
 * This page captures tracking information and redirects visitors
 * Used for marketing campaigns and lead attribution
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function TrackingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'tracking' | 'redirecting' | 'error'>('tracking');

  useEffect(() => {
    const trackAndRedirect = async () => {
      try {
        // Extract parameters
        const trackingId = searchParams.get('tracking_id');
        const redirectTo = searchParams.get('redirect_to') || '/';
        const entityId = searchParams.get('entity_id');

        // Call tracking API
        const trackingUrl = new URL('/api/track', window.location.origin);
        searchParams.forEach((value, key) => {
          trackingUrl.searchParams.set(key, value);
        });

        // Make tracking request
        await fetch(trackingUrl.toString(), {
          method: 'GET',
          credentials: 'include',
        });

        setStatus('redirecting');

        // Small delay to ensure tracking is captured
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect
        if (redirectTo.startsWith('http')) {
          window.location.href = redirectTo;
        } else {
          router.push(redirectTo);
        }

      } catch (error) {
        console.error('Tracking failed:', error);
        setStatus('error');
        
        // Still redirect after error
        const redirectTo = searchParams.get('redirect_to') || '/';
        setTimeout(() => {
          if (redirectTo.startsWith('http')) {
            window.location.href = redirectTo;
          } else {
            router.push(redirectTo);
          }
        }, 1000);
      }
    };

    trackAndRedirect();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">
          {status === 'tracking' && 'Processing...'}
          {status === 'redirecting' && 'Redirecting...'}
          {status === 'error' && 'Redirecting...'}
        </p>
      </div>
    </div>
  );
}
