import { NextRequest, NextResponse } from 'next/server';
import { ProcessingPipeline } from '@/lib/pipeline';
import { ProcessingOptions } from '@/lib/types';
import { cleanupExpiredJobs } from '@/lib/fsx';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';

const JOBS_DIR = '/tmp/jobs';

async function saveJobStatus(jobId: string, status: any) {
  try {
    await mkdir(JOBS_DIR, { recursive: true });
    const statusPath = path.join(JOBS_DIR, `${jobId}_status.json`);
    await writeFile(statusPath, JSON.stringify(status));
    console.log(`Job status saved to: ${statusPath}`);
  } catch (error) {
    console.error(`Failed to save job status for ${jobId}:`, error);
  }
}

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

interface ProcessRequest {
  notesFilePath: string;
  assetsFilePath: string | null;
  options: ProcessingOptions;
}

export async function POST(request: NextRequest) {
  try {
    // Clean up expired jobs on first request
    await cleanupExpiredJobs();
    
    const body: ProcessRequest = await request.json();
    const { notesFilePath, assetsFilePath, options } = body;
    
    if (!notesFilePath) {
      return NextResponse.json(
        { error: 'Notes file path is required' },
        { status: 400 }
      );
    }
    
    // Create processing pipeline
    const pipeline = new ProcessingPipeline();
    const jobId = pipeline.getJobId();
    
    // Store initial status
    const initialStatus = {
      status: 'processing',
      progress: 0,
      currentStep: 'initializing',
      createdAt: new Date().toISOString()
    };
    await saveJobStatus(jobId, initialStatus);
    
    // Start processing in background
    processJob(pipeline, notesFilePath, assetsFilePath, options).catch(async (error) => {
      console.error(`Job ${jobId} failed:`, error);
      const status = await loadJobStatus(jobId);
      if (status) {
        await saveJobStatus(jobId, {
          ...status,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
    
    return NextResponse.json({ jobId });
    
  } catch (error) {
    console.error('Job creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}

async function processJob(
  pipeline: ProcessingPipeline,
  notesFilePath: string,
  assetsFilePath: string | null,
  options: ProcessingOptions
) {
  const jobId = pipeline.getJobId();
  
  try {
    // Set up status callback
    pipeline.setStatusCallback(async (status) => {
      await saveJobStatus(jobId, status);
    });
    
    // Process the job with the uploaded file paths
    await pipeline.process(notesFilePath, assetsFilePath, options);
    
  } catch (error) {
    console.error(`Job ${jobId} processing failed:`, error);
    const status = await loadJobStatus(jobId);
    if (status) {
      await saveJobStatus(jobId, {
        ...status,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
