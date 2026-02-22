'use client';

import React from 'react';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import type { UploadTask } from '@/hooks/useFileExplorer';

interface UploadProgressProps {
  tasks: UploadTask[];
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ tasks }) => {
  if (tasks.length === 0) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 360,
        maxHeight: 300,
        overflow: 'auto',
        zIndex: theme => theme.zIndex.snackbar,
        borderRadius: 2,
      }}
    >
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="subtitle2">
          Uploading {tasks.length} file{tasks.length > 1 ? 's' : ''}
        </Typography>
      </Box>

      {tasks.map((task, idx) => (
        <Box
          key={`${idx}-${task.fileName}`}
          sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {task.status === 'done' ? (
              <CheckCircleIcon fontSize="small" color="success" />
            ) : task.status === 'error' ? (
              <ErrorIcon fontSize="small" color="error" />
            ) : (
              <UploadFileIcon fontSize="small" color="action" />
            )}
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {task.fileName}
            </Typography>
          </Box>

          {task.status === 'uploading' && (
            <LinearProgress variant="determinate" value={task.progress} sx={{ borderRadius: 1 }} />
          )}

          {task.error && (
            <Typography variant="caption" color="error">
              {task.error}
            </Typography>
          )}
        </Box>
      ))}
    </Paper>
  );
};
