'use client';

import React from 'react';
import { useBackupProgress, useSmsProgress } from '@/hooks/useRealtime';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  HardDrive, 
  MessageSquare,
  Clock
} from 'lucide-react';

interface BackupProgressIndicatorProps {
  backupId: string;
  onComplete?: () => void;
  onError?: (message: string) => void;
}

export function BackupProgressIndicator({ backupId, onComplete, onError }: BackupProgressIndicatorProps) {
  const progress = useBackupProgress(backupId);

  React.useEffect(() => {
    if (progress?.status === 'completed') {
      onComplete?.();
    } else if (progress?.status === 'failed') {
      onError?.(progress.message);
    }
  }, [progress?.status, onComplete, onError]);

  if (!progress) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-600">Initializing backup...</span>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-900">Backup Progress</span>
        </div>
        {getStatusIcon()}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getStatusColor()} transition-all duration-300 ease-out`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      {/* Status Info */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{progress.step || progress.message}</span>
        <span className="font-medium text-gray-900">{progress.progress}%</span>
      </div>

      {progress.status === 'failed' && progress.message && (
        <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-sm text-red-700">
          {progress.message}
        </div>
      )}
    </div>
  );
}

interface SmsProgressIndicatorProps {
  batchId: string;
  onComplete?: () => void;
  onError?: (message: string) => void;
}

export function SmsProgressIndicator({ batchId, onComplete, onError }: SmsProgressIndicatorProps) {
  const progress = useSmsProgress(batchId);

  React.useEffect(() => {
    if (progress?.status === 'completed') {
      onComplete?.();
    } else if (progress?.status === 'failed') {
      onError?.(progress.message);
    }
  }, [progress?.status, onComplete, onError]);

  if (!progress) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-600">Preparing to send messages...</span>
      </div>
    );
  }

  const percentage = progress.total > 0 
    ? Math.round(((progress.sent + progress.failed) / progress.total) * 100) 
    : 0;

  const getStatusColor = () => {
    if (progress.status === 'completed') return 'bg-green-500';
    if (progress.status === 'failed') return 'bg-red-500';
    if (progress.failed > 0) return 'bg-amber-500';
    return 'bg-purple-500';
  };

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-purple-500" />
          <span className="font-medium text-gray-900">Sending SMS Messages</span>
        </div>
        {progress.status === 'completed' ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : progress.status === 'failed' ? (
          <XCircle className="h-5 w-5 text-red-500" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getStatusColor()} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-gray-900">{progress.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-600">{progress.sent}</div>
          <div className="text-xs text-gray-500">Sent</div>
        </div>
        <div>
          <div className="text-lg font-bold text-red-600">{progress.failed}</div>
          <div className="text-xs text-gray-500">Failed</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-600">
            {progress.total - progress.sent - progress.failed}
          </div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
      </div>

      {progress.message && (
        <div className="text-sm text-gray-600 text-center">{progress.message}</div>
      )}
    </div>
  );
}

// Compact progress bar for use in tables/lists
interface CompactProgressBarProps {
  progress: number;
  status: 'in_progress' | 'completed' | 'failed';
  label?: string;
}

export function CompactProgressBar({ progress, status, label }: CompactProgressBarProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getStatusColor()} transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-12 text-right">
        {label || `${progress}%`}
      </span>
      {status === 'in_progress' && (
        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      )}
      {status === 'completed' && (
        <CheckCircle2 className="h-3 w-3 text-green-500" />
      )}
      {status === 'failed' && (
        <XCircle className="h-3 w-3 text-red-500" />
      )}
    </div>
  );
}

// Toast notification component for real-time updates
interface RealtimeToastProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  onClose?: () => void;
}

export function RealtimeToast({ type, title, message, onClose }: RealtimeToastProps) {
  const colors = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  const icons = {
    info: <Clock className="h-5 w-5" />,
    success: <CheckCircle2 className="h-5 w-5" />,
    warning: <Clock className="h-5 w-5" />,
    error: <XCircle className="h-5 w-5" />,
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${colors[type]} animate-slide-in`}>
      {icons[type]}
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-sm opacity-80">{message}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="opacity-50 hover:opacity-100">
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
