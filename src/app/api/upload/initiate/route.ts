import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

interface InitiateRequest {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  uploadId: string;
}

// Store upload metadata in memory (in production, use Redis or database)
const uploadMetadata = new Map<string, InitiateRequest>();

export async function POST(request: NextRequest) {
  try {
    const body: InitiateRequest = await request.json();
    
    // Create upload directory
    const uploadDir = path.join('/tmp', 'uploads', body.uploadId);
    await writeFile(path.join(uploadDir, '.gitkeep'), '');
    
    // Store metadata
    uploadMetadata.set(body.uploadId, body);
    
    return NextResponse.json({ 
      success: true, 
      uploadId: body.uploadId,
      message: 'Upload initiated successfully'
    });
    
  } catch (error) {
    console.error('Failed to initiate upload:', error);
    return NextResponse.json(
      { error: 'Failed to initiate upload' },
      { status: 500 }
    );
  }
}

export { uploadMetadata };
