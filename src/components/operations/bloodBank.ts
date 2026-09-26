import type { BloodRequest, BloodStock } from '../../data/mockData';
import { colors } from '../../constants/theme';

export type BloodGroup = BloodStock['group'];
export type BloodComponent = BloodRequest['component'];
type StockKey = Exclude<keyof BloodStock, 'group'>;

export const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const isBloodGroup = (g?: string | null): g is BloodGroup => !!g && (BLOOD_GROUPS as string[]).includes(g);

/** Components in display order, with the par (target) level each group is stocked to. */
export const BLOOD_COMPONENTS: Array<{ component: BloodComponent; key: StockKey; label: string; target: number; shelfLife: string }> = [
  { component: 'PRBC', key: 'prbc', label: 'PRBC', target: 25, shelfLife: '42 days at 2–6 °C' },
  { component: 'Whole Blood', key: 'wholeBlood', label: 'Whole Blood', target: 20, shelfLife: '35 days at 2–6 °C' },
  { component: 'Platelets', key: 'platelets', label: 'Platelets', target: 12, shelfLife: '5 days at 20–24 °C' },
  { component: 'Plasma', key: 'plasma', label: 'Plasma (FFP)', target: 20, shelfLife: '1 year at −30 °C' },
];

/** At or below these unit counts a component is low / critical. */
export const LOW_UNITS = 5;
export const CRITICAL_UNITS = 2;

export type StockLevel = 'ok' | 'low' | 'critical';

export const stockLevel = (units: number): StockLevel => (units <= CRITICAL_UNITS ? 'critical' : units <= LOW_UNITS ? 'low' : 'ok');

export const LEVEL_META: Record<StockLevel, { label: string; color: string; bg: string; text: string }> = {
  ok: { label: 'Adequate', color: colors.success, bg: colors.successLight, text: colors.text },
  low: { label: 'Low', color: colors.warning, bg: colors.warningLight, text: colors.warningText },
  critical: { label: 'Critical', color: colors.danger, bg: colors.dangerLight, text: colors.danger },
};

const RANK: Record<StockLevel, number> = { ok: 0, low: 1, critical: 2 };

export const componentKey = (component: BloodComponent): StockKey =>
  BLOOD_COMPONENTS.find((c) => c.component === component)?.key ?? 'prbc';

export const unitsOf = (stock: BloodStock | undefined, component: BloodComponent) => (stock ? stock[componentKey(component)] : 0);

export const groupTotal = (s: BloodStock) => s.prbc + s.wholeBlood + s.platelets + s.plasma;

/** Worst level across a group's components. */
export const groupLevel = (s: BloodStock): StockLevel =>
  BLOOD_COMPONENTS.reduce<StockLevel>((worst, c) => {
    const level = stockLevel(s[c.key]);
    return RANK[level] > RANK[worst] ? level : worst;
  }, 'ok');

// -------------------------------------------------------------
// ABO / Rh compatibility (donor → recipient)
// -------------------------------------------------------------
const abo = (g: BloodGroup) => g.slice(0, -1);
const rhNegative = (g: BloodGroup) => g.endsWith('-');

export const isCompatible = (component: BloodComponent, donor: BloodGroup, recipient: BloodGroup): boolean => {
  const d = abo(donor);
  const r = abo(recipient);
  // Rh-negative recipients receive Rh-negative cellular products only.
  const rhOk = !rhNegative(recipient) || rhNegative(donor);
  switch (component) {
    case 'PRBC':
      return rhOk && (d === 'O' || d === r || r === 'AB');
    case 'Whole Blood':
      return rhOk && d === r;
    case 'Platelets':
      return rhOk && (d === r || d === 'AB' || r === 'O');
    case 'Plasma':
      return d === 'AB' || d === r || r === 'O';
    default:
      return donor === recipient;
  }
};

/** Other groups that could be given instead, with units currently in stock (most first). */
export const compatibleAlternatives = (stock: BloodStock[], component: BloodComponent, recipient: BloodGroup) =>
  stock
    .filter((s) => s.group !== recipient && isCompatible(component, s.group, recipient))
    .map((s) => ({ group: s.group, units: unitsOf(s, component) }))
    .filter((x) => x.units > 0)
    .sort((a, b) => b.units - a.units);

export const requestStatusOrder: Record<BloodRequest['status'], number> = {
  'Pending Cross-match': 0,
  Issued: 1,
  Rejected: 2,
};
