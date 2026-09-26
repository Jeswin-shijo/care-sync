/**
 * Date helpers. Mock data is generated relative to "today" so the app always
 * looks live (today's appointments, today's collection, upcoming follow-ups).
 * Formatting is done by hand so output is identical on every JS engine.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

export const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/** Local calendar date as YYYY-MM-DD (no timezone shift). */
export const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Parses YYYY-MM-DD as a local date. Returns null for anything else. */
export const fromISODate = (iso: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

export const isoDaysFromToday = (days: number): string => toISODate(addDays(startOfToday(), days));

export const todayISO = (): string => toISODate(startOfToday());

const asDate = (value: Date | string): Date | null => {
  if (value instanceof Date) return value;
  return fromISODate(value) ?? (isNaN(new Date(value).getTime()) ? null : new Date(value));
};

/** "26 Sep 2026" */
export const formatDisplayDate = (value: Date | string): string => {
  const d = asDate(value);
  if (!d) return String(value);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** "26 Sep" */
export const formatDayMonth = (value: Date | string): string => {
  const d = asDate(value);
  if (!d) return String(value);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
};

/** "Sat" */
export const weekdayShort = (value: Date | string): string => {
  const d = asDate(value);
  return d ? WEEKDAYS[d.getDay()] : '';
};

/** "Today" / "Tomorrow" / "Yesterday" / "Sat, 28 Sep" */
export const relativeDayLabel = (iso: string): string => {
  const d = fromISODate(iso);
  if (!d) return iso;
  const diff = Math.round((d.getTime() - startOfToday().getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return `${weekdayShort(d)}, ${formatDayMonth(d)}`;
};

/** Whole days from today to the given ISO date (negative = past). */
export const daysFromToday = (iso: string): number => {
  const d = fromISODate(iso);
  if (!d) return 0;
  return Math.round((d.getTime() - startOfToday().getTime()) / 86400000);
};

export const greetingForNow = (date: Date = new Date()): string => {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/** "10:05 AM" */
export const formatClock = (date: Date = new Date()): string => {
  const h = date.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(date.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
};

/** Minutes since midnight for "09:30 AM" style strings (for sorting). */
export const clockToMinutes = (clock: string): number => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock.trim());
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
};

/** Medicine expiry as MM/YY, `monthsAhead` months from today. */
export const expiryMonthsAhead = (monthsAhead: number): string => {
  const d = startOfToday();
  d.setDate(1);
  d.setMonth(d.getMonth() + monthsAhead);
  return `${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
};

/** Months until an MM/YY expiry (negative = already expired). */
export const monthsUntilExpiry = (mmYY: string): number => {
  const m = /^(\d{2})\/(\d{2})$/.exec(mmYY);
  if (!m) return 99;
  const now = startOfToday();
  const expiryYear = 2000 + Number(m[2]);
  return (expiryYear - now.getFullYear()) * 12 + (Number(m[1]) - (now.getMonth() + 1));
};

/**
 * Parses a date of birth typed as DD/MM/YYYY (or DD-MM-YYYY / DD.MM.YYYY).
 * Returns null for impossible or future dates.
 */
export const parseDob = (input: string): Date | null => {
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(input.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  const year = Number(m[3]);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  if (d.getTime() > Date.now() || year < 1900) return null;
  return d;
};

export const ageFromDob = (dob: Date, on: Date = new Date()): number => {
  let age = on.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    on.getMonth() < dob.getMonth() || (on.getMonth() === dob.getMonth() && on.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
};

/** Date of birth `years` years ago on a fixed day/month — for mock patients. */
export const dobYearsAgo = (years: number, month: number, day: number): string => {
  const today = startOfToday();
  let year = today.getFullYear() - years;
  const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
  if (birthdayThisYear > today) year -= 1;
  return `${pad(day)} ${MONTHS[month - 1]} ${year}`;
};
