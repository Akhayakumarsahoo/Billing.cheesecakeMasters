'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export default function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      // Do not activate service worker caching in development / localhost mode
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
        if ('caches' in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => caches.delete(key));
          });
        }
        return;
      }

      if ((window as any).workbox !== undefined) return;
      // Register service worker on window load
      const handleLoad = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registered with scope:', registration.scope);

            // Listen for service worker updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // There is a new updated service worker in waiting state
                    toast.info('New app update available! Click here or refresh to load the latest version.', {
                      duration: 10000,
                      action: {
                        label: 'Update Now',
                        onClick: () => {
                          window.location.reload();
                        },
                      },
                    });
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('[PWA] Service Worker registration failed:', error);
          });
      };

      const registerDeferred = () => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(handleLoad, { timeout: 3000 });
        } else {
          setTimeout(handleLoad, 2000);
        }
      };

      if (document.readyState === 'complete') {
        registerDeferred();
      } else {
        const onLoad = () => registerDeferred();
        window.addEventListener('load', onLoad);
        return () => window.removeEventListener('load', onLoad);
      }
    }
  }, []);

  return null;
}
