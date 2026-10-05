const DAY_MS = 24 * 60 * 60 * 1000;

export function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isExpired(expiryDate: Date, now: Date): boolean {
  return utcDay(expiryDate) < utcDay(now);
}

export function expiresWithinDays(expiryDate: Date, now: Date, days: number): boolean {
  const expiry = utcDay(expiryDate);
  const today = utcDay(now);
  return expiry >= today && expiry <= today + days * DAY_MS;
}

export function startOfUtcDay(now = new Date()): Date {
  return new Date(utcDay(now));
}
