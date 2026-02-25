'use client';

import React, { useCallback, useState } from 'react';

import CloudSyncIcon from '@mui/icons-material/CloudSync';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';

import { useFileExplorer } from '@/hooks/useFileExplorer';
import type { S3Object } from '@/types/s3';
import { Breadcrumbs } from './Breadcrumbs';
import { CreateFolderDialog } from './CreateFolderDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { EmptyState } from './EmptyState';
import { ExplorerToolbar } from './ExplorerToolbar';
import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { RenameDialog } from './RenameDialog';
import { UploadProgress } from './UploadProgress';

export const FileExplorer: React.FC = () => {
  const explorer = useFileExplorer();

  /* ─── Dialog state ─── */
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);

  const [contextTarget, setContextTarget] = useState<S3Object | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<S3Object | null>(null);
  const [renameTarget, setRenameTarget] = useState<S3Object | null>(null);

  /* ─── Context menu position ─── */
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  /* ─── Drag-and-drop overlay ─── */
  const [isDragging, setIsDragging] = useState(false);

  /* ─── Handlers ─── */

  /** Open a folder (navigate) or download a file. */
  const handleOpen = useCallback(
    (obj: S3Object) => {
      if (obj.isFolder) {
        explorer.navigate(obj.key);
      } else {
        void explorer.downloadFile(obj.key, obj.name);
      }
    },
    [explorer]
  );

  /** Show a context menu anchored at the click position. */
  const handleContextMenu = useCallback((event: React.MouseEvent, obj: S3Object) => {
    event.preventDefault();
    setContextTarget(obj);
    setMenuPosition({ top: event.clientY, left: event.clientX });
  }, []);

  const closeContextMenu = () => {
    setMenuPosition(null);
    setContextTarget(null);
  };

  /** Trigger deletion of the current selection. */
  const handleDeleteSelected = () => {
    setDeleteTarget(null);
    setDeleteConfirmOpen(true);
  };

  /** Actually perform the delete after confirmation. */
  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await explorer.deleteObject(deleteTarget.key);
    } else {
      await explorer.deleteSelected();
    }
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  };

  /** Rename a single file. */
  const handleRename = async (newName: string) => {
    if (!renameTarget) return;
    const oldKey = renameTarget.key;
    const parentPath = oldKey.substring(0, oldKey.lastIndexOf(renameTarget.name));
    const newKey = `${parentPath}${newName}`;
    await explorer.renameObject(oldKey, newKey);
  };

  /* ─── Drag / drop ─── */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX <= rect.left ||
      clientX >= rect.right ||
      clientY <= rect.top ||
      clientY >= rect.bottom
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      void explorer.uploadFiles(e.dataTransfer.files);
    }
  };

  /* ─── Derived ─── */
  const deleteItemCount = deleteTarget ? 1 : explorer.selectedKeys.size;
  const deleteItemName = deleteTarget?.name;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: '60vh' }}>
      {/* ── Offline banner ── */}
      {!explorer.isOnline && (
        <Alert
          severity="warning"
          icon={<CloudSyncIcon />}
          action={<Chip label="Offline" size="small" color="warning" variant="outlined" />}
        >
          You&apos;re offline. Changes will be synced when you reconnect.
        </Alert>
      )}

      {/* ── Error snackbar ── */}
      <Snackbar
        open={!!explorer.error}
        autoHideDuration={5000}
        onClose={() => explorer.setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => explorer.setError(null)}>
          {explorer.error}
        </Alert>
      </Snackbar>

      {/* ── Breadcrumb navigation ── */}
      <Breadcrumbs currentPath={explorer.currentPath} onNavigate={explorer.navigate} />

      {/* ── Toolbar ── */}
      <ExplorerToolbar
        selectedCount={explorer.selectedKeys.size}
        viewMode={explorer.viewMode}
        sortField={explorer.sortField}
        sortOrder={explorer.sortOrder}
        searchQuery={explorer.searchQuery}
        onSearchChange={explorer.setSearchQuery}
        onViewModeChange={explorer.setViewMode}
        onSortFieldChange={explorer.setSortField}
        onSortOrderChange={explorer.setSortOrder}
        onCreateFolder={() => setCreateFolderOpen(true)}
        onUploadFiles={files => void explorer.uploadFiles(files)}
        onDeleteSelected={handleDeleteSelected}
        onRefresh={explorer.refresh}
      />

      <Divider />

      {/* ── Content area (droppable) ── */}
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{ position: 'relative', flex: 1, minHeight: 200 }}
      >
        {/* Drag overlay */}
        {isDragging && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(25, 118, 210, 0.06)',
              border: '2px dashed',
              borderColor: 'primary.main',
              borderRadius: 2,
              pointerEvents: 'none',
            }}
          >
            <Typography variant="h6" color="primary" fontWeight={500}>
              Drop files to upload
            </Typography>
          </Box>
        )}

        {/* Loading */}
        {explorer.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : explorer.objects.length === 0 ? (
          /* Empty state */
          <EmptyState
            onUpload={files => void explorer.uploadFiles(files)}
            onCreateFolder={() => setCreateFolderOpen(true)}
          />
        ) : explorer.viewMode === 'grid' ? (
          /* Grid view */
          <FileGrid
            objects={explorer.objects}
            selectedKeys={explorer.selectedKeys}
            onToggleSelect={explorer.toggleSelect}
            onOpen={handleOpen}
            onContextMenu={handleContextMenu}
            onPrefetch={explorer.prefetchPath}
          />
        ) : (
          /* List view */
          <FileList
            objects={explorer.objects}
            selectedKeys={explorer.selectedKeys}
            allSelected={
              explorer.objects.length > 0 && explorer.selectedKeys.size === explorer.objects.length
            }
            onToggleSelect={explorer.toggleSelect}
            onSelectAll={explorer.selectAll}
            onDeselectAll={explorer.deselectAll}
            onOpen={handleOpen}
            onContextMenu={handleContextMenu}
            onPrefetch={explorer.prefetchPath}
          />
        )}
      </Box>

      {/* ── Status bar ── */}
      {explorer.objects.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {explorer.rawObjectCount} item{explorer.rawObjectCount === 1 ? '' : 's'}
            {explorer.selectedKeys.size > 0 && ` · ${explorer.selectedKeys.size} selected`}
          </Typography>
          {explorer.searchQuery && (
            <Typography variant="caption" color="text.secondary">
              Showing {explorer.objects.length} result
              {explorer.objects.length === 1 ? '' : 's'} for &quot;{explorer.searchQuery}&quot;
            </Typography>
          )}
        </Box>
      )}

      {/* ── Context menu ── */}
      <Menu
        open={!!menuPosition}
        onClose={closeContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={menuPosition ?? undefined}
        slotProps={{ paper: { sx: { minWidth: 180, boxShadow: 4 } } }}
      >
        {contextTarget?.isFolder && (
          <MenuItem
            onClick={() => {
              if (contextTarget) handleOpen(contextTarget);
              closeContextMenu();
            }}
          >
            <ListItemIcon>
              <FolderOpenIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Open</ListItemText>
          </MenuItem>
        )}

        {contextTarget && !contextTarget.isFolder && (
          <MenuItem
            onClick={() => {
              if (contextTarget) {
                void explorer.downloadFile(contextTarget.key, contextTarget.name);
              }
              closeContextMenu();
            }}
          >
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download</ListItemText>
          </MenuItem>
        )}

        {/* Rename — files only (folder rename requires deep copy) */}
        {contextTarget && !contextTarget.isFolder && (
          <MenuItem
            onClick={() => {
              if (contextTarget) {
                setRenameTarget(contextTarget);
                setRenameDialogOpen(true);
              }
              closeContextMenu();
            }}
          >
            <ListItemIcon>
              <DriveFileRenameOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
        )}

        <Divider />

        <MenuItem
          onClick={() => {
            if (contextTarget) {
              setDeleteTarget(contextTarget);
              setDeleteConfirmOpen(true);
            }
            closeContextMenu();
          }}
          sx={theme => ({ color: theme.palette.error.main })}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* ── Dialogs ── */}
      <CreateFolderDialog
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onCreate={name => void explorer.createFolder(name)}
      />

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        count={deleteItemCount}
        itemName={deleteItemName}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />

      <RenameDialog
        open={renameDialogOpen}
        currentName={renameTarget?.name ?? ''}
        onClose={() => {
          setRenameDialogOpen(false);
          setRenameTarget(null);
        }}
        onRename={name => void handleRename(name)}
      />

      {/* ── Upload progress panel ── */}
      <UploadProgress tasks={explorer.uploadTasks} />
    </Box>
  );
};
