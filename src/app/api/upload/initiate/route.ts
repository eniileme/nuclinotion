import { NextRequest, NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
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
    
    console.log('Initiating upload:', {
      uploadId: body.uploadId,
      fileName: body.fileName,
      fileSize: body.fileSize,
      totalChunks: body.totalChunks
    });
    
    // Create upload directory
    const uploadDir = path.join('/tmp', 'uploads', body.uploadId);
    await mkdir(uploadDir, { recursive: true });
    
    console.log('Upload directory created:', uploadDir);
    
    // Store metadata
    uploadMetadata.set(body.uploadId, body);
    
    console.log('Upload metadata stored, total uploads:', uploadMetadata.size);
    
    return NextResponse.json({ 
      success: true, 
      uploadId: body.uploadId,
      message: 'Upload initiated successfully'
    });
    
  } catch (error) {
    console.error('Failed to initiate upload:', error);
    return NextResponse.json(
      { error: `Failed to initiate upload: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export { uploadMetadata };
