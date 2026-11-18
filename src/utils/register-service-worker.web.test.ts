import { registerServiceWorker } from '@/utils/register-service-worker.web';

const register = jest.fn(() => Promise.resolve());

beforeEach(() => {
  // jest-expo's test environment has no DOM; registration runs immediately when the page has loaded.
  Object.defineProperty(globalThis, 'document', { value: { readyState: 'complete' }, configurable: true });
  register.mockClear();
  Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
});

afterEach(() => {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  delete (globalThis as { document?: unknown }).document;
  jest.replaceProperty(process, 'env', { ...process.env, NODE_ENV: 'test' });
});

test('does nothing outside production', () => {
  registerServiceWorker();
  expect(register).not.toHaveBeenCalled();
});

test('registers sw.js under the base URL in production', () => {
  jest.replaceProperty(process, 'env', { ...process.env, NODE_ENV: 'production', EXPO_BASE_URL: '/ditty' });
  registerServiceWorker();
  expect(register).toHaveBeenCalledWith('/ditty/sw.js');
});

test('does nothing when service workers are unsupported', () => {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  jest.replaceProperty(process, 'env', { ...process.env, NODE_ENV: 'production' });
  expect(() => registerServiceWorker()).not.toThrow();
});
