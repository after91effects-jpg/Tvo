'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Custom event name for cross-component synchronization within the same window
const STORAGE_EVENT_NAME = 'confetto_local_storage_sync';

export function notifyStorageUpdate(key?: string) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, { detail: { key } }));
    } catch {
      // ignore
    }
  }
}

export function useLocalStorageString(
  key: string,
  defaultValue: string
): [string, (val: string) => void] {
  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  // Initialize with defaultValue on SSR and initial client render to avoid hydration mismatch
  const [value, setValueState] = useState<string>(defaultValue);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const readCurrent = () => {
      try {
        const item = localStorage.getItem(key);
        const resolved = item !== null ? item : defaultValueRef.current;
        if (resolved !== valueRef.current) {
          setValueState(resolved);
        }
      } catch {
        // ignore
      }
    };

    // Read stored value safely after hydration
    readCurrent();

    const handleCustomSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      if (!customEvent.detail?.key || customEvent.detail.key === key) {
        readCurrent();
      }
    };

    const handleWindowStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === key) {
        readCurrent();
      }
    };

    window.addEventListener(STORAGE_EVENT_NAME, handleCustomSync);
    window.addEventListener('storage', handleWindowStorage);

    return () => {
      window.removeEventListener(STORAGE_EVENT_NAME, handleCustomSync);
      window.removeEventListener('storage', handleWindowStorage);
    };
  }, [key]);

  const setValue = useCallback(
    (newVal: string) => {
      setValueState(newVal);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(key, newVal);
          setTimeout(() => {
            notifyStorageUpdate(key);
          }, 0);
        } catch (e) {
          console.warn('Error saving to localStorage:', e);
        }
      }
    },
    [key]
  );

  return [value, setValue];
}

export function useLocalStorageJSON<T>(
  key: string,
  defaultValue: T
): [T, (valOrFn: T | ((prev: T) => T)) => void] {
  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  // Initialize with defaultValue on SSR and initial client render to avoid hydration mismatch
  const [value, setValueState] = useState<T>(defaultValue);
  const lastJsonRef = useRef<string | null>(null);

  useEffect(() => {
    const readCurrent = () => {
      try {
        const item = localStorage.getItem(key);
        if (item !== lastJsonRef.current) {
          lastJsonRef.current = item;
          if (item !== null) {
            setValueState(JSON.parse(item));
          } else {
            setValueState(defaultValueRef.current);
          }
        }
      } catch {
        // ignore
      }
    };

    // Read stored value safely after hydration
    readCurrent();

    const handleCustomSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      if (!customEvent.detail?.key || customEvent.detail.key === key) {
        readCurrent();
      }
    };

    const handleWindowStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === key) {
        readCurrent();
      }
    };

    window.addEventListener(STORAGE_EVENT_NAME, handleCustomSync);
    window.addEventListener('storage', handleWindowStorage);

    return () => {
      window.removeEventListener(STORAGE_EVENT_NAME, handleCustomSync);
      window.removeEventListener('storage', handleWindowStorage);
    };
  }, [key]);

  const setValue = useCallback(
    (valOrFn: T | ((prev: T) => T)) => {
      setValueState((prev) => {
        const next = typeof valOrFn === 'function' ? (valOrFn as (prev: T) => T)(prev) : valOrFn;
        if (typeof window !== 'undefined') {
          try {
            const raw = JSON.stringify(next);
            lastJsonRef.current = raw;
            localStorage.setItem(key, raw);
            setTimeout(() => {
              notifyStorageUpdate(key);
            }, 0);
          } catch (e) {
            console.warn('Error saving JSON to localStorage:', e);
          }
        }
        return next;
      });
    },
    [key]
  );

  return [value, setValue];
}



