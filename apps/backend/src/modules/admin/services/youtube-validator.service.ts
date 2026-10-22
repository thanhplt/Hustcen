import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as https from 'https';

export interface ValidatedTrailer {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  embeddable: boolean | null;
  embedUrl: string;
}

@Injectable()
export class YoutubeValidatorService {
  private readonly logger = new Logger(YoutubeValidatorService.name);

  // Strict regex extracting only valid 11-char YouTube video ID
  private readonly YOUTUBE_REGEX =
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&][\w=&%-]*)?$/i;

  extractVideoId(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();

    // Check for malicious / non-youtube / javascript: schemes
    if (trimmed.toLowerCase().startsWith('javascript:') || trimmed.includes('<script')) {
      return null;
    }

    const match = trimmed.match(this.YOUTUBE_REGEX);
    return match ? match[1] : null;
  }

  async validateTrailer(url: string): Promise<ValidatedTrailer> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new BadRequestException(
        'Đường dẫn YouTube không hợp lệ. Vui lòng cung cấp link dạng youtube.com/watch?v=..., youtu.be/... hoặc shorts/...',
      );
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`;
    const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const data = await this.fetchJsonWithTimeout(oembedUrl, 3000);

      return {
        videoId,
        title: data.title || 'Official Trailer',
        thumbnailUrl: data.thumbnail_url || defaultThumbnail,
        embeddable: true,
        embedUrl,
      };
    } catch (err: any) {
      this.logger.warn(`oEmbed validation failed or timed out for ID ${videoId}: ${err.message}`);

      // If YouTube returns 401 or 403 or 404
      if (err.statusCode === 401 || err.statusCode === 403) {
        return {
          videoId,
          title: 'Trailer (Không cho phép nhúng trực tiếp)',
          thumbnailUrl: defaultThumbnail,
          embeddable: false,
          embedUrl,
        };
      }

      if (err.statusCode === 404) {
        return {
          videoId,
          title: 'Video không tồn tại hoặc ở chế độ riêng tư',
          thumbnailUrl: defaultThumbnail,
          embeddable: false,
          embedUrl,
        };
      }

      // Offline / Timeout -> warn but save with embeddable = null
      return {
        videoId,
        title: 'YouTube Trailer',
        thumbnailUrl: defaultThumbnail,
        embeddable: null,
        embedUrl,
      };
    }
  }

  private fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        if (res.statusCode !== 200) {
          const err: any = new Error(`HTTP ${res.statusCode}`);
          err.statusCode = res.statusCode;
          return reject(err);
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        const err: any = new Error('Timeout');
        err.statusCode = 408;
        reject(err);
      });
    });
  }
}
