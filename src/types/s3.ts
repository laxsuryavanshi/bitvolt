/** Represents a file or folder object in S3. */
export interface S3Object {
  key: string;
  name: string;
  isFolder: boolean;
  size?: number;
  lastModified?: Date;
  etag?: string;
}

export type ViewMode = 'grid' | 'list';

export type SortField = 'name' | 'size' | 'lastModified';

export type SortOrder = 'asc' | 'desc';
