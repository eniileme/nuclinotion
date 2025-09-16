import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const JOBS_DIR = '/tmp/jobs';

// In-memory fallback for serverless function isolation issues
const inMemoryJobStatuses = new Map<string, any>();

async function loadJobStatus(jobId: string): Promise<any | null> {
  try {
    console.log(`=== LOAD JOB STATUS START ===`);
    console.log(`Job ID: ${jobId}`);
    
    const statusPath = path.join(JOBS_DIR, `${jobId}_status.json`);
    console.log(`Looking for status file at: ${statusPath}`);
    
    // Check if directory exists
    const fs = await import('fs/promises');
    try {
      const dirStats = await fs.stat(JOBS_DIR);
      console.log(`Jobs directory exists: ${JOBS_DIR}, isDirectory: ${dirStats.isDirectory()}`);
    } catch (dirError) {
      console.log(`Jobs directory does not exist: ${JOBS_DIR}`);
    }
    
    // List files in directory
    try {
      const files = await fs.readdir(JOBS_DIR);
      console.log(`Files in jobs directory:`, files);
    } catch (listError) {
      console.log(`Cannot list files in jobs directory:`, listError);
    }
    
    const statusData = await readFile(statusPath, 'utf-8');
    console.log(`Status file read successfully, content length: ${statusData.length}`);
    
    const parsed = JSON.parse(statusData);
    console.log(`Status parsed successfully:`, parsed);
    console.log(`=== LOAD JOB STATUS SUCCESS ===`);
    
    return parsed;
  } catch (error) {
    console.error(`=== LOAD JOB STATUS FAILED ===`);
    console.error(`Job ID: ${jobId}`);
    console.error(`Error:`, error);
    console.error(`Error details:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
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
