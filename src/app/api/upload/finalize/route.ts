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
    
    console.log('Finalizing upload:', body.uploadId);
    
    // Get upload metadata
    const metadata = uploadMetadata.get(body.uploadId);
    if (!metadata) {
      console.error('Upload metadata not found for:', body.uploadId);
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }
    
    console.log('Upload metadata:', {
      fileName: metadata.fileName,
      fileSize: metadata.fileSize,
      totalChunks: metadata.totalChunks
    });
    
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
    
    console.log(`Found ${chunkFiles.length} chunks, expected ${metadata.totalChunks}`);
    
    if (chunkFiles.length !== metadata.totalChunks) {
      return NextResponse.json(
        { error: `Missing chunks: found ${chunkFiles.length}, expected ${metadata.totalChunks}` },
        { status: 400 }
      );
    }
    
    // Combine chunks into final file
    const finalPath = path.join('/tmp', 'uploads', `${metadata.uploadId}_${metadata.fileName}`);
    
    console.log('Combining chunks into:', finalPath);
    
    for (let i = 0; i < chunkFiles.length; i++) {
      const chunkFile = chunkFiles[i];
      const chunkPath = path.join(chunkDir, chunkFile);
      const chunkData = await readFile(chunkPath);
      await writeFile(finalPath, chunkData, { flag: 'a' });
      
      if ((i + 1) % 10 === 0) {
        console.log(`Combined ${i + 1}/${chunkFiles.length} chunks`);
      }
    }
    
    console.log('Chunk combination complete, cleaning up...');
    
    // Clean up chunks
    await rm(chunkDir, { recursive: true, force: true });
    
    // Clean up metadata
    uploadMetadata.delete(body.uploadId);
    
    console.log('Upload finalized successfully:', finalPath);
    
    return NextResponse.json({ 
      success: true, 
      filePath: finalPath,
      fileName: metadata.fileName,
      fileSize: metadata.fileSize
    });
    
  } catch (error) {
    console.error('Failed to finalize upload:', error);
    return NextResponse.json(
      { error: `Failed to finalize upload: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
