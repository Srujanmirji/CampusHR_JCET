import React from 'react';
import { DetailScreen } from '../../components/ui/DetailScreen';
import { PasswordForm } from '../../components/profile/PasswordForm';
export default function Password() {
  return (
    <DetailScreen title="Privacy & Security">
      <PasswordForm />
    </DetailScreen>
  );
}
