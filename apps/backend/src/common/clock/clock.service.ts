import { Injectable } from '@nestjs/common';

@Injectable()
export class ClockService {
  private offsetMs = 0;
  private readonly timezone = 'Asia/Ho_Chi_Minh';

  /**
   * Returns current Date taking into account the dev offset.
   * ALL business rules, cutoff checks, and status derivation MUST use this method.
   */
  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }

  /**
   * Returns current simulated time in ISO UTC format
   */
  nowIso(): string {
    return this.now().toISOString();
  }

  /**
   * Returns current real time without offset
   */
  realNow(): Date {
    return new Date();
  }

  /**
   * Vietnamese weekday abbreviation: T2, T3, T4, T5, T6, T7, CN
   */
  getWeekdayVn(date: Date = this.now()): string {
    const vnDate = this.toVnDate(date);
    const day = vnDate.getDay(); // 0 is Sunday
    const map = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return map[day];
  }

  /**
   * Full Vietnamese weekday name, e.g. "Thứ Tư"
   */
  getWeekdayFullVn(date: Date = this.now()): string {
    const vnDate = this.toVnDate(date);
    const day = vnDate.getDay();
    const map = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return map[day];
  }

  /**
   * Formats current time for header: e.g. "Thứ Tư, 21/10/2026 · 14:32"
   */
  formatHeaderVn(date: Date = this.now()): string {
    const weekday = this.getWeekdayFullVn(date);
    const d = this.toVnDate(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${weekday}, ${day}/${month}/${year} · ${hours}:${minutes}`;
  }

  /**
   * Returns Date adjusted for Asia/Ho_Chi_Minh timezone
   */
  toVnDate(date: Date): Date {
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const vnOffsetHours = 7;
    return new Date(utcTime + vnOffsetHours * 3600000);
  }

  /**
   * Dev Tools: Jump time by offset in minutes
   */
  setOffsetMinutes(minutes: number): void {
    this.offsetMs += minutes * 60 * 1000;
  }

  /**
   * Dev Tools: Jump time by exact offset in milliseconds
   */
  setOffsetMs(ms: number): void {
    this.offsetMs = ms;
  }

  /**
   * Dev Tools: Set clock to a specific Date
   */
  setDate(target: Date): void {
    this.offsetMs = target.getTime() - Date.now();
  }

  /**
   * Dev Tools: Set clock to a specific ISO string
   */
  setToIso(targetIso: string): void {
    const target = new Date(targetIso).getTime();
    if (isNaN(target)) {
      throw new Error(`Invalid ISO timestamp: ${targetIso}`);
    }
    this.offsetMs = target - Date.now();
  }

  /**
   * Dev Tools: Reset offset to zero (real time)
   */
  reset(): void {
    this.offsetMs = 0;
  }

  /**
   * Dev status summary
   */
  getDevStatus() {
    return {
      serverNow: this.nowIso(),
      realNow: this.realNow().toISOString(),
      offsetMs: this.offsetMs,
      offsetMinutes: Math.round(this.offsetMs / 60000),
      isSimulated: this.offsetMs !== 0,
      timezone: this.timezone,
      weekday: this.getWeekdayVn(),
      displayVn: this.formatHeaderVn(),
      displayHeader: this.formatHeaderVn(),
    };
  }

  getTimezone(): string {
    return this.timezone;
  }
}
