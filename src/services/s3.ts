import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { S3Object } from '@/types/s3';

export interface S3Service {
  listObjects(prefix: string): Promise<S3Object[]>;
  createFolder(path: string): Promise<void>;
  uploadFile(key: string, file: File): Promise<void>;
  deleteObject(key: string): Promise<void>;
  deleteObjects(keys: string[]): Promise<void>;
  getDownloadUrl(key: string): Promise<string>;
  renameObject(oldKey: string, newKey: string): Promise<void>;
}

/**
 * Creates an S3 service instance bound to a specific client and bucket.
 * All operations are performed directly against the S3 API (client-side).
 */
export function createS3Service(client: S3Client, bucket: string): S3Service {
  async function collectKeysUnderPrefix(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key) keys.push(item.Key);
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return keys;
  }

  /** Deletes keys in batches of 1 000 (S3 hard limit). */
  async function batchDeleteKeys(keys: string[]): Promise<void> {
    const BATCH_SIZE = 1_000;

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: batch.map(Key => ({ Key })),
            Quiet: true,
          },
        })
      );
    }
  }

  return {
    async listObjects(prefix: string): Promise<S3Object[]> {
      const objects: S3Object[] = [];
      let continuationToken: string | undefined;

      do {
        const response = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix || undefined,
            Delimiter: '/',
            ContinuationToken: continuationToken,
          })
        );

        // Folders (CommonPrefixes)
        if (response.CommonPrefixes) {
          for (const cp of response.CommonPrefixes) {
            if (!cp.Prefix) continue;
            const name = cp.Prefix.slice(prefix.length).replace(/\/$/, '');
            if (name) {
              objects.push({ key: cp.Prefix, name, isFolder: true });
            }
          }
        }

        // Files (Contents), excluding the prefix placeholder itself
        if (response.Contents) {
          for (const item of response.Contents) {
            if (!item.Key || item.Key === prefix) continue;
            const name = item.Key.slice(prefix.length);
            if (name && !name.includes('/')) {
              objects.push({
                key: item.Key,
                name,
                isFolder: false,
                size: item.Size,
                lastModified: item.LastModified,
                etag: item.ETag,
              });
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return objects;
    },

    async createFolder(path: string): Promise<void> {
      const key = path.endsWith('/') ? path : `${path}/`;
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: '' }));
    },

    async uploadFile(key: string, file: File): Promise<void> {
      const buffer = await file.arrayBuffer();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: new Uint8Array(buffer),
          ContentType: file.type || 'application/octet-stream',
        })
      );
    },

    async deleteObject(key: string): Promise<void> {
      if (key.endsWith('/')) {
        const keys = await collectKeysUnderPrefix(key);
        if (keys.length > 0) await batchDeleteKeys(keys);
      } else {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      }
    },

    async deleteObjects(keys: string[]): Promise<void> {
      const folderKeys = keys.filter(k => k.endsWith('/'));
      const fileKeys = keys.filter(k => !k.endsWith('/'));

      for (const fk of folderKeys) {
        const nested = await collectKeysUnderPrefix(fk);
        if (nested.length > 0) await batchDeleteKeys(nested);
      }

      if (fileKeys.length > 0) await batchDeleteKeys(fileKeys);
    },

    async getDownloadUrl(key: string): Promise<string> {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return getSignedUrl(client as any, command, { expiresIn: 3_600 });
    },

    async renameObject(oldKey: string, newKey: string): Promise<void> {
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: encodeURIComponent(`${bucket}/${oldKey}`),
          Key: newKey,
        })
      );
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: oldKey }));
    },
  };
}
