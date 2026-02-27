'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Pusher from 'pusher-js';
import apiClient from '@/lib/api';

interface PusherConfig {
  key: string;
  cluster: string;
  encrypted: boolean;
  auth_endpoint: string;
}

interface UseRealtimeOptions {
  channels: string[];
  onMessage?: (channel: string, event: string, data: any) => void;
  onBackupProgress?: (data: BackupProgress) => void;
  onRestoreProgress?: (data: RestoreProgress) => void;
  onSmsProgress?: (data: SmsProgress) => void;
  onPaymentReceived?: (data: PaymentNotification) => void;
  onNotification?: (data: Notification) => void;
}

interface BackupProgress {
  backup_id: string;
  progress: number;
  status: 'in_progress' | 'completed' | 'failed';
  message: string;
  step: string;
}

interface RestoreProgress {
  restore_id: string;
  progress: number;
  status: 'in_progress' | 'completed' | 'failed';
  message: string;
  step: string;
}

interface SmsProgress {
  batch_id: string;
  sent: number;
  failed: number;
  total: number;
  status: 'in_progress' | 'completed' | 'failed';
  message: string;
}

interface PaymentNotification {
  invoice_id: string;
  business_name: string;
  amount: number;
  payment_method: string;
}

interface Notification {
  title: string;
  message: string;
  notification_type: 'info' | 'success' | 'warning' | 'error';
}

// Global Pusher instance
let pusherInstance: Pusher | null = null;
let pusherConfig: PusherConfig | null = null;

