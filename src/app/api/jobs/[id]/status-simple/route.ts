import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for job statuses
// This will only work within the same function instance
const jobStatuses = new Map<string, any>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    console.log(`Checking simple status for job: ${jobId}`);

    const status = jobStatuses.get(jobId);

    if (!status) {
      console.log(`Job ${jobId} not found in simple memory store`);
      return NextResponse.json(
        { error: 'Job not found', jobId },
        { status: 404 }
      );
    }

    console.log(`Found status for job ${jobId}:`, status);

    return NextResponse.json(status, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Failed to get simple job status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const status = await request.json();

    console.log(`Updating simple status for job ${jobId}:`, status);
    jobStatuses.set(jobId, status);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to update simple job status:', error);
    return NextResponse.json(
      {
        error: 'Failed to update job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export the jobStatuses map so it can be used by other functions
export { jobStatuses };
