'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';

interface BackupProgress {
  id: number;
  type: 'backup' | 'restore';
  tenant_slug: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_percent: number;
  current_step: string;
  error_message?: string;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action_url?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  backupProgress: BackupProgress[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  subscribeToBackup: (backupId: number) => void;
  unsubscribeFromBackup: (backupId: number) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
  apiUrl?: string;
  pollInterval?: number;
}

export function NotificationProvider({ 
  children, 
  apiUrl,
  pollInterval = 5000 
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [backupProgress, setBackupProgress] = useState<BackupProgress[]>([]);
  const [subscribedBackups, setSubscribedBackups] = useState<Set<number>>(new Set());

  // Poll for backup progress updates
  useEffect(() => {
    if (subscribedBackups.size === 0) return;

    const pollProgress = async () => {
      for (const backupId of subscribedBackups) {
        try {
          const response = await fetch(`${apiUrl}/api/platform/restore/progress/${backupId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('platform_token') || localStorage.getItem('auth_token')}`,
            },
          });

          if (response.ok) {
            const progress = await response.json();
            
            setBackupProgress(prev => {
              const existing = prev.findIndex(p => p.id === backupId);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = progress;
                return updated;
              }
              return [...prev, progress];
            });

            // Show toast notifications for status changes
            if (progress.status === 'completed') {
              toast.success(`${progress.type === 'restore' ? 'Restore' : 'Backup'} completed successfully!`);
              unsubscribeFromBackup(backupId);
            } else if (progress.status === 'failed') {
              toast.error(`${progress.type === 'restore' ? 'Restore' : 'Backup'} failed: ${progress.error_message}`);
              unsubscribeFromBackup(backupId);
            }
          }
        } catch (error) {
          console.error('Failed to poll backup progress:', error);
        }
      }
    };

    pollProgress();
    const interval = setInterval(pollProgress, pollInterval);

    return () => clearInterval(interval);
  }, [subscribedBackups, apiUrl, pollInterval]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast
    switch (notification.type) {
      case 'success':
        toast.success(notification.message);
        break;
      case 'error':
        toast.error(notification.message);
        break;
      case 'warning':
        toast.warning(notification.message);
        break;
      default:
        toast.info(notification.message);
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const subscribeToBackup = useCallback((backupId: number) => {
    setSubscribedBackups(prev => new Set([...prev, backupId]));
  }, []);

  const unsubscribeFromBackup = useCallback((backupId: number) => {
    setSubscribedBackups(prev => {
      const next = new Set(prev);
      next.delete(backupId);
      return next;
    });
    setBackupProgress(prev => prev.filter(p => p.id !== backupId));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        backupProgress,
        markAsRead,
        markAllAsRead,
        clearNotification,
        addNotification,
        subscribeToBackup,
        unsubscribeFromBackup,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Backup Progress Component
export function BackupProgressIndicator() {
  const { backupProgress } = useNotifications();

  if (backupProgress.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {backupProgress.map(progress => (
        <div
          key={progress.id}
          className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-4 w-80"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-900">
              {progress.type === 'restore' ? 'Restoring' : 'Backing up'}{' '}
              {progress.tenant_slug || 'Platform'}
            </span>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              progress.status === 'completed' ? 'bg-green-100 text-green-600' :
              progress.status === 'failed' ? 'bg-red-100 text-red-600' :
              progress.status === 'running' ? 'bg-blue-100 text-blue-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {progress.status}
            </span>
          </div>
          
          <div className="mb-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  progress.status === 'failed' ? 'bg-red-500' :
                  progress.status === 'completed' ? 'bg-green-500' :
                  'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`}
                style={{ width: `${progress.progress_percent}%` }}
              />
            </div>
          </div>
          
          <p className="text-xs text-gray-500 truncate">
            {progress.current_step || 'Initializing...'}
          </p>
          
          {progress.error_message && (
            <p className="text-xs text-red-500 mt-1 truncate">
              {progress.error_message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// Notification Bell with Dropdown
export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
      >
        <svg
          className="w-6 h-6 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 z-50 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 10).map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                        notification.type === 'success' ? 'bg-green-500' :
                        notification.type === 'error' ? 'bg-red-500' :
                        notification.type === 'warning' ? 'bg-amber-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
