'use client';

import React from 'react';

import ScheduleIcon from '@mui/icons-material/Schedule';

import { ComingSoon } from '@/components/ComingSoon';

const Recent: React.FC = () => {
  return (
    <ComingSoon
      title="Recent"
      description="Quickly access your recently viewed and edited files. This feature is coming soon."
      icon={<ScheduleIcon sx={{ fontSize: 64, color: 'action.disabled' }} />}
    />
  );
};

export default Recent;
