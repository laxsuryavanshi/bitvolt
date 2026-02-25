import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

export interface UseFileExplorerOptions {
  /** Initial path to open (e.g. from URL search params). Defaults to root ('') */
  initialPath?: string;

  /** Called whenever the user navigates to a different folder */
  onPathChange?: (path: string) => void;
}

export function useFileExplorer(options: UseFileExplorerOptions = {}) {
  const { initialPath = '', onPathChange } = options;
  const s3 = useS3Service();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();

  // Keep a stable ref to the callback so navigate doesn't re-create on every render
  const onPathChangeRef = useRef(onPathChange);
  useEffect(() => {
    onPathChangeRef.current = onPathChange;
  }, [onPathChange]);

  // Core state — keep currentPath in sync when the URL (initialPath) changes
  // externally (e.g. browser back/forward, direct URL edits, bookmark opens).
  const [currentPath, setCurrentPath] = useState(initialPath);
  useEffect(() => {
    setCurrentPath(initialPath);
  }, [initialPath]);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [error, setError] = useState<string | null>(null);

  // Sort & search
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Uploads
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  const fetchListing = useCallback(
    async (prefix: string): Promise<S3Object[]> => {
      if (!s3) return [];
      if (!isOnline) {
        const cached = await getCachedListing(prefix);
        return cached ?? [];
      }
      const result = await s3.listObjects(prefix);
      await putCachedListing(prefix, result);
      return result;
    },
    [isOnline, s3]
  );

  const persistCacheSnapshot = useCallback(() => {
    const data = queryClient.getQueryData<S3Object[]>(queryKeys.listing(currentPath));
    if (data) void putCachedListing(currentPath, data);
  }, [currentPath, queryClient]);

  const listingQuery = useQuery({
    queryKey: queryKeys.listing(currentPath),
    queryFn: () => fetchListing(currentPath),
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
    onPathChangeRef.current?.(prefix);
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
        persistCacheSnapshot();
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

  const createFolder = (folderName: string) => createFolderMutation.mutateAsync(folderName);

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

      persistCacheSnapshot();
      setTimeout(() => setUploadTasks([]), 3_000);
    },
    [s3, isOnline, currentPath, optimisticAdd, persistCacheSnapshot]
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
        persistCacheSnapshot();
      } catch {
        await queueDeleteObject(key);
      }
    },
    [s3, isOnline, optimisticRemove, persistCacheSnapshot]
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
      persistCacheSnapshot();
    } catch {
      await queueDeleteObjects(keys);
    }
  }, [s3, isOnline, selectedKeys, optimisticRemove, persistCacheSnapshot]);

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
        persistCacheSnapshot();
      } catch {
        await queueRenameObject(oldKey, newKey);
      }
    },
    [s3, isOnline, objects, optimisticRemove, optimisticAdd, persistCacheSnapshot]
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

  const prefetchPath = useCallback(
    (prefix: string) => {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.listing(prefix),
        queryFn: () => fetchListing(prefix),
        staleTime: Infinity,
      });
    },
    [fetchListing, queryClient]
  );

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
    prefetchPath,
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
