export interface StoredFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
}

export interface StorageService {
  saveFile(buffer: Buffer, originalName: string, subfolder?: string): Promise<StoredFile>;
  deleteFile(filepath: string): Promise<boolean>;
  getUrl(filepathOrFilename: string): string;
}
