import React from 'react';
import { Redirect } from 'expo-router';
import LeaveScreen from '../(tabs)/leave';
import { useAuth } from '../../lib/auth-context';
export default function PersonalLeave() {
  const { user } = useAuth();
  return user ? <LeaveScreen /> : <Redirect href="/(auth)/login" />;
}
