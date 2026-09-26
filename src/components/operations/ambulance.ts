import { useEffect, useRef, useState } from 'react';
import type { Ambulance } from '../../data/mockData';
import { colors } from '../../constants/theme';
import type { IconName } from './OpsUI';

export const AMBULANCE_TYPE_META: Record<Ambulance['type'], { label: string; description: string; icon: IconName; color: string; bg: string }> = {
  ALS: { label: 'ALS', description: 'Advanced Life Support', icon: 'pulse', color: colors.danger, bg: colors.dangerLight },
  BLS: { label: 'BLS', description: 'Basic Life Support', icon: 'medkit', color: colors.primary, bg: colors.primaryLight },
  Neonatal: { label: 'Neonatal', description: 'Neonatal transport incubator', icon: 'heart-circle', color: colors.purple, bg: colors.purpleLight },
};

export const STATUS_ORDER: Record<Ambulance['status'], number> = { 'On Trip': 0, Available: 1, Maintenance: 2 };

export type TripPriority = NonNullable<NonNullable<Ambulance['trip']>['priority']>;

export const PRIORITY_META: Record<TripPriority, { color: string; bg: string }> = {
  Emergency: { color: colors.danger, bg: colors.dangerLight },
  Routine: { color: colors.textSecondary, bg: '#FFFFFF' },
};

// -------------------------------------------------------------
// Live ETA
// -------------------------------------------------------------
/**
 * Seconds left until the crew reaches the pickup, from the trip's dispatch
 * time — so the countdown is identical after re-renders, remounts or leaving
 * and re-opening the screen. Ticks once a second and stops at zero.
 */
export const useEtaCountdown = (etaMinutes: number | undefined, dispatchedAt?: number) => {
  const fallbackStart = useRef(Date.now()).current;
  const start = dispatchedAt ?? fallbackStart;
  const total = Math.max(0, Math.round((etaMinutes ?? 0) * 60));
  const remainingAt = (t: number) => Math.min(total, Math.max(0, total - Math.floor((t - start) / 1000)));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (remainingAt(Date.now()) <= 0) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (remainingAt(t) <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
    // remainingAt only depends on start/total.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, total]);

  const remaining = remainingAt(now);
  return {
    remaining,
    total,
    progress: total ? 1 - remaining / total : 1,
    arrived: remaining <= 0,
  };
};

/** 725 → "12:05" */
export const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const PICKUP_SUGGESTIONS = ['Kakkanad', 'Edappally', 'Vyttila Hub', 'Fort Kochi', 'Aluva', 'Kaloor'];

export const REASON_SUGGESTIONS = [
  'Chest pain',
  'Road traffic accident',
  'Breathing difficulty',
  'Stroke symptoms',
  'Labour / pregnancy',
  'Unconscious patient',
  'Inter-hospital transfer',
];
