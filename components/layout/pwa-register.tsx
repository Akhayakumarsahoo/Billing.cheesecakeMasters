'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export default function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      (window as any).workbox === undefined // Avoid duplicate registrations in dev tools if multiple run
    ) {
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

      if (document.readyState === 'complete') {
        handleLoad();
      } else {
        window.addEventListener('load', handleLoad);
        return () => window.removeEventListener('load', handleLoad);
      }
    }
  }, []);

  return null;
}
