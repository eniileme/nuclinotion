import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { uploadMetadata } from '../initiate/route';
import { ChunkMetadata } from '@/lib/chunkedUpload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const metadataStr = formData.get('metadata') as string;
    
    if (!chunk || !metadataStr) {
      console.error('Missing chunk or metadata in upload request');
      return NextResponse.json(
        { error: 'Missing chunk or metadata' },
        { status: 400 }
      );
    }
    
    const metadata: ChunkMetadata = JSON.parse(metadataStr);
    
    console.log(`Uploading chunk ${metadata.chunkIndex + 1}/${metadata.totalChunks} for upload ${metadata.uploadId}`);
    
    // Verify upload exists
    if (!uploadMetadata.has(metadata.uploadId)) {
      console.error('Upload not found:', metadata.uploadId);
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }
    
    // Create chunk directory
    const chunkDir = path.join('/tmp', 'uploads', metadata.uploadId);
    await mkdir(chunkDir, { recursive: true });
    
    // Save chunk
    const chunkPath = path.join(chunkDir, `chunk_${metadata.chunkIndex}`);
    const chunkBuffer = await chunk.arrayBuffer();
    await writeFile(chunkPath, Buffer.from(chunkBuffer));
    
    console.log(`Chunk ${metadata.chunkIndex} saved to ${chunkPath}`);
    
    return NextResponse.json({ 
      success: true, 
      chunkIndex: metadata.chunkIndex,
      message: `Chunk ${metadata.chunkIndex + 1}/${metadata.totalChunks} uploaded`
    });
    
  } catch (error) {
    console.error('Failed to upload chunk:', error);
    return NextResponse.json(
      { error: `Failed to upload chunk: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
