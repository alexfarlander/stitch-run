/**
 * API Route: Seed Demo Journey
 * 
 * Triggers the demo journey seed script to populate the database
 * with Monica's journey scenario.
 * 
 * POST /api/seed/demo
 */

import { NextResponse } from 'next/server';
import { seedDemoJourney } from '@/lib/seeds/demo-journey';

export async function POST() {
  try {
    const result = await seedDemoJourney();
    
    return NextResponse.json({
      success: true,
      message: 'Demo journey seeded successfully',
      data: result
    }, { status: 200 });
    
  } catch (error) {
    console.error('Seed demo journey error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to seed the demo journey',
    endpoint: '/api/seed/demo',
    method: 'POST'
  }, { status: 200 });
}
