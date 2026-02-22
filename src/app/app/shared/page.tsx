'use client';

import React from 'react';

import FolderSharedIcon from '@mui/icons-material/FolderShared';

import { ComingSoon } from '@/components/ComingSoon';

const Shared: React.FC = () => {
  return (
    <ComingSoon
      title="Shared"
      description="Share files and folders with others using pre-signed URLs and access policies. This feature is coming soon."
      icon={<FolderSharedIcon sx={{ fontSize: 64, color: 'action.disabled' }} />}
    />
  );
};

export default Shared;
