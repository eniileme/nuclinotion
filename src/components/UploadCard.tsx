'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Image, X } from 'lucide-react';

interface UploadCardProps {
  onUpload: (data: { notesZip: File; assetsZip?: File; options: { clusteringK: number | 'auto'; groupingStrategy: string } }) => void;
  onSampleData: () => void;
  isLoading: boolean;
}

export function UploadCard({ onUpload, onSampleData, isLoading }: UploadCardProps) {
  const [notesFile, setNotesFile] = useState<File | null>(null);
  const [assetsFile, setAssetsFile] = useState<File | null>(null);
  const [clusteringK, setClusteringK] = useState<string>('auto');
  const [groupingStrategy, setGroupingStrategy] = useState<string>('cluster');
  const [dragOver, setDragOver] = useState<'notes' | 'assets' | null>(null);

  const handleNotesDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find(file => file.name.endsWith('.zip'));
    
    if (zipFile) {
      setNotesFile(zipFile);
    }
  }, []);

  const handleAssetsDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find(file => file.name.endsWith('.zip'));
    
    if (zipFile) {
      setAssetsFile(zipFile);
    }
  }, []);

  const handleNotesFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNotesFile(file);
    }
  };

  const handleAssetsFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAssetsFile(file);
    }
  };

  const handleSubmit = () => {
    if (!notesFile) return;

    const options = {
      clusteringK: clusteringK === 'auto' ? 'auto' as const : parseInt(clusteringK),
      groupingStrategy
    };

    onUpload({
      notesZip: notesFile,
      assetsZip: assetsFile || undefined,
      options
    });
  };

  const removeFile = (type: 'notes' | 'assets') => {
    if (type === 'notes') {
      setNotesFile(null);
    } else {
      setAssetsFile(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notes Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notes (.zip or folder)
          </CardTitle>
          <CardDescription>
            Upload a ZIP file containing your markdown files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver === 'notes'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver('notes');
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={handleNotesDrop}
          >
            {notesFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{notesFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(notesFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile('notes')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag and drop your notes ZIP file here, or click to browse
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum file size: 50MB
                </p>
                <Input
                  type="file"
                  accept=".zip"
                  onChange={handleNotesFileSelect}
                  className="mt-2"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assets Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Assets (.zip or folder) - Optional
          </CardTitle>
          <CardDescription>
            Upload a ZIP file containing your images and other assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver === 'assets'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver('assets');
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={handleAssetsDrop}
          >
            {assetsFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  <span className="text-sm">{assetsFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(assetsFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile('assets')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag and drop your assets ZIP file here, or click to browse
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum file size: 50MB
                </p>
                <Input
                  type="file"
                  accept=".zip"
                  onChange={handleAssetsFileSelect}
                  className="mt-2"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing Options */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Options</CardTitle>
          <CardDescription>
            Configure how your notes should be organized
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Clustering K (number of sections)
            </label>
            <select
              value={clusteringK}
              onChange={(e) => setClusteringK(e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              <option value="auto">Auto (recommended)</option>
              <option value="3">3 sections</option>
              <option value="4">4 sections</option>
              <option value="5">5 sections</option>
              <option value="6">6 sections</option>
              <option value="8">8 sections</option>
              <option value="10">10 sections</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Grouping Strategy
            </label>
            <select
              value={groupingStrategy}
              onChange={(e) => setGroupingStrategy(e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              <option value="cluster">Cluster by content similarity</option>
              <option value="headings">Group by first heading</option>
              <option value="tags">Group by first tag</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={handleSubmit}
          disabled={!notesFile || isLoading}
          className="flex-1"
        >
          {isLoading ? 'Processing...' : 'Process Notes'}
        </Button>
        <Button
          variant="outline"
          onClick={onSampleData}
          disabled={isLoading}
        >
          Try Sample Data
        </Button>
      </div>
    </div>
  );
}
