import { NextRequest, NextResponse } from 'next/server';
import { ProcessingPipeline } from '@/lib/pipeline';
import { ProcessingOptions } from '@/lib/types';
import { cleanupExpiredJobs } from '@/lib/fsx';
import { jobStatuses } from '../route';

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
    jobStatuses.set(jobId, pipeline.getStatus());
    
    // Start processing in background
    processJob(pipeline, notesFilePath, assetsFilePath, options).catch(error => {
      console.error(`Job ${jobId} failed:`, error);
      const status = jobStatuses.get(jobId);
      if (status) {
        jobStatuses.set(jobId, {
          ...status,
          status: 'error',
          error: error.message
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
    pipeline.setStatusCallback((status) => {
      jobStatuses.set(jobId, status);
    });
    
    // Process the job with the uploaded file paths
    await pipeline.process(notesFilePath, assetsFilePath, options);
    
  } catch (error) {
    console.error(`Job ${jobId} processing failed:`, error);
    const status = jobStatuses.get(jobId);
    if (status) {
      jobStatuses.set(jobId, {
        ...status,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
