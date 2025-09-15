export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  fileName: string;
  fileSize: number;
  uploadId: string;
}

export interface UploadProgress {
  chunkIndex: number;
  totalChunks: number;
  percentage: number;
}

export class ChunkedUploader {
  private chunkSize = 2 * 1024 * 1024; // 2MB chunks (safer for Vercel)
  private uploadId: string;

  constructor(uploadId?: string) {
    this.uploadId = uploadId || this.generateUploadId();
  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Split file into chunks
   */
  async createChunks(file: File): Promise<{ chunks: Blob[]; metadata: ChunkMetadata }> {
    const chunks: Blob[] = [];
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);
      chunks.push(file.slice(start, end));
    }

    const metadata: ChunkMetadata = {
      chunkIndex: 0,
      totalChunks,
      chunkSize: this.chunkSize,
      fileName: file.name,
      fileSize: file.size,
      uploadId: this.uploadId
    };

    return { chunks, metadata };
  }

  /**
   * Upload chunks sequentially with progress tracking
   */
  async uploadFile(
    file: File, 
    onProgress: (progress: UploadProgress) => void
  ): Promise<string> {
    const { chunks, metadata } = await this.createChunks(file);
    
    // First, initiate the upload
    const initiateResponse = await fetch('/api/upload/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        totalChunks: metadata.totalChunks,
        uploadId: this.uploadId
      })
    });

    if (!initiateResponse.ok) {
      throw new Error('Failed to initiate upload');
    }

    // Upload each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkMetadata = { ...metadata, chunkIndex: i };
      
      const formData = new FormData();
      formData.append('chunk', chunks[i]);
      formData.append('metadata', JSON.stringify(chunkMetadata));

      const response = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to upload chunk ${i + 1}/${chunks.length}`);
      }

      onProgress({
        chunkIndex: i,
        totalChunks: chunks.length,
        percentage: Math.round(((i + 1) / chunks.length) * 100)
      });
    }

    // Finalize the upload
    const finalizeResponse = await fetch('/api/upload/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId: this.uploadId })
    });

    if (!finalizeResponse.ok) {
      throw new Error('Failed to finalize upload');
    }

    const result = await finalizeResponse.json();
    return result.filePath;
  }

  getUploadId(): string {
    return this.uploadId;
  }
}
