import { Injectable, BadRequestException, Logger } from '@nestjs/common';
const sharp = require('sharp');
import { LocalDiskStorageService } from '../../../adapters/storage/local-disk-storage.service';

export interface ProcessedPosterResult {
  posterUrl: string;
  posterLarge: string;
  posterMedium: string;
  posterSmall: string;
  blurhash: string;
  width: number;
  height: number;
}

@Injectable()
export class PosterProcessorService {
  private readonly logger = new Logger(PosterProcessorService.name);

  constructor(private readonly storageService: LocalDiskStorageService) {}

  /**
   * Validate magic bytes for JPEG, PNG, WebP
   */
  validateMagicBytes(buffer: Buffer): 'jpeg' | 'png' | 'webp' {
    if (!buffer || buffer.length < 12) {
      throw new BadRequestException('Tệp tải lên không hợp lệ hoặc rỗng.');
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'png';
    }

    // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') {
      return 'webp';
    }

    throw new BadRequestException(
      'Định dạng ảnh không hợp lệ. Hệ thống chỉ chấp nhận định dạng JPG, PNG hoặc WEBP thực sự.',
    );
  }

  /**
   * Process raw poster buffer into optimized WebP variants and placeholder
   */
  async processPoster(buffer: Buffer, originalFilename: string): Promise<ProcessedPosterResult> {
    this.validateMagicBytes(buffer);

    const baseName = originalFilename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

    try {
      // 1. Inspect metadata & auto-orient (strips EXIF)
      const image = sharp(buffer).rotate();
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Không thể đọc kích thước ảnh poster.');
      }

      // 2. Generate 3 sizes:
      // Large (600x900)
      const largeBuf = await sharp(buffer)
        .rotate()
        .resize(600, 900, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toBuffer();

      // Medium (300x450)
      const medBuf = await sharp(buffer)
        .rotate()
        .resize(300, 450, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toBuffer();

      // Small (120x180)
      const smallBuf = await sharp(buffer)
        .rotate()
        .resize(120, 180, { fit: 'cover', position: 'center' })
        .webp({ quality: 75 })
        .toBuffer();

      // Tiny base64 placeholder (16x24 webp)
      const tinyBuf = await sharp(buffer)
        .rotate()
        .resize(16, 24, { fit: 'cover', position: 'center' })
        .webp({ quality: 20 })
        .toBuffer();

      const blurhash = `data:image/webp;base64,${tinyBuf.toString('base64')}`;

      // 3. Save variants to disk
      const largeFile = await this.storageService.saveFile(
        largeBuf,
        `${baseName}_lg.webp`,
        'posters',
      );
      const medFile = await this.storageService.saveFile(
        medBuf,
        `${baseName}_md.webp`,
        'posters',
      );
      const smallFile = await this.storageService.saveFile(
        smallBuf,
        `${baseName}_sm.webp`,
        'posters',
      );

      return {
        posterUrl: largeFile.url,
        posterLarge: largeFile.url,
        posterMedium: medFile.url,
        posterSmall: smallFile.url,
        blurhash,
        width: 600,
        height: 900,
      };
    } catch (err: any) {
      this.logger.error(`Failed to process poster: ${err.message}`, err.stack);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Xử lý ảnh poster thất bại: ${err.message}`);
    }
  }
}
