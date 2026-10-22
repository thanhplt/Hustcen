export interface Scheduler {
  start(): void;
  stop(): void;
  triggerExpiredHoldsCleanup(): Promise<number>;
  triggerExpiredBookingsCleanup(): Promise<number>;
  triggerShowtimeStatusBroadcast(): Promise<void>;
  triggerShowtimeReminders(): Promise<number>;
}
