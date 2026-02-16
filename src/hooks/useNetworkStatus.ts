'use client';

import { useEffect, useState } from 'react';

export interface NetworkStatus {
  /** Whether the browser reports being online. */
  isOnline: boolean;

  /** Timestamp of the last online→offline or offline→online transition. */
  lastChangedAt: number;
}

/**
 * Subscribes to browser online/offline events and exposes current state.
 * Falls back to `true` if the API is not available.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastChangedAt, setLastChangedAt] = useState(Date.now);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setLastChangedAt(Date.now());
    };
    const goOffline = () => {
      setIsOnline(false);
      setLastChangedAt(Date.now());
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return { isOnline, lastChangedAt };
}
