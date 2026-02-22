'use client';

import React, { useRef } from 'react';

import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

interface EmptyStateProps {
  onUpload: (files: FileList) => void;
  onCreateFolder: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onUpload, onCreateFolder }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 10,
        gap: 2,
      }}
    >
      <CloudUploadOutlinedIcon sx={{ fontSize: 80, color: 'action.disabled' }} />

      <Typography variant="h6" color="text.secondary">
        This folder is empty
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Drop files here to upload, or use the buttons below
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <Button
          variant="contained"
          disableElevation
          startIcon={<UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Files
        </Button>
        <Button
          variant="outlined"
          startIcon={<CreateNewFolderOutlinedIcon />}
          onClick={onCreateFolder}
        >
          New Folder
        </Button>
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={e => {
          if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files);
            e.target.value = '';
          }
        }}
      />
    </Box>
  );
};
