/**
 * Stitch Home Page
 * 
 * Landing page that redirects to the default BMC canvas
 */

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { HomeLayout } from '@/components/HomeLayout';

export default async function Home() {
  const supabase = createServerClient();
  
  // Try to fetch the default BMC canvas
  const { data: bmc } = await supabase
    .from('stitch_flows')
    .select('id, name')
    .eq('canvas_type', 'bmc')
    .single();
  
  // If BMC exists, redirect to it
  if (bmc) {
    redirect(`/canvas/${bmc.id}`);
  }
  
  // If no BMC exists, show setup instructions
  return (
    <HomeLayout>
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <main className="flex flex-col items-center gap-8 p-8 max-w-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Welcome to Stitch
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
            Your Living Business Model Canvas
          </p>
        </div>
        
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8 w-full">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Get Started
          </h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                1. Seed the BMC Canvas
              </h3>
              <code className="block bg-zinc-100 dark:bg-zinc-900 p-3 rounded text-sm">
                npx tsx scripts/seed-bmc.ts
              </code>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                2. Seed the Demo Journey (Optional)
              </h3>
              <code className="block bg-zinc-100 dark:bg-zinc-900 p-3 rounded text-sm">
                npx tsx scripts/seed-demo-journey.ts
              </code>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                This creates Monica's journey with demo entities and webhooks
              </p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                3. View Your Canvas
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Refresh this page after seeding to see your BMC canvas
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-center text-sm text-zinc-500 dark:text-zinc-500">
          <p>
            Need help? Check out the{' '}
            <Link href="/test-canvas" className="text-blue-600 dark:text-blue-400 hover:underline">
              test canvas
            </Link>
            {' '}or read the documentation
          </p>
        </div>
      </main>
    </div>
    </HomeLayout>
  );
}
