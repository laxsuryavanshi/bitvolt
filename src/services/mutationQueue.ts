import { v4 as uuid } from 'uuid';

import type { S3Service } from '@/services/s3';
import {
  dequeueMutation,
  enqueueMutation,
  getAllPendingMutations,
  type PendingMutation,
} from './cache';

export async function queueCreateFolder(path: string): Promise<PendingMutation> {
  const mutation: PendingMutation = {
    id: uuid(),
    type: 'createFolder',
    createdAt: Date.now(),
    payload: { path },
  };
  await enqueueMutation(mutation);
  return mutation;
}

export async function queueUploadFile(key: string, file: File): Promise<PendingMutation> {
  const buffer = await file.arrayBuffer();
  const mutation: PendingMutation = {
    id: uuid(),
    type: 'uploadFile',
    createdAt: Date.now(),
    payload: { key, fileName: file.name },
    fileData: buffer,
    fileType: file.type || 'application/octet-stream',
  };
  await enqueueMutation(mutation);
  return mutation;
}

export async function queueDeleteObject(key: string): Promise<PendingMutation> {
  const mutation: PendingMutation = {
    id: uuid(),
    type: 'deleteObject',
    createdAt: Date.now(),
    payload: { key },
  };
  await enqueueMutation(mutation);
  return mutation;
}

export async function queueDeleteObjects(keys: string[]): Promise<PendingMutation> {
  const mutation: PendingMutation = {
    id: uuid(),
    type: 'deleteObjects',
    createdAt: Date.now(),
    payload: { keys },
  };
  await enqueueMutation(mutation);
  return mutation;
}

export async function queueRenameObject(oldKey: string, newKey: string): Promise<PendingMutation> {
  const mutation: PendingMutation = {
    id: uuid(),
    type: 'renameObject',
    createdAt: Date.now(),
    payload: { oldKey, newKey },
  };
  await enqueueMutation(mutation);
  return mutation;
}

export interface FlushResult {
  flushed: number;
  failed: number;
  errors: { id: string; error: string }[];
}

export async function flushMutationQueue(s3: S3Service): Promise<FlushResult> {
  const pending = await getAllPendingMutations();
  const result: FlushResult = { flushed: 0, failed: 0, errors: [] };

  for (const mutation of pending) {
    try {
      await executeMutation(s3, mutation);
      await dequeueMutation(mutation.id);
      result.flushed++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        id: mutation.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      // Stop at first failure to preserve ordering guarantees
      break;
    }
  }

  return result;
}

async function executeMutation(s3: S3Service, mutation: PendingMutation): Promise<void> {
  const p = mutation.payload;

  switch (mutation.type) {
    case 'createFolder':
      await s3.createFolder(p['path'] as string);
      break;

    case 'uploadFile': {
      const key = p['key'] as string;
      const fileName = p['fileName'] as string;
      const buffer = mutation.fileData;
      const type = mutation.fileType ?? 'application/octet-stream';

      if (!buffer) throw new Error('File data missing from queued mutation');

      // Reconstruct a File from the stored ArrayBuffer
      const file = new File([buffer], fileName, { type });
      await s3.uploadFile(key, file);
      break;
    }

    case 'deleteObject':
      await s3.deleteObject(p['key'] as string);
      break;

    case 'deleteObjects':
      await s3.deleteObjects(p['keys'] as string[]);
      break;

    case 'renameObject':
      await s3.renameObject(p['oldKey'] as string, p['newKey'] as string);
      break;
  }
}
