import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import type { PaymentMode } from '../../context/AppContext';
import { useReducedMotion } from '../common/Motion';

/** Re-renders on every wall-clock minute so "now"-relative UI (past slots, the Now divider) stays current. */
export const useMinuteTick = (): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const align = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60000);
    }, 60000 - (Date.now() % 60000) + 50);
    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, []);
  return now;
};

export const ALL_PAYMENT_MODES: PaymentMode[] = ['UPI', 'Cash', 'Card', 'Net Banking'];

export const PAYMENT_MODE_ICON: Record<PaymentMode, keyof typeof Ionicons.glyphMap> = {
  UPI: 'phone-portrait-outline',
  Cash: 'cash-outline',
  Card: 'card-outline',
  'Net Banking': 'globe-outline',
};

/** Payment modes enabled in Settings › Billing. `online` drops Cash (patient app). */
export const usePaymentModes = (opts: { online?: boolean } = {}): PaymentMode[] => {
  const { settings } = useApp();
  const enabled = ALL_PAYMENT_MODES.filter((m) => settings.paymentModes?.[m] !== false);
  const list = opts.online ? enabled.filter((m) => m !== 'Cash') : enabled;
  return list.length ? list : ['UPI'];
};

/** Returns a scale value that springs ("bumps") whenever `value` changes — for counters and badges. */
export const useBump = (value: unknown, peak = 1.3): Animated.Value => {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    scale.setValue(peak);
    const anim = Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 14 });
    anim.start();
    return () => anim.stop();
  }, [value]);
  return scale;
};

/** Keeps a callback from firing after unmount (simulated network delays). */
export const useMountedRef = () => {
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );
  return mounted;
};

/** "Dr. Priya Menon" → "Dr. Priya" (compact chips). */
export const shortDoctorName = (name: string) => {
  const parts = name.split(' ');
  return parts.length > 2 ? `${parts[0]} ${parts[1]}` : name;
};

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
