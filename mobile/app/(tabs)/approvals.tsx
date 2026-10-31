import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import LeaveScreen from './leave';
export default function Approvals() {
  const { user } = useAuth();
  return user?.role === 'HOD' ? <LeaveScreen /> : <Redirect href="/(tabs)" />;
}
