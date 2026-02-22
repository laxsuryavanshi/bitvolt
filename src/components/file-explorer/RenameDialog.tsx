'use client';

import React, { useState } from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';

interface RenameDialogProps {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
  open,
  currentName,
  onClose,
  onRename,
}) => {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');

  // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevCurrentName, setPrevCurrentName] = useState(currentName);
  if (prevOpen !== open || prevCurrentName !== currentName) {
    setPrevOpen(open);
    setPrevCurrentName(currentName);
    if (open) {
      setName(currentName);
      setError('');
    }
  }

  const handleRename = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    if (trimmed.includes('/')) {
      setError('Name cannot contain "/"');
      return;
    }
    if (trimmed === currentName) {
      onClose();
      return;
    }
    onRename(trimmed);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Rename</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="New name"
          value={name}
          onChange={e => {
            setName(e.target.value);
            setError('');
          }}
          error={!!error}
          helperText={error}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRename();
          }}
          sx={{ mt: 1 }}
          onFocus={e => {
            // Select filename without extension for convenience
            const dotIndex = e.target.value.lastIndexOf('.');
            if (dotIndex > 0) {
              e.target.setSelectionRange(0, dotIndex);
            } else {
              e.target.select();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disableElevation onClick={handleRename}>
          Rename
        </Button>
      </DialogActions>
    </Dialog>
  );
};
