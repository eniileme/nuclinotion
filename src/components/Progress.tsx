'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';

interface ProgressProps {
  status: string;
  progress: number;
  message: string;
  error?: string;
}

const statusConfig = {
  uploading: { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  scanning: { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  clustering: { icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950' },
  rewriting: { icon: Clock, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950' },
  packaging: { icon: Clock, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950' },
  ready: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-950' },
  error: { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950' }
};

const steps = [
  { key: 'uploading', label: 'Uploading', description: 'Processing your files' },
  { key: 'scanning', label: 'Scanning', description: 'Reading markdown files' },
  { key: 'clustering', label: 'Clustering', description: 'Analyzing content' },
  { key: 'rewriting', label: 'Rewriting', description: 'Updating links and images' },
  { key: 'packaging', label: 'Packaging', description: 'Creating download package' },
  { key: 'ready', label: 'Ready', description: 'Download available' }
];

export function ProgressComponent({ status, progress, message, error }: ProgressProps) {
  const currentStepIndex = steps.findIndex(step => step.key === status);
  const StatusIcon = statusConfig[status as keyof typeof statusConfig]?.icon || Clock;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 ${statusConfig[status as keyof typeof statusConfig]?.color}`} />
          Processing Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{message}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isError = status === 'error' && index === currentStepIndex;
            
            let iconColor = 'text-gray-400';
            let bgColor = 'bg-gray-50 dark:bg-gray-900';
            
            if (isCompleted) {
              iconColor = 'text-green-500';
              bgColor = 'bg-green-50 dark:bg-green-950';
            } else if (isCurrent) {
              iconColor = statusConfig[status as keyof typeof statusConfig]?.color || 'text-blue-500';
              bgColor = statusConfig[status as keyof typeof statusConfig]?.bgColor || 'bg-blue-50 dark:bg-blue-950';
            }
            
            const Icon = isCompleted ? CheckCircle : 
                        isError ? AlertCircle : 
                        isCurrent ? StatusIcon : Clock;
            
            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${bgColor}`}
              >
                <Icon className={`h-5 w-5 ${iconColor}`} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{step.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {step.description}
                  </div>
                </div>
                {isCurrent && (
                  <div className="text-xs text-gray-500">
                    {progress}%
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Status-specific content */}
        {status === 'ready' && (
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
              <Download className="h-4 w-4" />
              <span className="font-medium">Ready for Download</span>
            </div>
            <p className="text-green-600 dark:text-green-400 text-sm">
              Your Notion-ready files are ready! Click the download button below to get your ZIP file.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
