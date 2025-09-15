'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChunkedUploadCard } from '@/components/ChunkedUploadCard';
import { FileText, Zap, Shield } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [notesFilePath, setNotesFilePath] = useState<string>('');
  const [assetsFilePath, setAssetsFilePath] = useState<string>('');
  const [processingOptions, setProcessingOptions] = useState<{ clusteringK: number | 'auto'; groupingStrategy: string }>({
    clusteringK: 'auto',
    groupingStrategy: 'cluster'
  });

  const handleNotesUploadComplete = (filePath: string, fileName: string) => {
    setNotesFilePath(filePath);
  };

  const handleAssetsUploadComplete = (filePath: string, fileName: string) => {
    setAssetsFilePath(filePath);
  };

  const handleProcessFiles = async () => {
    if (!notesFilePath) {
      alert('Please upload your notes ZIP file first.');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/jobs/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notesFilePath,
          assetsFilePath: assetsFilePath || null,
          options: processingOptions
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create job');
      }

      const { jobId } = await response.json();
      router.push(`/job/${jobId}`);
    } catch (error) {
      console.error('Processing failed:', error);
      alert('Processing failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleData = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/jobs?action=sample', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to create sample job');
      }

      const { jobId } = await response.json();
      router.push(`/job/${jobId}`);
    } catch (error) {
      console.error('Sample data failed:', error);
      alert('Failed to load sample data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Notion Prep
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Transform your Markdown exports into Notion-ready organized sections. 
            Upload your notes and assets, and get a perfectly structured ZIP file ready for Notion import.
          </p>
          
          <div className="flex justify-center gap-4">
            <Button variant="outline" asChild>
              <a href="/how-it-works">How it works</a>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">Smart Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Automatically clusters your notes by content similarity, headings, or tags 
                to create logical sections for Notion.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-yellow-500 mb-2" />
              <CardTitle className="text-lg">Link Rewriting</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Intelligently rewrites internal links and image references to work 
                correctly in your new Notion structure.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-green-500 mb-2" />
              <CardTitle className="text-lg">Privacy First</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Your files are processed locally and automatically deleted after 24 hours. 
                No data is stored permanently.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Upload Your Files</CardTitle>
            <CardDescription className="text-center">
              Upload your Markdown notes and assets to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notes Upload */}
            <ChunkedUploadCard
              type="notes"
              onUploadComplete={handleNotesUploadComplete}
              onSampleData={() => {}}
              isLoading={isLoading}
            />

            {/* Assets Upload */}
            <ChunkedUploadCard
              type="assets"
              onUploadComplete={handleAssetsUploadComplete}
              onSampleData={() => {}}
              isLoading={isLoading}
            />

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
                    value={processingOptions.clusteringK}
                    onChange={(e) => setProcessingOptions({
                      ...processingOptions,
                      clusteringK: e.target.value === 'auto' ? 'auto' : parseInt(e.target.value)
                    })}
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
                    value={processingOptions.groupingStrategy}
                    onChange={(e) => setProcessingOptions({
                      ...processingOptions,
                      groupingStrategy: e.target.value
                    })}
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
                onClick={handleProcessFiles}
                disabled={!notesFilePath || isLoading}
                className="flex-1"
              >
                {isLoading ? 'Processing...' : 'Process Notes'}
              </Button>
              <Button
                variant="outline"
                onClick={handleSampleData}
                disabled={isLoading}
              >
                Try Sample Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-600 dark:text-gray-400">
          <p className="text-sm">
            Notion Prep processes your files locally and deletes them after 24 hours.
          </p>
          <p className="text-xs mt-2">
            Built with Next.js, TypeScript, and ❤️ for the Notion community.
          </p>
        </div>
      </div>
    </div>
  );
}