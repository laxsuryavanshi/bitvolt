import { useCallback, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getCachedListing, invalidateCachedListing, putCachedListing } from '@/services/cache';
import {
  flushMutationQueue,
  queueCreateFolder,
  queueDeleteObject,
  queueDeleteObjects,
  queueRenameObject,
  queueUploadFile,
} from '@/services/mutationQueue';
import type { S3Object, SortField, SortOrder, ViewMode } from '@/types/s3';
import { useNetworkStatus } from './useNetworkStatus';
import { useS3Service } from './useS3Service';

export interface UploadTask {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

const queryKeys = {
  listing: (prefix: string) => ['s3', 'listing', prefix] as const,
};

export function useFileExplorer() {
  const s3 = useS3Service();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();

  // Core state
  const [currentPath, setCurrentPath] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [error, setError] = useState<string | null>(null);

  // Sort & search
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Uploads
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  const listingQuery = useQuery({
    queryKey: queryKeys.listing(currentPath),
    queryFn: async (): Promise<S3Object[]> => {
      if (!s3) return [];

      if (!isOnline) {
        const cached = await getCachedListing(currentPath);
        return cached ?? [];
      }

      const result = await s3.listObjects(currentPath);
      await putCachedListing(currentPath, result);

      return result;
    },
    enabled: s3 !== null,
    placeholderData: prev => prev,
  });

  useQuery({
    queryKey: [...queryKeys.listing(currentPath), 'idb-seed'] as const,
    queryFn: async () => {
      const cached = await getCachedListing(currentPath);
      if (cached) {
        queryClient.setQueryData(queryKeys.listing(currentPath), cached);
      }
      return null; // Sentinel — this query's value is unused
    },
    enabled: s3 !== null,
    staleTime: Infinity, // Only run once per lifetime
    gcTime: 0,
  });

  const objects = useMemo(() => listingQuery.data ?? [], [listingQuery.data]);
  const isLoading = listingQuery.isLoading && !listingQuery.isPlaceholderData;

  const navigate = useCallback((prefix: string) => {
    setCurrentPath(prefix);
    setSelectedKeys(new Set());
    setSearchQuery('');
  }, []);

  /** Hard refresh — invalidates cache, forces API call. */
  const refresh = useCallback(() => {
    void invalidateCachedListing(currentPath);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.listing(currentPath),
    });
  }, [currentPath, queryClient]);

  const navigateUp = useCallback(() => {
    if (!currentPath) return;
    const parts = currentPath.replace(/\/$/, '').split('/');
    parts.pop();
    const parentPath = parts.length > 0 ? `${parts.join('/')}/` : '';
    navigate(parentPath);
  }, [currentPath, navigate]);

  const invalidateCurrentListing = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.listing(currentPath),
    });
  }, [currentPath, queryClient]);

  // Helper: optimistically update the listing cache
  const optimisticAdd = useCallback(
    (obj: S3Object) => {
      queryClient.setQueryData<S3Object[]>(queryKeys.listing(currentPath), prev =>
        prev ? [...prev, obj] : [obj]
      );
    },
    [currentPath, queryClient]
  );

  const optimisticRemove = useCallback(
    (keys: string[]) => {
      const keySet = new Set(keys);
      queryClient.setQueryData<S3Object[]>(queryKeys.listing(currentPath), prev =>
        prev ? prev.filter(o => !keySet.has(o.key)) : []
      );
    },
    [currentPath, queryClient]
  );

  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      const fullPath = currentPath + folderName;
      const key = fullPath.endsWith('/') ? fullPath : `${fullPath}/`;

      optimisticAdd({
        key,
        name: folderName,
        isFolder: true,
      });

      if (!isOnline || !s3) {
        await queueCreateFolder(fullPath);
        return;
      }

      try {
        await s3.createFolder(fullPath);
        await putCachedListing(currentPath, [
          ...objects,
          { key, name: folderName, isFolder: true },
        ]);
      } catch (err) {
        // Network failed mid-call → queue and keep optimistic update
        await queueCreateFolder(fullPath);
        throw err;
      }
    },
    onError: err => {
      // Optimistic update already applied; the mutation is queued.
      console.warn('[bitvolt] createFolder queued for retry:', err);
    },
  });

  const createFolder = useCallback(
    async (folderName: string) => {
      await createFolderMutation.mutateAsync(folderName);
    },
    [createFolderMutation]
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!s3 && isOnline) return;

      const fileArray = Array.from(files);
      const tasks: UploadTask[] = fileArray.map(f => ({
        fileName: f.name,
        progress: 0,
        status: 'pending',
      }));
      setUploadTasks(tasks);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]!;
        const key = currentPath + file.name;

        setUploadTasks(prev =>
          prev.map((t, idx) => (idx === i ? { ...t, status: 'uploading', progress: 50 } : t))
        );

        optimisticAdd({
          key,
          name: file.name,
          isFolder: false,
          size: file.size,
          lastModified: new Date(),
        });

        try {
          if (!isOnline || !s3) {
            await queueUploadFile(key, file);
          } else {
            await s3.uploadFile(key, file);
          }
          setUploadTasks(prev =>
            prev.map((t, idx) => (idx === i ? { ...t, status: 'done', progress: 100 } : t))
          );
        } catch {
          // Network failed → queue for retry
          try {
            await queueUploadFile(key, file);
            setUploadTasks(prev =>
              prev.map((t, idx) => (idx === i ? { ...t, status: 'done', progress: 100 } : t))
            );
          } catch (queueErr) {
            setUploadTasks(prev =>
              prev.map((t, idx) =>
                idx === i
                  ? {
                      ...t,
                      status: 'error',
                      error: queueErr instanceof Error ? queueErr.message : 'Queue failed',
                    }
                  : t
              )
            );
          }
        }
      }

      // Persist optimistic state to IDB
      const currentData = queryClient.getQueryData<S3Object[]>(queryKeys.listing(currentPath));
      if (currentData) void putCachedListing(currentPath, currentData);

      setTimeout(() => setUploadTasks([]), 3_000);
    },
    [s3, isOnline, currentPath, optimisticAdd, queryClient]
  );

  const deleteObject = useCallback(
    async (key: string) => {
      optimisticRemove([key]);

      if (!isOnline || !s3) {
        await queueDeleteObject(key);
        return;
      }

      try {
        await s3.deleteObject(key);
        const currentData = queryClient.getQueryData<S3Object[]>(queryKeys.listing(currentPath));
        if (currentData) void putCachedListing(currentPath, currentData);
      } catch {
        await queueDeleteObject(key);
      }
    },
    [s3, isOnline, currentPath, optimisticRemove, queryClient]
  );

  const deleteSelected = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    const keys = Array.from(selectedKeys);
    optimisticRemove(keys);
    setSelectedKeys(new Set());

    if (!isOnline || !s3) {
      await queueDeleteObjects(keys);
      return;
    }

    try {
      await s3.deleteObjects(keys);
      const currentData = queryClient.getQueryData<S3Object[]>(queryKeys.listing(currentPath));
      if (currentData) void putCachedListing(currentPath, currentData);
    } catch {
      await queueDeleteObjects(keys);
    }
  }, [s3, isOnline, selectedKeys, currentPath, optimisticRemove, queryClient]);

  const downloadFile = useCallback(
    async (key: string, fileName: string) => {
      if (!s3) return;
      if (!isOnline) {
        setError('Cannot download files while offline');
        return;
      }
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
    [s3, isOnline]
  );

  const renameObject = useCallback(
    async (oldKey: string, newKey: string) => {
      const oldObj = objects.find(o => o.key === oldKey);
      if (oldObj) {
        optimisticRemove([oldKey]);
        const newName = newKey.endsWith('/')
          ? (newKey.slice(0, -1).split('/').pop() ?? '')
          : (newKey.split('/').pop() ?? '');
        optimisticAdd({ ...oldObj, key: newKey, name: newName });
      }
      if (!isOnline || !s3) {
        await queueRenameObject(oldKey, newKey);
        return;
      }
      try {
        await s3.renameObject(oldKey, newKey);
        const currentData = queryClient.getQueryData<S3Object[]>(queryKeys.listing(currentPath));
        if (currentData) void putCachedListing(currentPath, currentData);
      } catch {
        await queueRenameObject(oldKey, newKey);
      }
    },
    [s3, isOnline, objects, currentPath, optimisticRemove, optimisticAdd, queryClient]
  );

  const flushQueue = useCallback(async () => {
    if (!s3 || !isOnline) return;
    const result = await flushMutationQueue(s3);
    if (result.flushed > 0) {
      invalidateCurrentListing();
    }
    if (result.failed > 0) {
      setError(`${result.failed} queued operation(s) failed. Will retry later.`);
    }
  }, [s3, isOnline, invalidateCurrentListing]);

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

  const sortedObjects = useMemo(() => {
    const filtered = searchQuery
      ? objects.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : objects;

    return [...filtered].sort((a, b) => {
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
    isOnline,

    // Actions
    navigate,
    navigateUp,
    refresh,
    createFolder,
    uploadFiles,
    deleteSelected,
    deleteObject,
    renameObject,
    downloadFile,
    toggleSelect,
    selectAll,
    deselectAll,
    setViewMode,
    setSortField,
    setSortOrder,
    setSearchQuery,
    setError,
    flushQueue,
  } as const;
}
