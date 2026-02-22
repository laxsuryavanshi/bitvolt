'use client';

import React, { useRef, useState } from 'react';

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GridViewIcon from '@mui/icons-material/GridView';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ViewListIcon from '@mui/icons-material/ViewList';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';

import type { SortField, SortOrder, ViewMode } from '@/types/s3';

interface ExplorerToolbarProps {
  selectedCount: number;
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSortFieldChange: (field: SortField) => void;
  onSortOrderChange: (order: SortOrder) => void;
  onCreateFolder: () => void;
  onUploadFiles: (files: FileList) => void;
  onDeleteSelected: () => void;
  onRefresh: () => void;
}

const sortOptions: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'size', label: 'Size' },
  { field: 'lastModified', label: 'Date modified' },
];

export const ExplorerToolbar: React.FC<ExplorerToolbarProps> = ({
  selectedCount,
  viewMode,
  sortField,
  sortOrder,
  searchQuery,
  onSearchChange,
  onViewModeChange,
  onSortFieldChange,
  onSortOrderChange,
  onCreateFolder,
  onUploadFiles,
  onDeleteSelected,
  onRefresh,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      {/* ── Primary actions ── */}
      <Button
        variant="contained"
        disableElevation
        size="small"
        startIcon={<UploadFileIcon />}
        onClick={() => fileInputRef.current?.click()}
      >
        Upload
      </Button>
      <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileSelect} />

      <Button
        variant="outlined"
        size="small"
        startIcon={<CreateNewFolderOutlinedIcon />}
        onClick={onCreateFolder}
      >
        New Folder
      </Button>

      {/* ── Selection actions ── */}
      {selectedCount > 0 && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={onDeleteSelected}
          >
            Delete ({selectedCount})
          </Button>
        </>
      )}

      <Box sx={{ flex: 1 }} />

      {/* ── Search ── */}
      <TextField
        size="small"
        placeholder="Search files…"
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ width: 220 }}
      />

      {/* ── Sort ── */}
      <Tooltip title="Sort">
        <IconButton size="small" onClick={e => setSortAnchor(e.currentTarget)}>
          <SortIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={sortAnchor}
        open={Boolean(sortAnchor)}
        onClose={() => setSortAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        {sortOptions.map(opt => (
          <MenuItem
            key={opt.field}
            selected={sortField === opt.field}
            onClick={() => {
              if (sortField === opt.field) {
                onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                onSortFieldChange(opt.field);
              }
              setSortAnchor(null);
            }}
          >
            <ListItemText>{opt.label}</ListItemText>
            {sortField === opt.field && (
              <ListItemIcon sx={{ justifyContent: 'flex-end', minWidth: 'auto', ml: 1 }}>
                {sortOrder === 'asc' ? (
                  <ArrowUpwardIcon fontSize="small" />
                ) : (
                  <ArrowDownwardIcon fontSize="small" />
                )}
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
      </Menu>

      {/* ── View toggle ── */}
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        size="small"
        onChange={(_, value: ViewMode | null) => {
          if (value) onViewModeChange(value);
        }}
      >
        <ToggleButton value="grid" aria-label="Grid view">
          <GridViewIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton value="list" aria-label="List view">
          <ViewListIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>

      {/* ── Refresh ── */}
      <Tooltip title="Refresh">
        <IconButton size="small" onClick={onRefresh}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
