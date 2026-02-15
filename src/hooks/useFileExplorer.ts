import { useCallback, useEffect, useMemo, useState } from 'react';

import type { S3Object, SortField, SortOrder, ViewMode } from '@/types/s3';
import { useS3Service } from './useS3Service';

// ---------------------------------------------------------------------------
// Upload task tracking
// ---------------------------------------------------------------------------

export interface UploadTask {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFileExplorer() {
  const s3 = useS3Service();

  // Core state
  const [currentPath, setCurrentPath] = useState('');
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sort & search
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Uploads
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchObjects = useCallback(
    async (prefix: string) => {
      if (!s3) return;

      setIsLoading(true);
      setError(null);
      setSelectedKeys(new Set());

      try {
        const result = await s3.listObjects(prefix);
        setObjects(result);
        setCurrentPath(prefix);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to list objects');
      } finally {
        setIsLoading(false);
      }
    },
    [s3]
  );

  const navigate = useCallback(
    (prefix: string) => {
      void fetchObjects(prefix);
    },
    [fetchObjects]
  );

  const refresh = useCallback(() => {
    void fetchObjects(currentPath);
  }, [fetchObjects, currentPath]);

  const navigateUp = useCallback(() => {
    if (!currentPath) return;
    const parts = currentPath.replace(/\/$/, '').split('/');
    parts.pop();
    const parentPath = parts.length > 0 ? `${parts.join('/')}/` : '';
    navigate(parentPath);
  }, [currentPath, navigate]);

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------

  const createFolder = useCallback(
    async (folderName: string) => {
      if (!s3) return;
      try {
        await s3.createFolder(currentPath + folderName);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create folder');
        throw err;
      }
    },
    [s3, currentPath, refresh]
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!s3) return;

      const fileArray = Array.from(files);
      const tasks: UploadTask[] = fileArray.map(f => ({
        fileName: f.name,
        progress: 0,
        status: 'pending' as const,
      }));
      setUploadTasks(tasks);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]!;
        const key = currentPath + file.name;

        setUploadTasks(prev =>
          prev.map((t, idx) =>
            idx === i ? { ...t, status: 'uploading' as const, progress: 50 } : t
          )
        );

        try {
          await s3.uploadFile(key, file);
          setUploadTasks(prev =>
            prev.map((t, idx) => (idx === i ? { ...t, status: 'done' as const, progress: 100 } : t))
          );
        } catch (err) {
          setUploadTasks(prev =>
            prev.map((t, idx) =>
              idx === i
                ? {
                    ...t,
                    status: 'error' as const,
                    error: err instanceof Error ? err.message : 'Upload failed',
                  }
                : t
            )
          );
        }
      }

      setTimeout(() => setUploadTasks([]), 3_000);
      refresh();
    },
    [s3, currentPath, refresh]
  );

  const deleteSelected = useCallback(async () => {
    if (!s3 || selectedKeys.size === 0) return;
    try {
      await s3.deleteObjects(Array.from(selectedKeys));
      setSelectedKeys(new Set());
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      throw err;
    }
  }, [s3, selectedKeys, refresh]);

  const deleteObject = useCallback(
    async (key: string) => {
      if (!s3) return;
      try {
        await s3.deleteObject(key);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete');
        throw err;
      }
    },
    [s3, refresh]
  );

  const downloadFile = useCallback(
    async (key: string, fileName: string) => {
      if (!s3) return;
      try {
        const url = await s3.getDownloadUrl(key);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to download');
      }
    },
    [s3]
  );

  // -----------------------------------------------------------------------
  // Selection helpers
  // -----------------------------------------------------------------------

  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedKeys(new Set(objects.map(o => o.key)));
  }, [objects]);

  const deselectAll = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  // -----------------------------------------------------------------------
  // Derived sorted/filtered list
  // -----------------------------------------------------------------------

  const sortedObjects = useMemo(() => {
    const filtered = searchQuery
      ? objects.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : objects;

    return [...filtered].sort((a, b) => {
      // Folders always first
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;

      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'size':
          cmp = (a.size ?? 0) - (b.size ?? 0);
          break;
        case 'lastModified':
          cmp = (a.lastModified?.getTime() ?? 0) - (b.lastModified?.getTime() ?? 0);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [objects, searchQuery, sortField, sortOrder]);

  // -----------------------------------------------------------------------
  // Initial load
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (s3) void fetchObjects('');
  }, [s3, fetchObjects]);

  return {
    // State
    currentPath,
    objects: sortedObjects,
    rawObjectCount: objects.length,
    selectedKeys,
    viewMode,
    isLoading,
    error,
    sortField,
    sortOrder,
    searchQuery,
    uploadTasks,

    // Actions
    navigate,
    navigateUp,
    refresh,
    createFolder,
    uploadFiles,
    deleteSelected,
    deleteObject,
    downloadFile,
    toggleSelect,
    selectAll,
    deselectAll,
    setViewMode,
    setSortField,
    setSortOrder,
    setSearchQuery,
    setError,
  } as const;
}
