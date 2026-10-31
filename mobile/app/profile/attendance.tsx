import React from 'react';
import { Redirect } from 'expo-router';
import AttendanceTab from '../(tabs)/attendance';
import { useAuth } from '../../lib/auth-context';
export default function PersonalAttendance() {
  const { user } = useAuth();
  return user ? <AttendanceTab /> : <Redirect href="/(auth)/login" />;
}
