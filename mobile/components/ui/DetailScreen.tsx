import React from 'react';
import { Text } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { ScreenContainer } from './ScreenContainer';
import { Button } from './Button';
import { useAuth } from '../../lib/auth-context';
import { Icon } from './Icon';
import { theme } from '../../lib/theme';
export function DetailScreen({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  if (!user) return <Redirect href="/(auth)/login" />;
  return (
    <ScreenContainer contentContainerStyle={{ gap: theme.spacing.section }}>
      <Button
        variant="text"
        style={{ alignSelf: 'flex-start' }}
        accessibilityLabel="Back"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')
        }
      >
        <>
          <Icon name="back" color={theme.colors.primary} size={20} />
          <Text
            style={{
              fontSize: theme.typography.button,
              fontWeight: '600',
              color: theme.colors.primary,
            }}
          >
            Back
          </Text>
        </>
      </Button>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: theme.typography.heading,
          fontWeight: '600',
          color: theme.colors.foreground,
        }}
      >
        {title}
      </Text>
      {children}
    </ScreenContainer>
  );
}
