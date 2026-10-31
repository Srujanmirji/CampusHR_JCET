import React from 'react';
import { DetailScreen } from '../../components/ui/DetailScreen';
import { DocumentsPanel } from '../../components/profile/DocumentsPanel';
export default function Documents() {
  return (
    <DetailScreen title="Documents">
      <DocumentsPanel />
    </DetailScreen>
  );
}
