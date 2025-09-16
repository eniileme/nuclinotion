import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';
import { ProcessingPipeline } from '@/lib/pipeline';
import { ProcessingOptions } from '@/lib/types';
import { cleanupExpiredJobs } from '@/lib/fsx';
import { jobStatuses } from './[id]/status-simple/route';

// File-based logging
const LOGS_DIR = '/tmp/logs';
const LOG_FILE = path.join(LOGS_DIR, 'app.log');

async function writeLog(message: string) {
  try {
    await mkdir(LOGS_DIR, { recursive: true });
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    await writeFile(LOG_FILE, logEntry, { flag: 'a' });
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

// File-based job status storage (since serverless functions don't share memory)
const JOBS_DIR = '/tmp/jobs';

// In-memory fallback for serverless function isolation issues
const inMemoryJobStatuses = new Map<string, any>();

async function saveJobStatus(jobId: string, status: any) {
  try {
    console.log(`=== SAVE JOB STATUS START ===`);
    console.log(`Job ID: ${jobId}`);
    console.log(`Status object:`, JSON.stringify(status, null, 2));
    
    // Store in memory first (for immediate access)
    inMemoryJobStatuses.set(jobId, status);
    jobStatuses.set(jobId, status); // Also store in simple memory store
    console.log(`Stored job status in memory for ${jobId}`);
    
    console.log(`Creating directory: ${JOBS_DIR}`);
    await mkdir(JOBS_DIR, { recursive: true });
    console.log(`Directory created successfully`);

    const statusPath = path.join(JOBS_DIR, `${jobId}_status.json`);
    console.log(`Writing status to: ${statusPath}`);
    
    const statusJson = JSON.stringify(status);
    console.log(`JSON string length: ${statusJson.length} characters`);
    
    await writeFile(statusPath, statusJson);
    console.log(`File written successfully`);

    // Verify the file was created immediately
    const fs = await import('fs/promises');
    const stats = await fs.stat(statusPath);
    console.log(`File verification: ${statusPath} exists, size: ${stats.size} bytes`);
    
    // Read back the file to verify content
    const readBack = await fs.readFile(statusPath, 'utf-8');
    console.log(`File read back successfully, content length: ${readBack.length}`);
    
    console.log(`=== SAVE JOB STATUS SUCCESS ===`);
    return true; // Explicit success return

  } catch (error) {
    console.error(`=== SAVE JOB STATUS FAILED ===`);
    console.error(`Job ID: ${jobId}`);
    console.error(`Error:`, error);
    console.error(`Error details:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw to ensure the error is caught
  }
}

async function loadJobStatus(jobId: string): Promise<any | null> {
  try {
    console.log(`=== LOAD JOB STATUS START ===`);
    console.log(`Job ID: ${jobId}`);
    
    // First, try in-memory storage (for same function instance)
    if (inMemoryJobStatuses.has(jobId)) {
      console.log(`Found job status in memory for ${jobId}`);
      return inMemoryJobStatuses.get(jobId);
    }
    
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
    
    // Store in memory for future requests
    inMemoryJobStatuses.set(jobId, parsed);
    console.log(`Stored job status in memory for ${jobId}`);
    
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

export async function POST(request: NextRequest) {
  const debugInfo: any = {
    steps: [],
    errors: [],
    timestamp: new Date().toISOString()
  };
  
  try {
    console.log('=== JOB CREATION STARTED ===');
    debugInfo.steps.push('Job creation started');
    
    // Clean up expired jobs on first request
    console.log('Cleaning up expired jobs...');
    debugInfo.steps.push('Cleaning up expired jobs');
    await cleanupExpiredJobs();
    console.log('Cleanup completed');
    debugInfo.steps.push('Cleanup completed');
    
    console.log('Parsing form data...');
    debugInfo.steps.push('Parsing form data');
    const formData = await request.formData();
    const notesZip = formData.get('notesZip') as File;
    const assetsZip = formData.get('assetsZip') as File;
    const clusteringK = formData.get('clusteringK') as string;
    const groupingStrategy = formData.get('groupingStrategy') as string;
    
    debugInfo.formData = {
      hasNotesZip: !!notesZip,
      notesZipName: notesZip?.name,
      notesZipSize: notesZip?.size,
      hasAssetsZip: !!assetsZip,
      assetsZipName: assetsZip?.name,
      assetsZipSize: assetsZip?.size,
      clusteringK,
      groupingStrategy
    };
    
    console.log('Form data parsed:', {
      hasNotesZip: !!notesZip,
      notesZipName: notesZip?.name,
      notesZipSize: notesZip?.size,
      hasAssetsZip: !!assetsZip,
      assetsZipName: assetsZip?.name,
      assetsZipSize: assetsZip?.size,
      clusteringK,
      groupingStrategy
    });
    
    console.log('Received files:', {
      notesZip: notesZip?.name,
      notesZipSize: notesZip?.size,
      assetsZip: assetsZip?.name,
      assetsZipSize: assetsZip?.size
    });
    
    if (!notesZip) {
      return NextResponse.json(
        { error: 'Notes ZIP file is required' },
        { status: 400 }
      );
    }
    
    // Validate file size (50MB limit for Vercel)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (notesZip.size > maxSize) {
      return NextResponse.json(
        { error: 'Notes ZIP file is too large. Maximum size is 50MB for Vercel deployment.' },
        { status: 400 }
      );
    }
    
    if (assetsZip && assetsZip.size > maxSize) {
      return NextResponse.json(
        { error: 'Assets ZIP file is too large. Maximum size is 50MB for Vercel deployment.' },
        { status: 400 }
      );
    }
    
    // Parse options
    const options: ProcessingOptions = {
      clusteringK: clusteringK === 'auto' ? 'auto' : parseInt(clusteringK) || 6,
      groupingStrategy: (groupingStrategy as any) || 'cluster'
    };
    
    // Create processing pipeline
    console.log('Creating ProcessingPipeline...');
    const pipeline = new ProcessingPipeline();
    console.log('ProcessingPipeline created successfully');
    
    console.log('Getting job ID...');
    const jobId = pipeline.getJobId();
    console.log(`Job ID generated: ${jobId}`);
    
    console.log(`Creating job ${jobId} with files:`, {
      notesSize: notesZip.size,
      notesName: notesZip.name,
      assetsSize: assetsZip?.size || 0,
      assetsName: assetsZip?.name || 'none',
      options
    });
    
    // Store initial status
    console.log(`About to create initial status for job ${jobId}...`);
    const initialStatus = {
      status: 'processing',
      progress: 0,
      currentStep: 'initializing',
      createdAt: new Date().toISOString()
    };
    console.log(`Initial status object created:`, initialStatus);
    
    console.log(`Calling saveJobStatus for job ${jobId}...`);
    debugInfo.steps.push(`Calling saveJobStatus for job ${jobId}`);
    try {
      await saveJobStatus(jobId, initialStatus);
      console.log(`saveJobStatus completed for job ${jobId}`);
      debugInfo.steps.push(`saveJobStatus completed for job ${jobId}`);
      
      // Immediately verify the file was created
      const fs = await import('fs/promises');
      const statusPath = path.join(JOBS_DIR, `${jobId}_status.json`);
      try {
        const stats = await fs.stat(statusPath);
        debugInfo.steps.push(`Status file verified: ${statusPath} exists, size: ${stats.size} bytes`);
      } catch (verifyError) {
        debugInfo.errors.push(`Status file verification failed: ${verifyError}`);
        throw new Error(`Status file was not created: ${verifyError}`);
      }
      
    } catch (saveError) {
      console.error(`CRITICAL: saveJobStatus failed for job ${jobId}:`, saveError);
      debugInfo.errors.push(`saveJobStatus failed: ${saveError}`);
      throw saveError; // Re-throw to prevent job creation from succeeding
    }
    
    console.log(`Job ${jobId} status initialized and saved to file`);
    
    // Start processing in background
    processJob(pipeline, notesZip, assetsZip, options).catch(async (error) => {
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
    
    console.log(`Job ${jobId} created successfully, returning jobId`);
    await writeLog(`Job ${jobId} created successfully, returning jobId`);
    
    // Verify the status file was actually created
    console.log(`Verifying status file exists for job ${jobId}...`);
    await writeLog(`Verifying status file exists for job ${jobId}...`);
    const verificationStatus = await loadJobStatus(jobId);
    if (verificationStatus) {
      console.log(`Status file verification successful for job ${jobId}`);
      await writeLog(`Status file verification successful for job ${jobId}`);
    } else {
      console.error(`CRITICAL: Status file verification FAILED for job ${jobId} - file was not created!`);
      await writeLog(`CRITICAL: Status file verification FAILED for job ${jobId} - file was not created!`);
    }
    
    // Return detailed response with debugging info and initial status
    return NextResponse.json({ 
      jobId,
      status: verificationStatus || {
        status: 'processing',
        progress: 0,
        currentStep: 'initializing',
        createdAt: new Date().toISOString()
      },
      debug: {
        ...debugInfo,
        statusFileCreated: !!verificationStatus,
        statusFileContent: verificationStatus,
        message: verificationStatus ? 'Status file created successfully' : 'Status file creation failed'
      }
    });
    
  } catch (error) {
    console.error('Job creation failed:', error);
    debugInfo.errors.push(`Job creation failed: ${error}`);
    return NextResponse.json(
      { 
        error: 'Failed to create job',
        debug: debugInfo
      },
      { status: 500 }
    );
  }
}

async function processJob(
  pipeline: ProcessingPipeline,
  notesZip: File,
  assetsZip: File | null,
  options: ProcessingOptions
) {
  const jobId = pipeline.getJobId();
  
  try {
    // Set up status callback
    pipeline.setStatusCallback(async (status) => {
      await saveJobStatus(jobId, status);
    });
    
    // Save uploaded files to temp directory
    const tempDir = `/tmp/jobs/${jobId}`;
    const notesZipPath = path.join(tempDir, 'notes.zip');
    const assetsZipPath = assetsZip ? path.join(tempDir, 'assets.zip') : null;
    
    console.log(`Job ${jobId}: Starting file processing`, {
      notesSize: notesZip.size,
      assetsSize: assetsZip?.size,
      tempDir
    });
    
    // Create temp directory first
    await mkdir(tempDir, { recursive: true });
    console.log(`Job ${jobId}: Created temp directory: ${tempDir}`);
    
    // Write notes ZIP
    const notesBuffer = await notesZip.arrayBuffer();
    await writeFile(notesZipPath, Buffer.from(notesBuffer));
    console.log(`Job ${jobId}: Notes ZIP saved to ${notesZipPath}`);
    
    // Write assets ZIP if provided
    if (assetsZip && assetsZipPath) {
      const assetsBuffer = await assetsZip.arrayBuffer();
      await writeFile(assetsZipPath, Buffer.from(assetsBuffer));
      console.log(`Job ${jobId}: Assets ZIP saved to ${assetsZipPath}`);
    }
    
    // Process the job
    console.log(`Job ${jobId}: Starting pipeline processing`);
    await pipeline.process(notesZipPath, assetsZipPath, options);
    console.log(`Job ${jobId}: Pipeline processing completed`);
    
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

// Handle sample data request
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'sample') {
    try {
      // Create sample job with baked-in data
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
      
      // Start sample processing in background
      processSampleJob(pipeline).catch(async (error) => {
        console.error(`Sample job ${jobId} failed:`, error);
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
      console.error('Sample job creation failed:', error);
      return NextResponse.json(
        { error: 'Failed to create sample job' },
        { status: 500 }
      );
    }
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

async function processSampleJob(pipeline: ProcessingPipeline): Promise<void> {
  const jobId = pipeline.getJobId();
  
  try {
    // Set up status callback
    pipeline.setStatusCallback(async (status) => {
      await saveJobStatus(jobId, status);
    });
    
    // Create sample data
    await createSampleData(jobId);
    
    const options: ProcessingOptions = {
      clusteringK: 'auto',
      groupingStrategy: 'cluster'
    };
    
    const notesZipPath = `/tmp/jobs/${jobId}/sample_notes.zip`;
    const assetsZipPath = `/tmp/jobs/${jobId}/sample_assets.zip`;
    
    // Process the sample job
    await pipeline.process(notesZipPath, assetsZipPath, options);
    
  } catch (error) {
    console.error(`Sample job ${jobId} processing failed:`, error);
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

async function createSampleData(jobId: string): Promise<void> {
  const tempDir = `/tmp/jobs/${jobId}`;
  const notesDir = path.join(tempDir, 'sample_notes');
  const assetsDir = path.join(tempDir, 'sample_assets');
  
  // Create directories
  await writeFile(path.join(notesDir, 'dummy'), '');
  await writeFile(path.join(assetsDir, 'dummy'), '');
  
  // Sample markdown files
  const sampleNotes = [
    {
      filename: 'project_planning.md',
      content: `---
title: Project Planning
tags: [planning, project, management]
---

# Project Planning

This document outlines our project planning process.

## Key Components

- **Timeline**: 6 months
- **Budget**: $50,000
- **Team**: 5 developers

## Next Steps

1. Define requirements
2. Create wireframes
3. Begin development

See also: [[Development Process]] and [Budget Analysis](budget_analysis.md)
`
    },
    {
      filename: 'development_process.md',
      content: `---
title: Development Process
tags: [development, process, coding]
---

# Development Process

Our development methodology focuses on agile practices.

## Sprint Planning

Each sprint lasts 2 weeks and includes:

- Planning meeting
- Daily standups
- Code reviews
- Retrospectives

## Tools

We use the following tools:

- GitHub for version control
- Jira for project management
- Slack for communication

![Development Workflow](workflow_diagram.png)
`
    },
    {
      filename: 'budget_analysis.md',
      content: `---
title: Budget Analysis
tags: [budget, finance, analysis]
---

# Budget Analysis

Detailed breakdown of project costs.

## Categories

### Development
- Salaries: $30,000
- Tools: $5,000

### Infrastructure
- Hosting: $2,000
- Domain: $100

## Total: $37,100

This leaves $12,900 for contingencies.

See: [Project Planning](project_planning.md)
`
    },
    {
      filename: 'user_research.md',
      content: `---
title: User Research
tags: [research, users, ux]
---

# User Research

Understanding our target audience.

## Methodology

We conducted interviews with 20 potential users.

## Key Findings

1. Users want simplicity
2. Mobile-first approach is crucial
3. Performance is a top concern

## Personas

### Primary Persona: Sarah
- Age: 28
- Occupation: Marketing Manager
- Tech-savvy but time-constrained

![User Persona](sarah_persona.jpg)
`
    },
    {
      filename: 'technical_architecture.md',
      content: `---
title: Technical Architecture
tags: [architecture, technical, system]
---

# Technical Architecture

System design and technology choices.

## Frontend

- React with TypeScript
- Tailwind CSS for styling
- Next.js for SSR

## Backend

- Node.js with Express
- PostgreSQL database
- Redis for caching

## Deployment

- Docker containers
- AWS infrastructure
- CI/CD with GitHub Actions

![Architecture Diagram](system_architecture.png)
`
    }
  ];
  
  // Write sample notes
  for (const note of sampleNotes) {
    await writeFile(path.join(notesDir, note.filename), note.content);
  }
  
  // Create sample assets
  const sampleAssets = [
    'workflow_diagram.png',
    'sarah_persona.jpg',
    'system_architecture.png'
  ];
  
  for (const asset of sampleAssets) {
    // Create dummy image files
    await writeFile(path.join(assetsDir, asset), 'dummy image content');
  }
  
  // Create ZIP files
  const JSZip = (await import('jszip')).default;
  
  // Notes ZIP
  const notesZip = new JSZip();
  for (const note of sampleNotes) {
    notesZip.file(note.filename, note.content);
  }
  const notesZipBuffer = await notesZip.generateAsync({ type: 'nodebuffer' });
  await writeFile(path.join(tempDir, 'sample_notes.zip'), notesZipBuffer);
  
  // Assets ZIP
  const assetsZip = new JSZip();
  for (const asset of sampleAssets) {
    assetsZip.file(asset, 'dummy image content');
  }
  const assetsZipBuffer = await assetsZip.generateAsync({ type: 'nodebuffer' });
  await writeFile(path.join(tempDir, 'sample_assets.zip'), assetsZipBuffer);
}

// File-based job storage is now used instead of in-memory jobStatuses
