import type { Medicine, SupplyItem } from '../../data/mockData';
import { LOW_STOCK_THRESHOLD } from '../../data/mockData';
import { expiresSoon, isExpired } from '../../logic/hospital';
import { monthsUntilExpiry } from '../../utils/dates';
import type { IconName } from './OpsUI';

export type MedicineFilter = 'All' | 'Low' | 'Expiring' | 'Out of stock' | 'On order';
export type SupplyFilter = 'All' | 'Below reorder' | 'On order';

export interface MedicineStatus {
  out: boolean;
  low: boolean;
  expired: boolean;
  expiring: boolean;
  months: number;
}

export const medicineStatus = (m: Medicine): MedicineStatus => ({
  out: m.stock <= 0,
  low: m.stock > 0 && m.stock <= LOW_STOCK_THRESHOLD,
  expired: isExpired(m),
  expiring: expiresSoon(m),
  months: monthsUntilExpiry(m.expiry),
});

export const matchesMedicineFilter = (m: Medicine, filter: MedicineFilter) => {
  const s = medicineStatus(m);
  switch (filter) {
    case 'Low':
      return s.low;
    case 'Expiring':
      return s.expired || s.expiring;
    case 'Out of stock':
      return s.out;
    case 'On order':
      return !!m.onOrder;
    default:
      return true;
  }
};

/** "Expired" / "Expires this month" / "Expires in 2 mo" / null when comfortably in date. */
export const expiryLabel = (s: MedicineStatus) =>
  s.expired ? 'Expired' : s.expiring ? (s.months === 0 ? 'Expires this month' : `Expires in ${s.months} mo`) : null;

export const needsReorder = (item: SupplyItem) => item.stock <= item.reorderLevel;

export const matchesSupplyFilter = (item: SupplyItem, filter: SupplyFilter) =>
  filter === 'Below reorder' ? needsReorder(item) : filter === 'On order' ? !!item.onOrder : true;

/** Order enough to reach twice the reorder level, net of anything already on order. */
export const defaultIndentQty = (item: SupplyItem) => Math.max(1, item.reorderLevel * 2 - item.stock - (item.onOrder ?? 0));

export const indentStep = (item: SupplyItem) => (item.reorderLevel >= 500 ? 50 : item.reorderLevel >= 100 ? 10 : 1);

/** "tab" / "tabs", "pen" / "pens". */
export const medicineUnit = (m: Medicine, n = 2) => {
  const form = m.dosageForm.toLowerCase();
  return n === 1 ? form : `${form}s`;
};

/** Medicines reorder at LOW_STOCK_THRESHOLD: order up to twice that, net of open indents, in packs of 10. */
export const defaultMedicineIndentQty = (m: Medicine) => {
  const need = LOW_STOCK_THRESHOLD * 2 - m.stock - (m.onOrder ?? 0);
  return Math.max(10, Math.ceil(need / 10) * 10);
};

/** What the indent sheet needs, for either a store item or a pharmacy medicine. */
export interface IndentTarget {
  kind: 'supply' | 'medicine';
  id: string;
  name: string;
  detail: string;
  stock: number;
  unit: string;
  reorderLevel: number;
  reorderLabel: string;
  onOrder: number;
  suggested: number;
  step: number;
  supplier?: string;
  lastRestocked?: string;
  unitPrice?: number;
}

export const supplyIndentTarget = (item: SupplyItem): IndentTarget => ({
  kind: 'supply',
  id: item.id,
  name: item.name,
  detail: `${item.category} • ${item.supplier}`,
  stock: item.stock,
  unit: item.unit,
  reorderLevel: item.reorderLevel,
  reorderLabel: 'Reorder level',
  onOrder: item.onOrder ?? 0,
  suggested: defaultIndentQty(item),
  step: indentStep(item),
  supplier: item.supplier,
  lastRestocked: item.lastRestocked,
});

export const medicineIndentTarget = (m: Medicine): IndentTarget => ({
  kind: 'medicine',
  id: m.id,
  name: m.name,
  detail: `${m.category} • ${m.dosageForm} • Exp ${m.expiry}`,
  stock: m.stock,
  unit: medicineUnit(m),
  reorderLevel: LOW_STOCK_THRESHOLD,
  reorderLabel: 'Low-stock level',
  onOrder: m.onOrder ?? 0,
  suggested: defaultMedicineIndentQty(m),
  step: 10,
  unitPrice: m.price,
});

export const SUPPLY_CATEGORY_META: Record<SupplyItem['category'], { icon: IconName; color: string; bg: string }> = {
  PPE: { icon: 'shield-checkmark-outline', color: '#0284C7', bg: '#F0F9FF' },
  Consumables: { icon: 'bandage-outline', color: '#0D9488', bg: '#F0FDFA' },
  Surgical: { icon: 'cut-outline', color: '#7C3AED', bg: '#F5F3FF' },
  Respiratory: { icon: 'cloud-outline', color: '#1E6BFF', bg: '#EFF6FF' },
  Housekeeping: { icon: 'water-outline', color: '#059669', bg: '#ECFDF5' },
};

export const dosageIcon = (form: string): IconName => {
  const f = form.toLowerCase();
  if (f.includes('inhaler')) return 'cloud-outline';
  if (f.includes('pen') || f.includes('inj')) return 'eyedrop-outline';
  if (f.includes('sachet')) return 'cube-outline';
  return 'medical-outline';
};
