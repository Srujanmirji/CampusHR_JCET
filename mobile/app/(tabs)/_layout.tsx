import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { theme } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabBarLabel, { color }]}>Home</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          title: 'Timetable',
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabBarLabel, { color }]}>Timetable</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabBarLabel, { color }]}>Attendance</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: 'Leave',
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabBarLabel, { color }]}>Leave</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabBarLabel, { color }]}>Profile</Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.caption,
  },
});
