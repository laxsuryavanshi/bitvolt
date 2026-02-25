'use client';

import React from 'react';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import type { S3Object } from '@/types/s3';
import { formatFileSize, formatRelativeDate } from '@/utils/format';
import { FileIcon } from './FileIcon';

interface FileGridProps {
  objects: S3Object[];
  selectedKeys: Set<string>;
  onToggleSelect: (key: string) => void;
  onOpen: (obj: S3Object) => void;
  onContextMenu: (event: React.MouseEvent, obj: S3Object) => void;
  onPrefetch?: (key: string) => void;
}

export const FileGrid: React.FC<FileGridProps> = ({
  objects,
  selectedKeys,
  onToggleSelect,
  onOpen,
  onContextMenu,
  onPrefetch,
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 2,
      }}
    >
      {objects.map(obj => {
        const isSelected = selectedKeys.has(obj.key);
        return (
          <Card
            key={obj.key}
            variant="outlined"
            onMouseEnter={() => obj.isFolder && onPrefetch?.(obj.key)}
            onContextMenu={e => {
              e.preventDefault();
              onContextMenu(e, obj);
            }}
            sx={{
              position: 'relative',
              borderColor: isSelected ? 'primary.main' : undefined,
              bgcolor: isSelected ? 'action.selected' : undefined,
              transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s',
              '&:hover': {
                borderColor: 'primary.light',
                boxShadow: 1,
                '& .file-actions': { opacity: 1 },
              },
            }}
          >
            {/* Checkbox — visible on hover or when selected */}
            <Box
              className="file-actions"
              sx={{
                position: 'absolute',
                top: 4,
                left: 4,
                zIndex: 1,
                opacity: isSelected ? 1 : 0,
                transition: 'opacity 0.15s',
              }}
            >
              <Checkbox
                size="small"
                checked={isSelected}
                onClick={e => e.stopPropagation()}
                onChange={() => onToggleSelect(obj.key)}
              />
            </Box>

            {/* More button — visible on hover */}
            <Box
              className="file-actions"
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                zIndex: 1,
                opacity: 0,
                transition: 'opacity 0.15s',
              }}
            >
              <IconButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  onContextMenu(e, obj);
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>

            <CardActionArea
              onClick={() => onOpen(obj)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                p: 3,
                pt: 4,
                gap: 1.5,
              }}
            >
              <FileIcon name={obj.name} isFolder={obj.isFolder} size="large" />
              <Box sx={{ textAlign: 'center', width: '100%' }}>
                <Typography variant="body2" fontWeight={500} noWrap title={obj.name}>
                  {obj.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {obj.isFolder
                    ? 'Folder'
                    : `${formatFileSize(obj.size)} · ${formatRelativeDate(obj.lastModified)}`}
                </Typography>
              </Box>
            </CardActionArea>
          </Card>
        );
      })}
    </Box>
  );
};
