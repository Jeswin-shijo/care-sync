import { useEffect, useState } from 'react';
import { formatDayMonth } from '../../utils/dates';

const DAY = 86400000;

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "Just now" · "5m ago" · "2h ago" · "Yesterday" · "3d ago" · "12 Sep" */
export const relativeTime = (at: number | undefined, now: number = Date.now(), fallback = ''): string => {
  if (!at || !Number.isFinite(at)) return fallback;
  const minutes = Math.floor(Math.max(0, now - at) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const today = startOfDay(now);
  if (at >= today) return `${Math.floor(minutes / 60)}h ago`;
  if (at >= today - DAY) return 'Yesterday';
  const days = Math.ceil((today - at) / DAY);
  if (days < 7) return `${days}d ago`;
  return formatDayMonth(new Date(at));
};

/** True when the timestamp falls on today's calendar date. */
export const isToday = (at: number | undefined, now: number = Date.now()) => !!at && at >= startOfDay(now);

/** Current time that re-renders the caller every `intervalMs`, so relative times stay live. */
export const useNow = (intervalMs = 30000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};