export function useRealtime(options: UseRealtimeOptions) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscribedChannels = useRef<Set<string>>(new Set());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollTimestamp = useRef<string | null>(null);

  // Initialize Pusher
  const initPusher = useCallback(async () => {
    try {
      // Fetch Pusher config if not cached
      if (!pusherConfig) {
        const response = await apiClient.get('/api/realtime/pusher/config');
        pusherConfig = response.data;
      }

      // Skip if no Pusher key configured
      if (!pusherConfig?.key) {
        console.log('Pusher not configured, using polling fallback');
        return false;
      }

      // Create Pusher instance if not exists
      if (!pusherInstance) {
        pusherInstance = new Pusher(pusherConfig.key, {
          cluster: pusherConfig.cluster,
          forceTLS: pusherConfig.encrypted,
          authEndpoint: pusherConfig.auth_endpoint,
          auth: {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        });

        pusherInstance.connection.bind('connected', () => {
          setConnected(true);
          setError(null);
        });

        pusherInstance.connection.bind('error', (err: any) => {
          console.error('Pusher connection error:', err);
          setError('Connection error');
          setConnected(false);
        });

        pusherInstance.connection.bind('disconnected', () => {
          setConnected(false);
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to initialize Pusher:', err);
      return false;
    }
  }, []);

  // Subscribe to channels
  const subscribeToChannels = useCallback(() => {
    if (!pusherInstance) return;

    options.channels.forEach((channelName) => {
      if (subscribedChannels.current.has(channelName)) return;

      const channel = pusherInstance!.subscribe(channelName);
      subscribedChannels.current.add(channelName);

      // Bind to events
      channel.bind('backup.progress', (data: BackupProgress) => {
        options.onBackupProgress?.(data);
        options.onMessage?.(channelName, 'backup.progress', data);
      });

      channel.bind('restore.progress', (data: RestoreProgress) => {
        options.onRestoreProgress?.(data);
        options.onMessage?.(channelName, 'restore.progress', data);
      });

      channel.bind('sms.progress', (data: SmsProgress) => {
        options.onSmsProgress?.(data);
        options.onMessage?.(channelName, 'sms.progress', data);
      });

      channel.bind('payment.received', (data: PaymentNotification) => {
        options.onPaymentReceived?.(data);
        options.onMessage?.(channelName, 'payment.received', data);
      });

      channel.bind('notification', (data: Notification) => {
        options.onNotification?.(data);
        options.onMessage?.(channelName, 'notification', data);
      });

      // Catch-all for custom events
      channel.bind_global((event: string, data: any) => {
        if (!['backup.progress', 'restore.progress', 'sms.progress', 'payment.received', 'notification'].includes(event)) {
          options.onMessage?.(channelName, event, data);
        }
      });
    });
  }, [options]);

  // Polling fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    const poll = async () => {
      try {
        for (const channel of options.channels) {
          const response = await apiClient.get('/api/realtime/poll', {
            params: {
              channel,
              since: lastPollTimestamp.current,
            },
          });

          const { messages, timestamp } = response.data;
          lastPollTimestamp.current = timestamp;

          messages.forEach((msg: any) => {
            const { event, payload } = msg;

            switch (event) {
              case 'backup.progress':
                options.onBackupProgress?.(payload);
                break;
              case 'restore.progress':
                options.onRestoreProgress?.(payload);
                break;
              case 'sms.progress':
                options.onSmsProgress?.(payload);
                break;
              case 'payment.received':
                options.onPaymentReceived?.(payload);
                break;
              case 'notification':
                options.onNotification?.(payload);
                break;
              default:
                options.onMessage?.(channel, event, payload);
            }
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // Initial poll
    poll();

    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(poll, 3000);
  }, [options]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const pusherReady = await initPusher();
      
      if (pusherReady) {
        subscribeToChannels();
      } else {
        // Fallback to polling
        startPolling();
      }
    };

    init();

    return () => {
      // Unsubscribe from channels
      subscribedChannels.current.forEach((channelName) => {
        pusherInstance?.unsubscribe(channelName);
      });
      subscribedChannels.current.clear();
      
      // Stop polling
      stopPolling();
    };
  }, [initPusher, subscribeToChannels, startPolling, stopPolling]);

  // Manual trigger to poll specific progress
  const pollBackupProgress = useCallback(async (backupId: string): Promise<BackupProgress | null> => {
    try {
      const response = await apiClient.get(`/api/realtime/backup/${backupId}/progress`);
      if (response.data.status !== 'not_found') {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to poll backup progress:', err);
      return null;
    }
  }, []);

  const pollRestoreProgress = useCallback(async (restoreId: string): Promise<RestoreProgress | null> => {
    try {
      const response = await apiClient.get(`/api/realtime/restore/${restoreId}/progress`);
      if (response.data.status !== 'not_found') {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to poll restore progress:', err);
      return null;
    }
  }, []);

  const pollSmsProgress = useCallback(async (batchId: string): Promise<SmsProgress | null> => {
    try {
      const response = await apiClient.get(`/api/realtime/sms/${batchId}/progress`);
      if (response.data.status !== 'not_found') {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Failed to poll SMS progress:', err);
      return null;
    }
  }, []);

  return {
    connected,
    error,
    pollBackupProgress,
    pollRestoreProgress,
    pollSmsProgress,
  };
}

// Hook for backup-specific real-time updates
export function useBackupProgress(backupId: string | null) {
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!backupId) return;

    const pollProgress = async () => {
      try {
        const response = await apiClient.get(`/api/realtime/backup/${backupId}/progress`);
        if (response.data.status !== 'not_found') {
          setProgress(response.data);
          
          // Stop polling if completed or failed
          if (response.data.status === 'completed' || response.data.status === 'failed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        }
      } catch (err) {
        console.error('Failed to poll backup progress:', err);
      }
    };

    // Initial poll
    pollProgress();

    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(pollProgress, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [backupId]);

  return progress;
}

// Hook for SMS batch progress
export function useSmsProgress(batchId: string | null) {
  const [progress, setProgress] = useState<SmsProgress | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!batchId) return;

    const pollProgress = async () => {
      try {
        const response = await apiClient.get(`/api/realtime/sms/${batchId}/progress`);
        if (response.data.status !== 'not_found') {
          setProgress(response.data);
          
          if (response.data.status === 'completed' || response.data.status === 'failed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        }
      } catch (err) {
        console.error('Failed to poll SMS progress:', err);
      }
    };

    pollProgress();
    pollIntervalRef.current = setInterval(pollProgress, 1500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [batchId]);

  return progress;
}
