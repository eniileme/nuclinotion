import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, readdir, rm } from 'fs/promises';
import path from 'path';
import { uploadMetadata } from '../initiate/route';

interface FinalizeRequest {
  uploadId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FinalizeRequest = await request.json();
    
    // Get upload metadata
    const metadata = uploadMetadata.get(body.uploadId);
    if (!metadata) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }
    
    const chunkDir = path.join('/tmp', 'uploads', body.uploadId);
    
    // Read all chunks and combine them
    const chunks = await readdir(chunkDir);
    const chunkFiles = chunks
      .filter(name => name.startsWith('chunk_'))
      .sort((a, b) => {
        const aIndex = parseInt(a.split('_')[1]);
        const bIndex = parseInt(b.split('_')[1]);
        return aIndex - bIndex;
      });
    
    if (chunkFiles.length !== metadata.totalChunks) {
      return NextResponse.json(
        { error: 'Missing chunks' },
        { status: 400 }
      );
    }
    
    // Combine chunks into final file
    const finalPath = path.join('/tmp', 'uploads', `${metadata.uploadId}_${metadata.fileName}`);
    
    for (const chunkFile of chunkFiles) {
      const chunkPath = path.join(chunkDir, chunkFile);
      const chunkData = await readFile(chunkPath);
      await writeFile(finalPath, chunkData, { flag: 'a' });
    }
    
    // Clean up chunks
    await rm(chunkDir, { recursive: true, force: true });
    
    // Clean up metadata
    uploadMetadata.delete(body.uploadId);
    
    return NextResponse.json({ 
      success: true, 
      filePath: finalPath,
      fileName: metadata.fileName,
      fileSize: metadata.fileSize
    });
    
  } catch (error) {
    console.error('Failed to finalize upload:', error);
    return NextResponse.json(
      { error: 'Failed to finalize upload' },
      { status: 500 }
    );
  }
}
