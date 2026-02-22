'use client';

import React from 'react';

import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import MuiBreadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

interface BreadcrumbsProps {
  currentPath: string;
  onNavigate: (prefix: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentPath, onNavigate }) => {
  const segments = currentPath.split('/').filter(Boolean);

  return (
    <MuiBreadcrumbs
      separator={<NavigateNextIcon fontSize="small" />}
      sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}
    >
      <Link
        component="button"
        underline="hover"
        color={segments.length === 0 ? 'text.primary' : 'inherit'}
        onClick={() => onNavigate('')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          fontWeight: segments.length === 0 ? 600 : 400,
          cursor: 'pointer',
        }}
      >
        <HomeIcon fontSize="small" />
        All Files
      </Link>

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const path = segments.slice(0, index + 1).join('/') + '/';

        return isLast ? (
          <Typography key={path} fontWeight={600} color="text.primary" noWrap>
            {segment}
          </Typography>
        ) : (
          <Link
            key={path}
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => onNavigate(path)}
            sx={{ cursor: 'pointer' }}
          >
            {segment}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
};
