'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Registers the Service Worker from `/sw.js` and handles update lifecycle.
 * Returns helpers to check for updates and force-activate a waiting SW.
 */
export function useServiceWorker() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js').then(registration => {
      registrationRef.current = registration;

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    });
  }, []);

  const applyUpdate = useCallback(() => {
    const reg = registrationRef.current;
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, []);

  return { updateAvailable, applyUpdate };
}
