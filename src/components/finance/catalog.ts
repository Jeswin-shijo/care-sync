import type { Doctor, Invoice, LabTest, Medicine, RadiologyScan, WardInfo } from '../../data/mockData';
import { isExpired } from '../../logic/hospital';
import type { IconName } from './invoiceUtils';

/** Billable items the invoice builder offers, grouped by catalogue. */
export type CatalogKind = 'consultation' | 'lab' | 'radiology' | 'medicine' | 'room' | 'procedure' | 'registration';

export interface CatalogEntry {
  key: string;
  kind: CatalogKind;
  name: string;
  detail?: string;
  rate: number;
  /** Shown next to the rate, e.g. "per day". */
  unit?: string;
  /** Stock ceiling (medicines). */
  maxQty?: number;
  /** Why the item can't be billed right now. */
  disabledReason?: string;
  doctor?: { name: string; department: string };
}

export const CATALOG_TABS: Array<{ kind: CatalogKind; label: string; icon: IconName }> = [
  { kind: 'consultation', label: 'Consultation', icon: 'medkit-outline' },
  { kind: 'lab', label: 'Lab Tests', icon: 'flask-outline' },
  { kind: 'radiology', label: 'Radiology', icon: 'scan-outline' },
  { kind: 'medicine', label: 'Medicines', icon: 'bandage-outline' },
  { kind: 'room', label: 'Room & Nursing', icon: 'bed-outline' },
  { kind: 'procedure', label: 'Procedures', icon: 'cut-outline' },
  { kind: 'registration', label: 'Registration', icon: 'card-outline' },
];

export const CATALOG_ICON: Record<CatalogKind | 'custom', IconName> = {
  consultation: 'medkit-outline',
  lab: 'flask-outline',
  radiology: 'scan-outline',
  medicine: 'bandage-outline',
  room: 'bed-outline',
  procedure: 'cut-outline',
  registration: 'card-outline',
  custom: 'create-outline',
};

export const DEFAULT_CATALOG_FOR_TYPE: Record<Invoice['type'], CatalogKind> = {
  REG: 'registration',
  OPD: 'consultation',
  IPD: 'room',
  Pharmacy: 'medicine',
  Lab: 'lab',
  Radiology: 'radiology',
  Surgery: 'procedure',
};

export const REGISTRATION_ITEM = { name: 'Patient Registration & Smart UHID Card', rate: 500 };

const REGISTRATION_ITEMS = [
  REGISTRATION_ITEM,
  { name: 'Duplicate UHID Card', rate: 100 },
  { name: 'Medical Records Copy', rate: 200 },
  { name: 'Medical / Fitness Certificate', rate: 300 },
];

export const NURSING_ITEM = { name: 'Nursing Care & Monitoring', rate: 1000, unit: 'per day' };

const NURSING_ITEMS: Array<{ name: string; rate: number; unit?: string }> = [
  NURSING_ITEM,
  { name: 'Admission, Nursing & Sanitization', rate: 1000 },
  { name: 'Intensivist Rounds', rate: 1000, unit: 'per visit' },
  { name: 'Oxygen Therapy', rate: 800, unit: 'per day' },
  { name: 'Cardiac Monitoring & Infusion Pumps', rate: 3000, unit: 'per day' },
];

const PROCEDURES: Array<{ name: string; rate: number; detail: string }> = [
  { name: 'Dressing (Minor)', rate: 300, detail: 'Wound care' },
  { name: 'Nebulization', rate: 250, detail: 'Per session' },
  { name: 'ECG (12-lead)', rate: 400, detail: 'Cardiology' },
  { name: 'IV Cannulation & Infusion Set', rate: 350, detail: 'Consumables included' },
  { name: 'Suturing (Minor Laceration)', rate: 1200, detail: 'Local anaesthesia' },
  { name: 'Plaster Cast Application', rate: 1800, detail: 'Orthopedics' },
  { name: 'Platelet Transfusion (SDP)', rate: 15000, detail: 'Blood bank' },
  { name: 'Operation Theatre & Consumables', rate: 24000, detail: 'Per procedure' },
  { name: 'Surgeon & Anaesthetist Fees', rate: 38000, detail: 'Per procedure' },
  { name: 'Ambulance Transfer (City)', rate: 1500, detail: 'Within 20 km' },
];

export const buildCatalog = (s: {
  doctors: Doctor[];
  labTests: LabTest[];
  radiologyScans: RadiologyScan[];
  medicines: Medicine[];
  wardInfo: WardInfo[];
}): Record<CatalogKind, CatalogEntry[]> => ({
  consultation: s.doctors.map((d) => ({
    key: `doc-${d.id}`,
    kind: 'consultation',
    name: `Specialist Consultation — ${d.name}`,
    detail: `${d.specialty} • ${d.department} • ${d.room}`,
    rate: d.fee,
    doctor: { name: d.name, department: d.department },
  })),
  lab: s.labTests.map((t) => ({
    key: `lab-${t.id}`,
    kind: 'lab',
    name: t.name,
    detail: `${t.category} • TAT ${t.turnaroundTime}`,
    rate: t.price,
  })),
  radiology: s.radiologyScans.map((x) => ({
    key: `rad-${x.id}`,
    kind: 'radiology',
    name: x.name,
    detail: `${x.category} • ${x.duration}`,
    rate: x.price,
  })),
  medicine: s.medicines.map((m) => ({
    key: `med-${m.id}`,
    kind: 'medicine',
    name: m.name,
    detail: `${m.category} • ${m.stock} ${m.dosageForm.toLowerCase()} in stock • exp ${m.expiry}`,
    rate: m.price,
    unit: `per ${m.dosageForm.toLowerCase()}`,
    maxQty: m.stock,
    disabledReason: m.stock <= 0 ? 'Out of stock' : isExpired(m) ? 'Expired' : undefined,
  })),
  room: [
    ...s.wardInfo.map((w) => ({
      key: `ward-${w.id}`,
      kind: 'room' as const,
      name: `${w.name} — room charges`,
      detail: `${w.available} of ${w.totalBeds} beds free`,
      rate: w.dailyRate ?? 1600,
      unit: 'per day',
    })),
    ...NURSING_ITEMS.map((n, i) => ({ key: `nurse-${i}`, kind: 'room' as const, name: n.name, rate: n.rate, unit: n.unit })),
  ],
  procedure: PROCEDURES.map((p, i) => ({ key: `proc-${i}`, kind: 'procedure', name: p.name, detail: p.detail, rate: p.rate })),
  registration: REGISTRATION_ITEMS.map((r, i) => ({ key: `reg-${i}`, kind: 'registration', name: r.name, rate: r.rate })),
});
