import { SelfDestructTimer } from './types';

export const TIMER_SECONDS_MAP: Record<SelfDestructTimer, number | null> = {
  '10s': 10,
  '1m': 60,
  '5m': 300,
  '1h': 3600,
  '24h': 86400,
  'never': null
};

export const MAX_ROOM_CAPACITY = 2;
export const UNUSED_ROOM_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
export const HEARTBEAT_INTERVAL_MS = 15000;
export const TYPING_TIMEOUT_MS = 3000;
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
