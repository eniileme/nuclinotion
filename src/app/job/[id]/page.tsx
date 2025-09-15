'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressComponent } from '@/components/Progress';
import { SectionPreview } from '@/components/SectionPreview';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Download, ArrowLeft, RefreshCw } from 'lucide-react';
import { JobStatus, Section } from '@/lib/types';

export default function JobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [isRepackaging, setIsRepackaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/status`);
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }
        
        const jobStatus = await response.json();
        setStatus(jobStatus);
        
        if (jobStatus.status === 'ready' && jobStatus.result) {
          setSections(jobStatus.result.sections || []);
        }
        
        if (jobStatus.status === 'error') {
          setError(jobStatus.error || 'Unknown error occurred');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      }
    };

    // Poll immediately
    pollStatus();

    // Set up polling interval
    const interval = setInterval(pollStatus, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'notion_ready.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleRename = async (sectionId: string, newLabel: string) => {
    // Update local state immediately for better UX
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, label: newLabel }
        : section
    ));
  };

  const handleRepackage = async () => {
    setIsRepackaging(true);
    try {
      // In a real implementation, you'd call an API to repackage with new section names
      // For now, we'll just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh the job status to get updated results
      const response = await fetch(`/api/jobs/${jobId}/status`);
      if (response.ok) {
        const jobStatus = await response.json();
        if (jobStatus.status === 'ready' && jobStatus.result) {
          setSections(jobStatus.result.sections || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repackaging failed');
    } finally {
      setIsRepackaging(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    // Refresh the page to restart polling
    window.location.reload();
  };

  if (error && !status) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorNotice error={error} onRetry={handleRetry} />
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-600 dark:text-gray-400">Loading job status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Job Status
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Job ID: {jobId}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <ProgressComponent
            status={status.status}
            progress={status.progress}
            message={status.message}
            error={status.error}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8">
            <ErrorNotice error={error} onRetry={handleRetry} />
          </div>
        )}

        {/* Results */}
        {status.status === 'ready' && sections.length > 0 && (
          <div className="mb-8">
            <SectionPreview
              sections={sections}
              onRename={handleRename}
              onRepackage={handleRepackage}
              isRepackaging={isRepackaging}
            />
          </div>
        )}

        {/* Download Button */}
        {status.status === 'ready' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Ready for Download</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your Notion-ready files are processed and ready to download.
                </p>
                <Button
                  onClick={handleDownload}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download notion_ready.zip
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Job Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Created:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  {new Date(status.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="font-medium">Expires:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  {new Date(status.expiresAt).toLocaleString()}
                </span>
              </div>
              {status.result && (
                <>
                  <div>
                    <span className="font-medium">Total Notes:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      {status.result.totalNotes}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Total Assets:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      {status.result.totalAssets}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
