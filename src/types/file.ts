export interface ScanOptions {
  path: string;
  name?: string;
  extensions?: string[];
  modifiedAfter?: number;
  modifiedBefore?: number;
  minSize?: number;
  maxSize?: number;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number | null;
  modifiedAt: number | null;
}
