'use client';

import React from 'react';

import StarIcon from '@mui/icons-material/Star';

import { ComingSoon } from '@/components/ComingSoon';

const Starred: React.FC = () => {
  return (
    <ComingSoon
      title="Starred"
      description="Mark important files and folders with a star for quick access. This feature is coming soon."
      icon={<StarIcon sx={{ fontSize: 64, color: 'action.disabled' }} />}
    />
  );
};

export default Starred;
