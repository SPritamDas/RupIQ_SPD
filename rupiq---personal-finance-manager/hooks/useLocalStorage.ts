
import { useState, useEffect, useCallback } from 'react';

// Define a unique event name for this application to avoid conflicts
const LOCAL_STORAGE_CHANGED_EVENT_NAME = 'rupiq-local-storage-changed';

interface LocalStorageChangedEventDetail {
  key: string;
  // newValue: string | null; // We will re-read from storage, so newValue is not strictly needed here
}

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prevState: T) => T)) => void] {
  // Function to get the current value from localStorage
  const getStoredValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  // State to store the value, initialized by reading from localStorage
  const [storedValue, setStoredValueState] = useState<T>(getStoredValue);

  // Function to update the value in localStorage and state
  const setValue = useCallback(
    (value: T | ((prevState: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        if (typeof window !== 'undefined') {
          const oldValue = window.localStorage.getItem(key);
          const newValueString = JSON.stringify(valueToStore);

          if (oldValue !== newValueString) {
            window.localStorage.setItem(key, newValueString);
            // Dispatch a custom event for same-tab listeners
            window.dispatchEvent(
              new CustomEvent<LocalStorageChangedEventDetail>(LOCAL_STORAGE_CHANGED_EVENT_NAME, {
                detail: { key },
              })
            );
          }
        }
        // Update the state of the current hook instance
        setStoredValueState(valueToStore);
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue] 
  );

  useEffect(() => {
    // Handler for our custom event (same-tab updates)
    const handleCustomStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent<LocalStorageChangedEventDetail>;
      if (customEvent.detail?.key === key) {
        setStoredValueState(getStoredValue());
      }
    };

    // Handler for native 'storage' event (cross-tab updates)
    const handleNativeStorageEvent = (event: StorageEvent) => {
      if (event.key === key) {
        // Note: event.newValue would be the stringified new value.
        // We re-read to ensure consistency with JSON.parse and initialValue logic.
        setStoredValueState(getStoredValue());
      }
    };

    // Add event listeners
    window.addEventListener(LOCAL_STORAGE_CHANGED_EVENT_NAME, handleCustomStorageChange);
    window.addEventListener('storage', handleNativeStorageEvent);
    
    // This call ensures that on mount, or if getStoredValue becomes a new function 
    // (e.g. if `initialValue` is a new reference like `[]` causing `getStoredValue` to be unstable),
    // we re-fetch from localStorage. This is crucial for freshness when a component
    // like Dashboard mounts or re-renders after navigation.
    setStoredValueState(getStoredValue());

    // Cleanup: remove event listeners when the component unmounts
    return () => {
      window.removeEventListener(LOCAL_STORAGE_CHANGED_EVENT_NAME, handleCustomStorageChange);
      window.removeEventListener('storage', handleNativeStorageEvent);
    };
  }, [key, getStoredValue]); // getStoredValue is a dependency. If initialValue is always a new `[]`, 
                             // getStoredValue is unstable, causing this effect to re-run on host component re-renders,
                             // which helps in re-syncing.

  return [storedValue, setValue];
}

export default useLocalStorage;
