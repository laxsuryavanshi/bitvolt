import { useMemo } from 'react';

import { S3Client } from '@aws-sdk/client-s3';

import { useS3Config } from '@/context/s3config';
import { createS3Service, type S3Service } from '@/services/s3';

/**
 * Creates and memoises an {@link S3Service} derived from the current
 * S3 configuration stored in context.
 *
 * Returns `null` when no configuration is present (user hasn't logged in).
 */
export function useS3Service(): S3Service | null {
  const { config } = useS3Config();

  return useMemo(() => {
    if (!config) return null;

    const client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyID,
        secretAccessKey: config.secretAccessKey,
      },
    });

    return createS3Service(client, config.bucketName);
  }, [config]);
}
