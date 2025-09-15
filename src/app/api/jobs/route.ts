import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { ProcessingPipeline } from '@/lib/pipeline';
import { ProcessingOptions } from '@/lib/types';
import { cleanupExpiredJobs } from '@/lib/fsx';

// Global job status storage (in production, use Redis or database)
const jobStatuses = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    // Clean up expired jobs on first request
    await cleanupExpiredJobs();
    
    const formData = await request.formData();
    const notesZip = formData.get('notesZip') as File;
    const assetsZip = formData.get('assetsZip') as File;
    const clusteringK = formData.get('clusteringK') as string;
    const groupingStrategy = formData.get('groupingStrategy') as string;
    
    if (!notesZip) {
      return NextResponse.json(
        { error: 'Notes ZIP file is required' },
        { status: 400 }
      );
    }
    
    // Validate file size (300MB limit)
    const maxSize = 300 * 1024 * 1024; // 300MB
    if (notesZip.size > maxSize) {
      return NextResponse.json(
        { error: 'Notes ZIP file is too large. Maximum size is 300MB.' },
        { status: 400 }
      );
    }
    
    if (assetsZip && assetsZip.size > maxSize) {
      return NextResponse.json(
        { error: 'Assets ZIP file is too large. Maximum size is 300MB.' },
        { status: 400 }
      );
    }
    
    // Parse options
    const options: ProcessingOptions = {
      clusteringK: clusteringK === 'auto' ? 'auto' : parseInt(clusteringK) || 6,
      groupingStrategy: (groupingStrategy as any) || 'cluster'
    };
    
    // Create processing pipeline
    const pipeline = new ProcessingPipeline();
    const jobId = pipeline.getJobId();
    
    // Store initial status
    jobStatuses.set(jobId, pipeline.getStatus());
    
    // Start processing in background
    processJob(pipeline, notesZip, assetsZip, options).catch(error => {
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
  notesZip: File,
  assetsZip: File | null,
  options: ProcessingOptions
) {
  const jobId = pipeline.getJobId();
  
  try {
    // Set up status callback
    pipeline.setStatusCallback((status) => {
      jobStatuses.set(jobId, status);
    });
    
    // Save uploaded files to temp directory
    const tempDir = `/tmp/jobs/${jobId}`;
    const notesZipPath = path.join(tempDir, 'notes.zip');
    const assetsZipPath = assetsZip ? path.join(tempDir, 'assets.zip') : null;
    
    // Write notes ZIP
    const notesBuffer = await notesZip.arrayBuffer();
    await writeFile(notesZipPath, Buffer.from(notesBuffer));
    
    // Write assets ZIP if provided
    if (assetsZip && assetsZipPath) {
      const assetsBuffer = await assetsZip.arrayBuffer();
      await writeFile(assetsZipPath, Buffer.from(assetsBuffer));
    }
    
    // Process the job
    await pipeline.process(notesZipPath, assetsZipPath, options);
    
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
      jobStatuses.set(jobId, pipeline.getStatus());
      
      // Start sample processing in background
      processSampleJob(pipeline).catch(error => {
        console.error(`Sample job ${jobId} failed:`, error);
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
    pipeline.setStatusCallback((status) => {
      jobStatuses.set(jobId, status);
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

// Export job statuses for other routes
export { jobStatuses };
