import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const key = 'campushr.session.v1';
const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
// Keep a delayed write from recreating credentials after logout deletes them.
let pending: Promise<unknown> = Promise.resolve();
function queued<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation, operation);
  pending = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
export const readSavedSession = () =>
  queued(() =>
    Platform.OS === 'web'
      ? Promise.resolve(null)
      : SecureStore.getItemAsync(key, options),
  );
export const writeSavedSession = (value: string | null) =>
  queued(async () => {
    if (Platform.OS === 'web') return;
    if (value === null) await SecureStore.deleteItemAsync(key, options);
    else await SecureStore.setItemAsync(key, value, options);
  });

const pushKey = 'campushr.push.enabled.v1';
export const readPushEnabled = () =>
  queued(
    async () =>
      Platform.OS !== 'web' &&
      (await SecureStore.getItemAsync(pushKey, options)) === 'true',
  );
export const writePushEnabled = (enabled: boolean) =>
  queued(async () => {
    if (Platform.OS !== 'web')
      await SecureStore.setItemAsync(pushKey, String(enabled), options);
  });
