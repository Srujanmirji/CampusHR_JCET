import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { startPushSync, type PushState } from './push-sync';
const initial: PushState = {
  status: 'unsupported',
  message: 'Checking remote alert availability…',
};
const Push = createContext({
  ...initial,
  enable: async () => {},
  disable: async () => {},
  refresh: async () => {},
});
export const usePush = () => useContext(Push);
export function PushProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PushState>(initial);
  const sync = useRef<ReturnType<typeof startPushSync> | null>(null);
  const client = useQueryClient(),
    router = useRouter();
  useEffect(() => {
    const current = startPushSync(
      setState,
      (route) => router.dismissTo(route),
      (userId) => {
        for (const key of ['notifications', 'home', 'dated-duties', 'coverage'])
          void client.invalidateQueries({ queryKey: [key, userId] });
      },
    );
    sync.current = current;
    current.setActive(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (status) =>
      current.setActive(status === 'active'),
    );
    return () => {
      subscription.remove();
      current.close();
      sync.current = null;
    };
  }, [client, router]);
  return (
    <Push.Provider
      value={{
        ...state,
        enable: async () => {
          await sync.current?.enable();
        },
        disable: async () => {
          await sync.current?.disable();
        },
        refresh: async () => {
          await sync.current?.refresh();
        },
      }}
    >
      {children}
    </Push.Provider>
  );
}
