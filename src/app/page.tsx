/**
 * Stitch Landing Page
 */

import { LandingPage } from '@/components/landing/LandingPage';

// Default BMC canvas ID
const DEMO_CANVAS_ID = '6c920eac-1227-4277-bf77-09eba6ed4b39';

export default function Home() {
  return <LandingPage canvasId={DEMO_CANVAS_ID} />;
}
