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
    const status = await loadJobStatus(jobId);
    
    if (!status) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (status.status !== 'ready') {
      return NextResponse.json(
        { error: 'Job is not ready for download' },
        { status: 400 }
      );
    }
    
    if (!status.result?.zipPath) {
      return NextResponse.json(
        { error: 'Download file not found' },
        { status: 404 }
      );
    }
    
    // Read the ZIP file
    const zipPath = status.result.zipPath;
    const zipBuffer = await readFile(zipPath);
    
    // Return the file as a download
    return new NextResponse(zipBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="notion_ready.zip"',
        'Content-Length': zipBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('Failed to download job result:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
