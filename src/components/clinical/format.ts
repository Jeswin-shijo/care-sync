import { daysFromToday, formatDisplayDate, relativeDayLabel } from '../../utils/dates';

/** Ionicons glyph name. */
export type { IconName } from './types';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "Today" / "Yesterday" / "Sat, 28 Sep" for the last/next week, otherwise "26 Sep 2026". */
export const friendlyDate = (iso?: string | null): string => {
  if (!iso) return '—';
  if (!ISO_RE.test(iso)) return iso;
  return Math.abs(daysFromToday(iso)) <= 6 ? relativeDayLabel(iso) : formatDisplayDate(iso);
};

/** Day N of an in-patient stay (admission day = Day 1). */
export const stayDay = (admittedOnIso?: string): number | null =>
  admittedOnIso && ISO_RE.test(admittedOnIso) ? Math.max(1, 1 - daysFromToday(admittedOnIso)) : null;

export const digitsOnly = (s: string) => s.replace(/\D/g, '');

/** Local 10-digit mobile number (drops a leading +91 / 91 / 0). */
export const localMobile = (s: string) => digitsOnly(s).replace(/^(?:91|0)(?=\d{10}$)/, '');

export const isValidMobile = (s: string) => /^[6-9]\d{9}$/.test(localMobile(s));

/** "+91 98765 43210" */
export const formatMobile = (s: string) => {
  const d = localMobile(s);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : s.trim();
};

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

export const plural = (n: number, word: string, pluralWord?: string) =>
  `${n} ${n === 1 ? word : pluralWord ?? `${word}s`}`;

/** Short test name: "Complete Blood Count (CBC)" → "CBC", "Lipid Profile" → "Lipid Profile". */
export const shortTestName = (name: string) => {
  const abbr = /\(([A-Za-z0-9 ,]+)\)/.exec(name)?.[1];
  if (abbr && abbr.length <= 6) return abbr;
  return name.split('(')[0].trim();
};
