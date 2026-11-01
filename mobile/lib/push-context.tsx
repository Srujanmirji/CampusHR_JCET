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
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { startPushSync, type PushState } from './push-sync';

/** True when running inside the Expo Go client (SDK 53+ blocks remote push). */
function isExpoGo(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isRunningInExpoGo } = require('expo') as {
      isRunningInExpoGo?: () => boolean;
    };
    if (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo())
      return true;
  } catch {
    /* not available – fall through */
  }
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

const EXPO_GO = isExpoGo();

const initial: PushState = {
  status: 'unsupported',
  message: EXPO_GO
    ? 'Remote alerts are not available in Expo Go. Use a development build for push notifications.'
    : 'Checking remote alert availability…',
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
    // expo-notifications remote push is completely removed from Expo Go since
    // SDK 53. Mounting push-sync in Expo Go causes a hard render crash.
    // Skip the entire push sync lifecycle when running in Expo Go.
    if (EXPO_GO) return;
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
