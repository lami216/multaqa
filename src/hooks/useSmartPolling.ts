import { useCallback, useEffect, useRef } from 'react';

interface UseSmartPollingOptions {
  interval: number;
  fetchFn: () => Promise<void>;
  enabled: boolean;
}

export const useSmartPolling = ({ interval, fetchFn, enabled }: UseSmartPollingOptions) => {
  const inFlightRef = useRef(false);
  const fetchRef = useRef(fetchFn);

  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  const runFetch = useCallback(async () => {
    if (inFlightRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    inFlightRef.current = true;
    try {
      await fetchRef.current();
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    void runFetch();
    const timer = window.setInterval(() => {
      void runFetch();
    }, interval);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void runFetch();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, interval, runFetch]);
};
