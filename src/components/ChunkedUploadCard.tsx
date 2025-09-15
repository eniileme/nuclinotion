'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Image, X, Zap } from 'lucide-react';
import { ChunkedUploader } from '@/lib/chunkedUpload';

interface ChunkedUploadCardProps {
  onUploadComplete: (filePath: string, fileName: string) => void;
  onSampleData: () => void;
  isLoading: boolean;
  type: 'notes' | 'assets';
}

export function ChunkedUploadCard({ 
  onUploadComplete, 
  onSampleData, 
  isLoading, 
  type 
}: ChunkedUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMethod, setUploadMethod] = useState<'regular' | 'chunked'>('regular');
  const [dragOver, setDragOver] = useState<boolean>(false);

  const isLargeFile = file && file.size > 10 * 1024 * 1024; // 10MB threshold for chunked upload

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find(file => file.name.endsWith('.zip'));
    
    if (zipFile) {
      setFile(zipFile);
      // Auto-select chunked upload for large files
      if (zipFile.size > 50 * 1024 * 1024) {
        setUploadMethod('chunked');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-select chunked upload for large files
      if (selectedFile.size > 50 * 1024 * 1024) {
        setUploadMethod('chunked');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      if (uploadMethod === 'chunked') {
        const uploader = new ChunkedUploader();
        
        await uploader.uploadFile(file, (progress) => {
          setUploadProgress(progress.percentage);
        });
        
        onUploadComplete(`/tmp/uploads/${uploader.getUploadId()}_${file.name}`, file.name);
      } else {
        // Regular upload for smaller files
        const formData = new FormData();
        formData.append(type === 'notes' ? 'notesZip' : 'assetsZip', file);
        
        const response = await fetch('/api/jobs', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        onUploadComplete(file.name, file.name);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'notes' ? <FileText className="h-5 w-5" /> : <Image className="h-5 w-5" />}
          {type === 'notes' ? 'Notes' : 'Assets'} (.zip)
          {type === 'assets' && <span className="text-sm font-normal text-gray-500">(Optional)</span>}
        </CardTitle>
        <CardDescription>
          {type === 'notes' 
            ? 'Upload your markdown files' 
            : 'Upload your images and assets'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Method Selection */}
        {file && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Upload Method:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="regular"
                  checked={uploadMethod === 'regular'}
                  onChange={(e) => setUploadMethod(e.target.value as 'regular')}
                  disabled={isLargeFile || false}
                />
                <span className="text-sm">Regular (up to 10MB)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="chunked"
                  checked={uploadMethod === 'chunked'}
                  onChange={(e) => setUploadMethod(e.target.value as 'chunked')}
                />
                <span className="text-sm flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Chunked (up to 2GB)
                </span>
              </label>
            </div>
            {isLargeFile && uploadMethod === 'regular' && (
              <p className="text-xs text-orange-600">
                Large file detected. Chunked upload recommended.
              </p>
            )}
          </div>
        )}

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {type === 'notes' ? <FileText className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                  <div>
                    <div className="text-sm font-medium">{file.name}</div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {uploadMethod === 'chunked' ? 'Uploading chunks...' : 'Uploading...'}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          ) : (
            <div>
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Drag and drop your {type} ZIP file here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supports files up to 2GB with chunked upload
              </p>
              <input
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="mt-2"
                disabled={isUploading}
              />
            </div>
          )}
        </div>

        {/* Upload Button */}
        {file && !isUploading && (
          <Button
            onClick={handleUpload}
            disabled={isLoading}
            className="w-full"
          >
            {uploadMethod === 'chunked' ? (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Upload Large File ({formatFileSize(file.size)})
              </>
            ) : (
              `Upload ${type === 'notes' ? 'Notes' : 'Assets'}`
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
