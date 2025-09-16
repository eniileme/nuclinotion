import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const JOBS_DIR = '/tmp/jobs';

async function loadJobStatus(jobId: string): Promise<any | null> {
  try {
    const statusPath = path.join(JOBS_DIR, `${jobId}_status.json`);
    const statusData = await readFile(statusPath, 'utf-8');
    return JSON.parse(statusData);
  } catch (error) {
    console.log(`Job status not found for ${jobId}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    
    console.log(`Checking status for job: ${jobId}`);
    
    const status = await loadJobStatus(jobId);
    
    if (!status) {
      console.log(`Job ${jobId} not found in file storage`);
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
