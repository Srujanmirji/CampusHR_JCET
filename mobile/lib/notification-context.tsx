import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  startNotificationSync,
  type NotificationConnection,
} from './notifications-live';
const Connection = createContext<NotificationConnection>('off');
export const useNotificationConnection = () => useContext(Connection);
export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useQueryClient();
  const [status, setStatus] = useState<NotificationConnection>('off');
  useEffect(() => {
    const sync = startNotificationSync(
      (userId) => {
        for (const key of ['notifications', 'home', 'dated-duties', 'coverage'])
          void client.invalidateQueries({ queryKey: [key, userId] });
      },
      setStatus,
      AppState.currentState === 'active',
    );
    const listener = AppState.addEventListener('change', (state) => {
      void sync.setActive(state === 'active');
    });
    return () => {
      listener.remove();
      sync.close();
    };
  }, [client]);
  return <Connection.Provider value={status}>{children}</Connection.Provider>;
}
