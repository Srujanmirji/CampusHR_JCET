import React from 'react';
import { DetailScreen } from '../../components/ui/DetailScreen';
import { ProfileDetails } from '../../components/profile/ProfileDetails';
export default function Details() {
  return (
    <DetailScreen title="Personal Information">
      <ProfileDetails />
    </DetailScreen>
  );
}
