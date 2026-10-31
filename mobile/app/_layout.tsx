import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';
import { theme } from '../lib/theme';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PushProvider } from '../lib/push-context';
import { NotificationProvider } from '../lib/notification-context';
import { AuthProvider, useAuth } from '../lib/auth-context';

const queryClient = new QueryClient();
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <PushProvider>
              <SessionRoutes />
            </PushProvider>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function SessionRoutes() {
  const { status } = useAuth();
  if (status === 'loading')
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.md,
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.primary} />
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.colors.foreground }}
        >
          Restoring your session…
        </Text>
      </View>
    );
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.primary,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="profile/details" />
          <Stack.Screen
            name="profile/attendance"
            options={{ headerShown: true, title: 'My Attendance' }}
          />
          <Stack.Screen
            name="profile/leave"
            options={{ headerShown: true, title: 'My Leave' }}
          />
          <Stack.Screen name="profile/password" />
          <Stack.Screen name="profile/settings" />
          <Stack.Screen name="documents/index" />
          <Stack.Screen name="leave/coverage" />
          <Stack.Screen name="leave/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="(auth)/login" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
