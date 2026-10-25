'use client';

import { useEffect } from 'react';

/** Registers the offline service worker (production only, so dev reloads stay predictable). */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is optional */
    });
  }, []);
  return null;
}
