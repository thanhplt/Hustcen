import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SystemSettings {
  bookingCutoffMinutes: number;
  closingSoonMinutes: number;
  cleaningBufferMinutes: number;
  seatHoldMinutes: number;
}

@Injectable()
export class SystemSettingService {
  private readonly logger = new Logger(SystemSettingService.name);

  // Cached fallback defaults
  private settingsCache: SystemSettings = {
    bookingCutoffMinutes: 5,
    closingSoonMinutes: 15,
    cleaningBufferMinutes: 15,
    seatHoldMinutes: 10,
  };

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<SystemSettings> {
    try {
      const records = await this.prisma.systemSetting.findMany();
      for (const rec of records) {
        if (rec.key in this.settingsCache) {
          const num = parseInt(rec.value, 10);
          if (!isNaN(num)) {
            (this.settingsCache as any)[rec.key] = num;
          }
        }
      }
    } catch (e) {
      this.logger.warn('Could not read SystemSetting from DB, using cached defaults', e.message);
    }
    return { ...this.settingsCache };
  }

  async get<K extends keyof SystemSettings>(key: K): Promise<number> {
    const settings = await this.getSettings();
    return settings[key];
  }

  async updateSetting(key: keyof SystemSettings, value: number, description?: string): Promise<number> {
    this.settingsCache[key] = value;
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: value.toString(), description },
      create: { key, value: value.toString(), description },
    });
    this.logger.log(`Updated SystemSetting [${key}] = ${value}`);
    return value;
  }
}
