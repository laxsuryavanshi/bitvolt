'use client';

import React from 'react';

import DeleteIcon from '@mui/icons-material/Delete';

import { ComingSoon } from '@/components/ComingSoon';

const Trash: React.FC = () => {
  return (
    <ComingSoon
      title="Trash"
      description="Deleted files are moved to trash for recovery. Soft-delete support with S3 versioning is coming soon."
      icon={<DeleteIcon sx={{ fontSize: 64, color: 'action.disabled' }} />}
    />
  );
};

export default Trash;
