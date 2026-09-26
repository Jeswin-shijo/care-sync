import { useEffect, useState } from 'react';
import { clockToMinutes, daysFromToday, relativeDayLabel } from '../../utils/dates';

/** Current time, refreshed on an interval so "overdue" / "3h ago" labels stay live. */
export const useNow = (intervalMs = 30000): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** "45 min" / "2h" / "3h 10m" */
export const durationLabel = (mins: number) => {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
};

/** Minutes since a clock time on an ISO date (null when not today or unparseable). */
export const minutesSince = (dateISO: string | undefined, clock: string, now: Date): number | null => {
  if (!dateISO || daysFromToday(dateISO) !== 0) return null;
  if (!/\d{1,2}:\d{2}\s*(AM|PM)/i.test(clock)) return null;
  return minutesOfDay(now) - clockToMinutes(clock);
};

/** "Just now" / "25 min ago" / "3h 10m ago" for today, otherwise "Yesterday • 09:00 AM". */
export const timeAgoLabel = (dateISO: string, clock: string, now: Date) => {
  const since = minutesSince(dateISO, clock, now);
  if (since === null) return `${relativeDayLabel(dateISO)} • ${clock}`;
  if (since < 0) return `Today • ${clock}`;
  if (since < 1) return 'Just now';
  return `${durationLabel(since)} ago`;
};
