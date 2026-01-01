import React, { createContext, useCallback, useContext, useState } from 'react';

/**
 * @typedef {{ announce: (text: string) => void }} LiveContextValue
 */
const noop = () => undefined;
/** @type {import('react').Context<LiveContextValue>} */
const LiveContext = createContext({ announce: noop });

export function LiveAnnouncerProvider({ children }) {
  const [message, setMessage] = useState('');

  const announce = useCallback((text /** @type {string} */) => {
    if (!text) return;
    const next = String(text);
    setMessage('');
    requestAnimationFrame(() => setMessage(next));
  }, []);

  return (
    <LiveContext.Provider value={{ announce }}>
      {children}
      <div aria-live="polite" className="sr-only">
        {message}
      </div>
    </LiveContext.Provider>
  );
}

export function useLiveAnnouncer() {
  return useContext(LiveContext);
}
