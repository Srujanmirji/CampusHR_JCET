import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { DetailScreen } from '../../components/ui/DetailScreen';
import { ProfileDetails } from '../../components/profile/ProfileDetails';

const SECTION_TITLES: Record<string, string> = {
  personal: 'Personal Information',
  academic: 'Academic Profile',
  research: 'Research & FDP',
  performance: 'Performance',
  service: 'Service History',
};

export default function Details() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const title = (section && SECTION_TITLES[section]) || 'Personal Information';
  return (
    <DetailScreen title={title}>
      <ProfileDetails initialSection={section} />
    </DetailScreen>
  );
}
