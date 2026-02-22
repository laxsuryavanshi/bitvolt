'use client';

import React from 'react';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { S3Object } from '@/types/s3';
import { formatFileSize, formatRelativeDate } from '@/utils/format';
import { FileIcon } from './FileIcon';

interface FileListProps {
  objects: S3Object[];
  selectedKeys: Set<string>;
  allSelected: boolean;
  onToggleSelect: (key: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpen: (obj: S3Object) => void;
  onContextMenu: (event: React.MouseEvent, obj: S3Object) => void;
}

export const FileList: React.FC<FileListProps> = ({
  objects,
  selectedKeys,
  allSelected,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onOpen,
  onContextMenu,
}) => {
  const someSelected = selectedKeys.size > 0;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" sx={{ width: 48 }}>
              <Checkbox
                size="small"
                indeterminate={someSelected && !allSelected}
                checked={allSelected}
                onChange={() => {
                  if (allSelected) onDeselectAll();
                  else onSelectAll();
                }}
              />
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 100 }}>Size</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 140 }}>Modified</TableCell>
            <TableCell sx={{ width: 48 }} />
          </TableRow>
        </TableHead>

        <TableBody>
          {objects.map(obj => {
            const isSelected = selectedKeys.has(obj.key);
            return (
              <TableRow
                key={obj.key}
                hover
                selected={isSelected}
                onContextMenu={e => {
                  e.preventDefault();
                  onContextMenu(e, obj);
                }}
                sx={{
                  cursor: 'pointer',
                  '& .row-action': { opacity: 0, transition: 'opacity 0.15s' },
                  '&:hover .row-action': { opacity: 1 },
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={isSelected}
                    onChange={() => onToggleSelect(obj.key)}
                    onClick={e => e.stopPropagation()}
                  />
                </TableCell>

                <TableCell onClick={() => onOpen(obj)}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FileIcon name={obj.name} isFolder={obj.isFolder} size="small" />
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {obj.name}
                    </Typography>
                  </Box>
                </TableCell>

                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {obj.isFolder ? '—' : formatFileSize(obj.size)}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatRelativeDate(obj.lastModified)}
                  </Typography>
                </TableCell>

                <TableCell>
                  <IconButton
                    size="small"
                    className="row-action"
                    onClick={e => {
                      e.stopPropagation();
                      onContextMenu(e, obj);
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
