import type { Medicine, PrescriptionLine } from '../../data/mockData';
import { LOW_STOCK_THRESHOLD } from '../../data/mockData';
import { expiresSoon, isExpired, matchMedicine } from '../../logic/hospital';
import type { SafetyAlert } from '../../logic/safety';

/** A prescription row being edited on screen. */
export interface RxLine extends PrescriptionLine {
  key: string;
  medicineId?: string;
}

let rxSeq = 0;
export const newRxKey = () => `rx-${Date.now().toString(36)}-${(rxSeq++).toString(36)}`;

export const FREQUENCIES = [
  { code: 'OD', hint: 'Once daily' },
  { code: 'BD', hint: 'Twice daily' },
  { code: 'TDS', hint: 'Thrice daily' },
  { code: 'QID', hint: 'Four times a day' },
  { code: 'HS', hint: 'At bedtime' },
  { code: 'SOS', hint: 'Only when needed' },
] as const;
export type FrequencyCode = (typeof FREQUENCIES)[number]['code'];

export const DURATION_PRESETS = [3, 5, 7, 10, 14, 30] as const;

export const INSTRUCTION_PRESETS = ['After food', 'Before food', 'At bedtime', 'Empty stomach', 'With plenty of water'] as const;

export const durationLabel = (days: number) => (days === 30 ? '1 month' : `${days} day${days === 1 ? '' : 's'}`);

export const durationDays = (duration: string) => {
  const d = /(\d+)\s*day/i.exec(duration)?.[1];
  if (d) return Number(d);
  const m = /(\d+)?\s*month/i.exec(duration);
  if (m) return 30 * Number(m[1] ?? 1);
  const w = /(\d+)?\s*week/i.exec(duration);
  if (w) return 7 * Number(w[1] ?? 1);
  return 5;
};

/** "Amoxicillin 500mg (BD)" — the same label the pharmacy review and safety engine use. */
export const rxDrugLabel = (l: Pick<PrescriptionLine, 'name' | 'frequency'>) => `${l.name} (${l.frequency.split(' ')[0]})`;

export const rxSummary = (l: Pick<PrescriptionLine, 'dose' | 'frequency' | 'duration' | 'instructions'>) =>
  [l.dose, l.frequency, l.duration, l.instructions].filter(Boolean).join(' • ');

export const doseOptionsFor = (form?: string): string[] => {
  switch ((form ?? '').toLowerCase()) {
    case 'tab':
      return ['½ Tab', '1 Tab', '2 Tab'];
    case 'cap':
      return ['1 Cap', '2 Cap'];
    case 'syrup':
      return ['5 ml', '10 ml'];
    case 'inhaler':
      return ['1 puff', '2 puffs'];
    case 'pen':
      return ['6 units', '10 units', '14 units'];
    case 'sachet':
      return ['1 Sachet'];
    default:
      return ['1 Tab', '1 Cap', '5 ml'];
  }
};

/** Sensible starting dose/frequency/duration per drug class — the doctor adjusts. */
export const defaultsFor = (m?: Medicine): Omit<PrescriptionLine, 'name'> => {
  const dose = doseOptionsFor(m?.dosageForm)[m?.dosageForm?.toLowerCase() === 'tab' ? 1 : 0];
  switch (m?.category) {
    case 'Analgesic':
      return { dose, frequency: 'TDS', duration: '3 days', instructions: 'After food' };
    case 'Antibiotic':
      return { dose, frequency: 'BD', duration: '5 days', instructions: 'After food' };
    case 'Antacid':
      return { dose, frequency: 'OD', duration: '5 days', instructions: 'Before food' };
    case 'Antihistamine':
      return { dose, frequency: 'HS', duration: '5 days', instructions: 'At bedtime' };
    case 'Antidiabetic':
      return { dose, frequency: 'BD', duration: '1 month', instructions: 'After food' };
    case 'Cardiovascular':
      return { dose, frequency: 'OD', duration: '1 month', instructions: 'After food' };
    case 'Respiratory':
      return { dose, frequency: 'SOS', duration: '1 month', instructions: 'Rinse mouth after use' };
    case 'Supplement':
      return { dose, frequency: 'OD', duration: '14 days', instructions: 'After food' };
    default:
      return { dose, frequency: 'BD', duration: '5 days', instructions: 'After food' };
  }
};

export type StockState = { label: string; tone: 'ok' | 'low' | 'out' | 'expired' | 'soon' };

export const stockStateFor = (m: Medicine): StockState => {
  if (isExpired(m)) return { label: 'Expired stock', tone: 'expired' };
  if (m.stock <= 0) return { label: 'Out of stock', tone: 'out' };
  if (expiresSoon(m)) return { label: `Expires ${m.expiry}`, tone: 'soon' };
  if (m.stock <= LOW_STOCK_THRESHOLD) return { label: `Low stock • ${m.stock}`, tone: 'low' };
  return { label: `In stock • ${m.stock}`, tone: 'ok' };
};

/** Lines a safety alert is about (matched by generic name in the alert title/detail). */
export const linesForAlert = (alert: SafetyAlert, lines: RxLine[]): RxLine[] => {
  const hay = `${alert.title} ${alert.detail}`.toLowerCase();
  return lines.filter((l) => {
    const generic = l.name.toLowerCase().replace(/^inj\.?\s*/, '').split(/[\s(]/)[0];
    return generic.length > 2 && hay.includes(generic);
  });
};

/** First drug named in a suggestion ("Substitute with Ciprofloxacin 500mg BD or …"). */
export const parseAlternative = (
  suggestion: string | undefined,
  medicines: Medicine[]
): { name: string; frequency?: FrequencyCode; medicine?: Medicine } | null => {
  if (!suggestion) return null;
  const m = /\b(?:with|to|prefer|use)\s+([A-Za-z][A-Za-z-]+(?:\s+\d+(?:\.\d+)?\s?(?:mg|g|mcg|ml|iu))?)(?:\s+(OD|BD|TDS|QID|HS|SOS)\b)?/i.exec(suggestion);
  if (!m) return null;
  const raw = m[1].trim();
  if (/^(the|a|an|pause|hold|monitor)$/i.test(raw)) return null;
  const firstWord = raw.toLowerCase().split(' ')[0];
  const medicine =
    matchMedicine(medicines, raw) ??
    // No strength given ("Use Paracetamol …") → the stocked strength of that drug.
    (/\d/.test(raw) ? undefined : medicines.find((x) => x.name.toLowerCase().split(' ')[0] === firstWord && x.stock > 0));
  const frequency = m[2]?.toUpperCase() as FrequencyCode | undefined;
  return { name: medicine?.name ?? raw.charAt(0).toUpperCase() + raw.slice(1), frequency, medicine };
};
