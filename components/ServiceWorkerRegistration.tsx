'use client';

import { useEffect } from 'react';

const ENABLE_SERVICE_WORKER =
  process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER === undefined ||
  process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER === 'true';

  export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const manageServiceWorker = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();

      if (!ENABLE_SERVICE_WORKER) {
        await Promise.all(registrations.map(registration => registration.unregister()));
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        }
        console.info('🧹 Service workers unregistered (NEXT_PUBLIC_ENABLE_SERVICE_WORKER=false)');
        return;
      }

      const hasExisting = registrations.some(registration =>
        registration.active?.scriptURL.includes('/sw.js'),
      );

      if (hasExisting) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered:', registration);
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    };

    void manageServiceWorker();
  }, []);

  return null; // This component doesn't render anything
}
