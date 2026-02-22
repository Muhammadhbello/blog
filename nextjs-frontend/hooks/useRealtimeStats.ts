'use client';

import { useEffect, useState, useRef } from 'react';
import apiClient from '@/lib/api';

interface UseRealtimeStatsOptions {
  enabled?: boolean;
  interval?: number;
  onUpdate?: (newStats: any, previousStats: any) => void;
}

export function useRealtimeStats(
  fetchFunction: () => Promise<any>,
  options: UseRealtimeStatsOptions = {}
) {
  const { enabled = true, interval = 5000, onUpdate } = options;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const previousDataRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    try {
      const newData = await fetchFunction();
      
      if (previousDataRef.current && onUpdate) {
        onUpdate(newData, previousDataRef.current);
      }
      
      previousDataRef.current = newData;
      setData(newData);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchData();

    // Set up polling
    intervalRef.current = setInterval(fetchData, interval);

    // Pause polling when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      } else if (!document.hidden && !intervalRef.current) {
        intervalRef.current = setInterval(fetchData, interval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, interval]);

  return { data, loading, error, refetch: fetchData };
}
