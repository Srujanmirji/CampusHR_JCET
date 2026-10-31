import { z } from 'zod';
import {
  apiFetch,
  getSession,
  setPushDevice,
  subscribeSession,
} from './session';
import { readPushEnabled, writePushEnabled } from './session-storage';
import {
  canReadHome,
  homeNotificationRoute,
  notificationSchema,
} from './home-api';
import { pushNative, pushPayloadSchema } from './notifications';
export interface PushState {
  status: 'unsupported' | 'off' | 'busy' | 'enabled' | 'denied' | 'error';
  message: string;
}
export function startPushSync(
  show: (state: PushState) => void,
  open: (
    route:
      | '/notifications'
      | '/(tabs)/leave'
      | '/(tabs)/attendance'
      | '/(tabs)/timetable'
      | '/(tabs)/profile',
  ) => void,
  changed: (userId: string) => void,
  adapter = pushNative,
) {
  let closed = false,
    generation = 0,
    active = true;
  let account = getSession().user?.id;
  let pending: Promise<unknown> = Promise.resolve();
  let enabled = false,
    loaded = false;
  let waitingTap: z.infer<typeof pushPayloadSchema> | undefined;
  const seen = new Set<string>();
  const emit = (state: PushState) => {
    if (!closed) show(state);
  };
  const own = (data: unknown) => {
    const payload = pushPayloadSchema.safeParse(data),
      session = getSession();
    return (
      !closed &&
      payload.success &&
      session.status === 'signedIn' &&
      session.user?.id === payload.data.recipientId &&
      !session.accessToken?.startsWith('demo-')
    );
  };
  function queue(run: () => Promise<void>) {
    const queuedGeneration = generation;
    pending = pending.then(run, run).catch(() => {
      if (queuedGeneration !== generation) return;
      emit({
        status: 'error',
        message:
          'Remote alert setup could not be confirmed. Check your connection and retry.',
      });
    });
    return pending;
  }
  async function resolveTap() {
    const ownGeneration = generation;
    const session = getSession(),
      tap = waitingTap;
    if (closed || !active || !tap || session.status !== 'signedIn') return;
    waitingTap = undefined;
    await adapter.clearResponse().catch(() => undefined);
    if (!own(tap) || seen.has(tap.notificationId)) return;
    if (seen.size >= 100) seen.clear();
    seen.add(tap.notificationId);
    // Fetch through the owned API. Never navigate using a URL from a push payload.
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await apiFetch(`/notifications/${tap.notificationId}`, {
        signal: controller.signal,
      });
    } catch (error) {
      seen.delete(tap.notificationId);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    const row = z
      .object({ data: notificationSchema })
      .parse(await response.json()).data;
    if (row.id !== tap.notificationId)
      throw new Error('Mismatched notification.');
    if (
      closed ||
      ownGeneration !== generation ||
      getSession().user?.id !== session.user?.id
    )
      return;
    changed(tap.recipientId);
    open(homeNotificationRoute(row.link, session.user) ?? '/notifications');
  }
  function refresh(ask = false) {
    const ownGeneration = generation;
    return queue(async () => {
      if (closed || ownGeneration !== generation) return;
      if (!adapter.supported || !adapter.projectId) {
        emit({
          status: 'unsupported',
          message:
            'Remote alerts need a signed development build and an approved Expo project. Your in-app inbox works here.',
        });
        return;
      }
      const session = getSession();
      if (
        session.status !== 'signedIn' ||
        session.accessToken?.startsWith('demo-')
      ) {
        emit({
          status: 'off',
          message: 'Sign in to a real account to enable remote alerts.',
        });
        return;
      }
      if (!canReadHome(session.user, 'notification.read')) {
        await setPushDevice(null);
        emit({
          status: 'off',
          message: 'This account does not have notification access.',
        });
        return;
      }
      if (!loaded) {
        enabled = await readPushEnabled();
        loaded = true;
      }
      if (ask) {
        await writePushEnabled(true);
        enabled = true;
      }
      if (closed || ownGeneration !== generation || !active) return;
      emit({ status: 'busy', message: 'Checking remote alert settings…' });
      const permitted = await adapter.permission(ask);
      if (closed || ownGeneration !== generation) return;
      if (!enabled || !permitted.granted) {
        await setPushDevice(null);
        if (closed || ownGeneration !== generation) return;
        emit({
          status: enabled ? 'denied' : 'off',
          message: enabled
            ? 'Notifications are blocked. Allow CampusHR in system Settings, then return here.'
            : 'Remote alerts are off for this device.',
        });
        return;
      }
      const configResponse = await apiFetch('/notifications/push');
      const config = z
        .object({
          data: z.object({
            enabled: z.boolean(),
            projectId: z.uuid().nullable(),
          }),
        })
        .parse(await configResponse.json()).data;
      if (!config.enabled || config.projectId !== adapter.projectId)
        throw new Error('App/server push configuration mismatch.');
      const token = await adapter.token();
      if (
        closed ||
        ownGeneration !== generation ||
        getSession().user?.id !== session.user?.id
      )
        return;
      await setPushDevice({
        token,
        platform: adapter.platform,
        projectId: adapter.projectId,
      });
      if (closed || ownGeneration !== generation) return;
      emit({
        status: 'enabled',
        message:
          'Remote alerts are registered for this login. Lock-screen messages contain no employee details.',
      });
    });
  }
  const stopNative = adapter.listen(
    own,
    () => {
      const userId = getSession().user?.id;
      if (userId) changed(userId);
    },
    (data) => {
      const payload = pushPayloadSchema.safeParse(data);
      if (!payload.success) {
        void adapter.clearResponse().catch(() => undefined);
        return;
      }
      waitingTap = payload.data;
      void queue(resolveTap);
    },
    () => void refresh(),
  );
  const unsubscribe = subscribeSession(() => {
    const nextAccount = getSession().user?.id;
    if (nextAccount !== account) {
      generation++;
      account = nextAccount;
      seen.clear();
      void adapter.clearTray().catch(() => undefined);
    }
    if (getSession().status === 'signedOut')
      emit({ status: 'off', message: 'Sign in to enable remote alerts.' });
    void queue(resolveTap);
    void refresh();
  });
  void queue(resolveTap);
  void refresh();
  return {
    enable: () => refresh(true),
    refresh: () => refresh(),
    disable: () => {
      const ownGeneration = generation;
      emit({ status: 'busy', message: 'Turning off remote alerts…' });
      return queue(async () => {
        if (closed || ownGeneration !== generation) return;
        await writePushEnabled(false);
        enabled = false;
        loaded = true;
        if (closed || ownGeneration !== generation) return;
        await setPushDevice(null);
        if (closed || ownGeneration !== generation) return;
        await adapter.clearTray();
        emit({
          status: 'off',
          message: 'Remote alerts are off for this device.',
        });
      });
    },
    setActive(value: boolean) {
      active = value;
      if (value) {
        void queue(resolveTap);
        void refresh();
      }
    },
    close() {
      closed = true;
      generation++;
      unsubscribe();
      stopNative();
      waitingTap = undefined;
    },
  };
}
