import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageService, StoredFile } from './storage.interface';

@Injectable()
export class LocalDiskStorageService implements StorageService {
  private readonly logger = new Logger(LocalDiskStorageService.name);
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');
  private readonly backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, originalName: string, subfolder = ''): Promise<StoredFile> {
    const targetDir = subfolder ? path.join(this.uploadDir, subfolder) : this.uploadDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(originalName).toLowerCase();
    const uniqueFilename = `${uuidv4()}${ext}`;
    const fullPath = path.join(targetDir, uniqueFilename);

    await fs.promises.writeFile(fullPath, buffer);

    const relativePath = subfolder ? `${subfolder}/${uniqueFilename}` : uniqueFilename;
    const url = `${this.backendUrl}/uploads/${relativePath.replace(/\\/g, '/')}`;

    return {
      filename: uniqueFilename,
      originalName,
      mimeType: this.guessMimeType(ext),
      size: buffer.length,
      url,
      path: fullPath,
    };
  }

  async deleteFile(filepathOrFilename: string): Promise<boolean> {
    try {
      let fullPath = filepathOrFilename;
      if (!path.isAbsolute(fullPath)) {
        fullPath = path.join(this.uploadDir, filepathOrFilename);
      }
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
    } catch (e) {
      this.logger.warn(`Failed to delete file: ${filepathOrFilename}`, e.message);
    }
    return false;
  }

  getUrl(filepathOrFilename: string): string {
    const clean = filepathOrFilename.replace(/\\/g, '/');
    if (clean.startsWith('http')) return clean;
    return `${this.backendUrl}/uploads/${clean.replace(/^\//, '')}`;
  }

  private guessMimeType(ext: string): string {
    switch (ext) {
      case '.webp':
        return 'image/webp';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  }
}
