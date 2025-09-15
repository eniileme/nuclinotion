import { NextRequest, NextResponse } from 'next/server';
import { jobStatuses } from '../../route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    
    console.log(`Checking status for job: ${jobId}`);
    console.log(`Available jobs:`, Array.from(jobStatuses.keys()));
    
    const status = jobStatuses.get(jobId);
    
    if (!status) {
      console.log(`Job ${jobId} not found in jobStatuses map`);
      return NextResponse.json(
        { error: 'Job not found', jobId, availableJobs: Array.from(jobStatuses.keys()) },
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
    console.error('Failed to get job status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
