import { NextResponse } from 'next/server';
import { cleanupExpiredJobs } from '@/lib/fsx';

export async function POST() {
  try {
    const cleanedCount = await cleanupExpiredJobs();
    
    return NextResponse.json({
      message: `Cleaned up ${cleanedCount} expired jobs`,
      cleanedCount
    });
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cleanedCount = await cleanupExpiredJobs();
    
    return NextResponse.json({
      message: `Cleaned up ${cleanedCount} expired jobs`,
      cleanedCount
    });
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
