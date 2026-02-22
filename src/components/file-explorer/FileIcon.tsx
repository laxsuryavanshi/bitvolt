'use client';

import React from 'react';

import FolderIcon from '@mui/icons-material/Folder';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { getExtensionColor, getExtensionLabel } from '@/utils/file';

interface FileIconProps {
  name: string;
  isFolder: boolean;
  size?: 'small' | 'medium' | 'large';
}

const sizeMap = {
  small: { icon: 32, badge: 10 },
  medium: { icon: 48, badge: 12 },
  large: { icon: 64, badge: 14 },
} as const;

export const FileIcon: React.FC<FileIconProps> = ({ name, isFolder, size = 'medium' }) => {
  const dims = sizeMap[size];

  if (isFolder) {
    return <FolderIcon sx={{ fontSize: dims.icon, color: '#FFB74D' }} />;
  }

  const color = getExtensionColor(name);
  const label = getExtensionLabel(name);

  return (
    <Box
      sx={{
        width: dims.icon,
        height: dims.icon,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Tinted background shape */}
      <Box
        sx={{
          width: dims.icon * 0.75,
          height: dims.icon * 0.9,
          borderRadius: '4px',
          bgcolor: color,
          opacity: 0.12,
          position: 'absolute',
        }}
      />
      {/* Extension label */}
      <Typography
        sx={{
          fontSize: dims.badge,
          fontWeight: 700,
          color,
          letterSpacing: '0.5px',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};
