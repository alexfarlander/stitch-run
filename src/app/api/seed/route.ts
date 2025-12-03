import { NextResponse } from 'next/server';
import { seedDefaultBMC } from '@/lib/seeds/default-bmc';

export async function GET() {
  try {
    const canvasId = await seedDefaultBMC();
    return NextResponse.json({
      success: true,
      message: 'BMC Seeded Successfully',
      canvasId,
      viewUrl: `/canvas/${canvasId}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
