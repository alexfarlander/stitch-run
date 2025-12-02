/**
 * Run Visualization Page (Legacy route - redirects to /flow/[runId])
 * Shows the live execution of a Stitch flow
 */

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ runId: string }>;
}

export default async function RunPage({ params }: PageProps) {
  const { runId } = await params;
  
  // Redirect to the new flow route
  redirect(`/flow/${runId}`);
}
