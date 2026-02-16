import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type { S3Object } from '@/types/s3';

/** Serialisable version of S3Object (Date → number for IndexedDB). */
export interface CachedS3Object {
  key: string;
  name: string;
  isFolder: boolean;
  size?: number;
  lastModified?: number; // epoch ms
  etag?: string;
}

export interface CachedListing {
  prefix: string;
  objects: CachedS3Object[];
  fetchedAt: number; // epoch ms
}

export interface PendingMutation {
  id: string;
  type: 'createFolder' | 'uploadFile' | 'deleteObject' | 'deleteObjects' | 'renameObject';
  createdAt: number;
  payload: Record<string, unknown>;
  fileData?: ArrayBuffer;
  fileType?: string;
}

const DB_NAME = 'bitvolt-cache';
const DB_VERSION = 1;
const LISTINGS_OBJECT_STORE = 'listings';
const MUTATIONS_OBJECT_STORE = 'mutations';

interface BitvoltDB extends DBSchema {
  [LISTINGS_OBJECT_STORE]: {
    key: string; // prefix
    value: CachedListing;
  };
  [MUTATIONS_OBJECT_STORE]: {
    key: string; // id
    value: PendingMutation;
    indexes: { 'by-created': number };
  };
}

let dbPromise: Promise<IDBPDatabase<BitvoltDB>> | null = null;

function getDB(): Promise<IDBPDatabase<BitvoltDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BitvoltDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(LISTINGS_OBJECT_STORE)) {
          db.createObjectStore(LISTINGS_OBJECT_STORE, { keyPath: 'prefix' });
        }
        if (!db.objectStoreNames.contains(MUTATIONS_OBJECT_STORE)) {
          const store = db.createObjectStore(MUTATIONS_OBJECT_STORE, { keyPath: 'id' });
          store.createIndex('by-created', 'createdAt');
        }
      },
    });
  }

  return dbPromise;
}

function toCache(obj: S3Object): CachedS3Object {
  return {
    key: obj.key,
    name: obj.name,
    isFolder: obj.isFolder,
    size: obj.size,
    lastModified: obj.lastModified?.getTime(),
    etag: obj.etag,
  };
}

function fromCache(c: CachedS3Object): S3Object {
  return {
    key: c.key,
    name: c.name,
    isFolder: c.isFolder,
    size: c.size,
    lastModified: c.lastModified != null ? new Date(c.lastModified) : undefined,
    etag: c.etag,
  };
}

export async function getCachedListing(prefix: string): Promise<S3Object[] | null> {
  const db = await getDB();
  const row = await db.get(LISTINGS_OBJECT_STORE, prefix);

  if (!row) return null;

  return row.objects.map(fromCache);
}

export async function getCachedListingMeta(prefix: string): Promise<{ fetchedAt: number } | null> {
  const db = await getDB();
  const row = await db.get(LISTINGS_OBJECT_STORE, prefix);

  if (!row) return null;

  return {
    fetchedAt: row.fetchedAt,
  };
}

export async function putCachedListing(prefix: string, objects: S3Object[]): Promise<void> {
  const db = await getDB();
  await db.put(LISTINGS_OBJECT_STORE, {
    prefix,
    objects: objects.map(toCache),
    fetchedAt: Date.now(),
  });
}

export async function invalidateCachedListing(prefix: string): Promise<void> {
  const db = await getDB();
  await db.delete(LISTINGS_OBJECT_STORE, prefix);
}

export async function invalidateAllListings(): Promise<void> {
  const db = await getDB();
  await db.clear(LISTINGS_OBJECT_STORE);
}

export async function enqueueMutation(mutation: PendingMutation): Promise<void> {
  const db = await getDB();
  await db.put(MUTATIONS_OBJECT_STORE, mutation);
}

export async function dequeueMutation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(MUTATIONS_OBJECT_STORE, id);
}

export async function getAllPendingMutations(): Promise<PendingMutation[]> {
  const db = await getDB();
  return db.getAllFromIndex(MUTATIONS_OBJECT_STORE, 'by-created');
}

export async function getPendingMutationCount(): Promise<number> {
  const db = await getDB();
  return db.count(MUTATIONS_OBJECT_STORE);
}

export async function clearAllPendingMutations(): Promise<void> {
  const db = await getDB();
  await db.clear(MUTATIONS_OBJECT_STORE);
}
