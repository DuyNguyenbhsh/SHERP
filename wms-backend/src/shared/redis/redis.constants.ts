export const IOREDIS = Symbol('IOREDIS');

export const KEY_PREFIXES = {
  CACHE: 'cache',
  BULL: 'bull',
  THROTTLE: 'throttle',
  AUTH_BLOCKLIST: 'authbl',
} as const;
