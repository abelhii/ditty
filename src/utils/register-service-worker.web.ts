/**
 * Registers public/sw.js (installability + offline app shell) in production builds only. The URL
 * carries `experiments.baseUrl`, so the worker's default scope is the app's own subpath.
 */
export function registerServiceWorker(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker.register(`${process.env.EXPO_BASE_URL ?? ''}/sw.js`).catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
