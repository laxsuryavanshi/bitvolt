'use client';

import { useState, useSyncExternalStore } from 'react';

export interface NetworkStatus {
  /** Whether the browser reports being online. */
  isOnline: boolean;

  /** Timestamp of the last online→offline or offline→online transition. */
  lastChangedAt: number;
}

const subscribe = (callback: () => void) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);

  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};
const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

/**
 * Subscribes to browser online/offline events and exposes current state.
 * Falls back to `true` if the API is not available.
 */
export function useNetworkStatus(): NetworkStatus {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [lastChangedAt, setLastChangedAt] = useState(() => Date.now());
  const [prevIsOnline, setPrevIsOnline] = useState(isOnline);

  if (prevIsOnline !== isOnline) {
    setPrevIsOnline(isOnline);
    setLastChangedAt(() => Date.now());
  }

  return { isOnline, lastChangedAt };
}
