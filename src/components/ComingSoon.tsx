'use client';

import React from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface ComingSoonProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ title, description, icon }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 12,
        gap: 2,
      }}
    >
      {icon}
      <Typography variant="h5" fontWeight={600}>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={400}>
        {description}
      </Typography>
    </Box>
  );
};
