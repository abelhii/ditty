import { useEffect, useState } from 'react';

/** Returns `value` delayed by `delayMs`, resetting the timer on every change — so a rapidly-changing
 *  value only "settles" after it stops changing for `delayMs`. Used to debounce the search input. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
