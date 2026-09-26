import type { Ionicons } from '@expo/vector-icons';
import type { Doctor, Invoice, Patient } from '../../data/mockData';
import type { HospitalProfile, PaymentMode } from '../../logic/hospital';
import type { HospitalHeader, ReceiptPrintData } from '../../utils/pdfGenerator';
import { receiptHeading } from '../../logic/billing';
import { formatCurrency } from '../../utils/formatters';

export type IconName = keyof typeof Ionicons.glyphMap;

// -------------------------------------------------------------
// Invoice types, filters & payment modes
// -------------------------------------------------------------
export const INVOICE_TYPE_META: Record<Invoice['type'], { label: string; icon: IconName; color: string; bg: string }> = {
  REG: { label: 'Registration', icon: 'person-add', color: '#1E6BFF', bg: '#EFF6FF' },
  OPD: { label: 'OPD', icon: 'medkit', color: '#10B981', bg: '#ECFDF5' },
  IPD: { label: 'IPD', icon: 'bed', color: '#8B5CF6', bg: '#F5F3FF' },
  Pharmacy: { label: 'Pharmacy', icon: 'bandage', color: '#F59E0B', bg: '#FFFBEB' },
  Lab: { label: 'Lab', icon: 'flask', color: '#00B4D8', bg: '#E0F7FA' },
  Radiology: { label: 'Radiology', icon: 'scan', color: '#6366F1', bg: '#EEF2FF' },
  Surgery: { label: 'Surgery', icon: 'cut', color: '#EC4899', bg: '#FDF2F8' },
};

export const INVOICE_TYPE_ORDER: Invoice['type'][] = ['REG', 'OPD', 'IPD', 'Pharmacy', 'Lab', 'Radiology', 'Surgery'];

/** Default bill title per invoice type (matches what the clinical flows raise). */
export const DEFAULT_INVOICE_TITLE: Record<Invoice['type'], string> = {
  REG: 'Registration Fee',
  OPD: 'OPD Consultation Fee',
  IPD: 'IPD Charges',
  Pharmacy: 'Pharmacy Bill',
  Lab: 'Laboratory Bill',
  Radiology: 'Radiology Bill',
  Surgery: 'Surgery / Procedure Bill',
};

export const PAYMENT_MODE_ORDER: PaymentMode[] = ['UPI', 'Cash', 'Card', 'Net Banking'];

export const PAYMENT_MODE_META: Record<PaymentMode, { icon: IconName; color: string }> = {
  UPI: { icon: 'phone-portrait-outline', color: '#1E6BFF' },
  Cash: { icon: 'cash-outline', color: '#10B981' },
  Card: { icon: 'card-outline', color: '#8B5CF6' },
  'Net Banking': { icon: 'globe-outline', color: '#F59E0B' },
};

export const enabledPaymentModes = (modes: Record<PaymentMode, boolean>): PaymentMode[] =>
  PAYMENT_MODE_ORDER.filter((m) => modes[m]);

export type BillingFilterKey = 'All' | 'Pending' | 'OPD' | 'IPD' | 'Pharmacy' | 'Diagnostics' | 'Surgery' | 'Registration';

export interface BillingFilter {
  key: BillingFilterKey;
  label: string;
  match: (inv: Invoice) => boolean;
  /** Invoice type to preselect when creating an invoice from this filter. */
  invoiceType?: Invoice['type'];
}

export const BILLING_FILTERS: BillingFilter[] = [
  { key: 'All', label: 'All', match: () => true },
  { key: 'Pending', label: 'Pending', match: (i) => i.status === 'Pending' },
  { key: 'OPD', label: 'OPD', match: (i) => i.type === 'OPD', invoiceType: 'OPD' },
  { key: 'IPD', label: 'IPD', match: (i) => i.type === 'IPD', invoiceType: 'IPD' },
  { key: 'Pharmacy', label: 'Pharmacy', match: (i) => i.type === 'Pharmacy', invoiceType: 'Pharmacy' },
  { key: 'Diagnostics', label: 'Lab & Radiology', match: (i) => i.type === 'Lab' || i.type === 'Radiology', invoiceType: 'Lab' },
  { key: 'Surgery', label: 'Surgery', match: (i) => i.type === 'Surgery', invoiceType: 'Surgery' },
  { key: 'Registration', label: 'Registration', match: (i) => i.type === 'REG', invoiceType: 'REG' },
];

const FILTER_ALIASES: Record<string, BillingFilterKey> = {
  all: 'All',
  pending: 'Pending',
  due: 'Pending',
  unpaid: 'Pending',
  outstanding: 'Pending',
  opd: 'OPD',
  ipd: 'IPD',
  pharmacy: 'Pharmacy',
  lab: 'Diagnostics',
  labs: 'Diagnostics',
  laboratory: 'Diagnostics',
  radiology: 'Diagnostics',
  diagnostics: 'Diagnostics',
  'lab & radiology': 'Diagnostics',
  'lab and radiology': 'Diagnostics',
  surgery: 'Surgery',
  procedure: 'Surgery',
  procedures: 'Surgery',
  'procedures & other': 'Surgery',
  other: 'Surgery',
  reg: 'Registration',
  registration: 'Registration',
};

const firstParam = (raw?: string | string[]) => (Array.isArray(raw) ? raw[0] : raw)?.trim();

/** Accepts route params such as "Pending", "lab", "Radiology", "REG". */
export const parseBillingFilter = (raw?: string | string[]): BillingFilterKey | null => {
  const v = firstParam(raw)?.toLowerCase();
  return v ? FILTER_ALIASES[v] ?? null : null;
};

const TYPE_ALIASES: Record<string, Invoice['type']> = {
  reg: 'REG',
  registration: 'REG',
  opd: 'OPD',
  consultation: 'OPD',
  ipd: 'IPD',
  admission: 'IPD',
  pharmacy: 'Pharmacy',
  lab: 'Lab',
  laboratory: 'Lab',
  radiology: 'Radiology',
  surgery: 'Surgery',
  procedure: 'Surgery',
};

export const parseInvoiceType = (raw?: string | string[]): Invoice['type'] | null => {
  const v = firstParam(raw)?.toLowerCase();
  return v ? TYPE_ALIASES[v] ?? null : null;
};

// -------------------------------------------------------------
// People on the receipt
// -------------------------------------------------------------
/** "Dr. Arjun Nair (Cardiology)" → { name: "Dr. Arjun Nair", department: "Cardiology" } */
export const splitDoctorName = (doctorName?: string): { name: string; department?: string } | null => {
  const raw = (doctorName ?? '').trim();
  if (!raw) return null;
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(raw);
  return m ? { name: m[1].trim(), department: m[2].trim() } : { name: raw };
};

/** The consultant on the bill signs it; otherwise the billing desk does. */
export const signatoryFor = (invoice: Pick<Invoice, 'doctorName'>, doctors: Doctor[]): string => {
  const parsed = splitDoctorName(invoice.doctorName);
  const doctor = parsed ? doctors.find((d) => d.name === parsed.name) : undefined;
  return doctor?.name ?? 'Billing Desk';
};

/** When a receipt is dated: collection time for paid bills, else when it was raised. */
export const invoiceDisplayTime = (inv: Pick<Invoice, 'status' | 'paidAt' | 'time'>) =>
  inv.status === 'Paid' ? inv.paidAt ?? inv.time : inv.time;

export const insurerName = (insurance?: string) =>
  (insurance ?? '').replace(/\s*\((active|inactive|expired)\)\s*$/i, '').trim() || 'Self Pay';

export const isInsured = (patient?: Pick<Patient, 'insurance'> | null) =>
  !!patient && insurerName(patient.insurance) !== 'Self Pay';

/** Room shown on in-patient bills while the patient still occupies it. */
export const roomForInvoice = (inv: Pick<Invoice, 'type'>, patient?: Patient) =>
  patient?.status === 'Admitted' && (inv.type === 'IPD' || inv.type === 'Surgery') ? patient.room : undefined;

export const hospitalHeader = (h: HospitalProfile): HospitalHeader => ({
  name: h.name,
  address: h.address,
  phone: h.phone,
  email: h.email,
  gstin: h.gstin,
  regNo: h.regNo,
});

// -------------------------------------------------------------
// Amounts
// -------------------------------------------------------------
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ReceiptLine {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface ReceiptDeduction {
  description: string;
  /** Positive = subtracted from the bill; negative = added (adjustment). */
  amount: number;
  kind: 'insurance' | 'discount' | 'adjustment';
}

export interface ReceiptBreakdown {
  charges: ReceiptLine[];
  gross: number;
  deductions: ReceiptDeduction[];
  insurance: number;
  net: number;
}

/**
 * Splits an invoice into chargeable lines and deductions (insurance, discounts).
 * The invoice amount is the source of truth — any drift becomes an explicit
 * adjustment line so the printed arithmetic always adds up.
 */
export const receiptBreakdown = (inv: Pick<Invoice, 'items' | 'amount' | 'title' | 'insuranceCovered'>): ReceiptBreakdown => {
  const items = inv.items?.length ? inv.items : [{ description: inv.title, qty: 1, rate: inv.amount, amount: inv.amount }];
  const charges: ReceiptLine[] = items
    .filter((i) => i.amount >= 0)
    .map((i) => {
      const qty = i.qty && i.qty > 0 ? i.qty : 1;
      return { description: i.description, qty, rate: typeof i.rate === 'number' ? i.rate : round2(i.amount / qty), amount: i.amount };
    });
  const gross = round2(charges.reduce((n, c) => n + c.amount, 0));
  const deductions: ReceiptDeduction[] = items
    .filter((i) => i.amount < 0)
    .map((i) => ({ description: i.description, amount: -i.amount, kind: /insur/i.test(i.description) ? 'insurance' : 'discount' }));
  const covered = inv.insuranceCovered ?? 0;
  const deducted = () => deductions.reduce((n, d) => n + d.amount, 0);
  if (covered > 0 && !deductions.some((d) => d.kind === 'insurance') && Math.abs(gross - deducted() - covered - inv.amount) < 0.01) {
    deductions.push({ description: 'Less: Insurance approved', amount: covered, kind: 'insurance' });
  }
  const drift = round2(gross - deducted() - inv.amount);
  if (Math.abs(drift) >= 0.01) {
    deductions.push({ description: drift > 0 ? 'Adjustment' : 'Additional charges', amount: drift, kind: 'adjustment' });
  }
  const insurance = round2(deductions.filter((d) => d.kind === 'insurance').reduce((n, d) => n + d.amount, 0));
  return { charges, gross, deductions, insurance, net: inv.amount };
};

/** Everything the PDF template needs, with the hospital's live profile. */
export const receiptPrintData = (
  inv: Invoice,
  ctx: { hospital: HospitalProfile; doctors: Doctor[]; patient?: Patient; footer?: string; heading?: string }
): ReceiptPrintData => {
  const b = receiptBreakdown(inv);
  const doc = splitDoctorName(inv.doctorName);
  return {
    receiptNo: inv.invoiceNo,
    receiptType: ctx.heading ?? receiptHeading(inv),
    date: inv.date,
    time: invoiceDisplayTime(inv),
    patientName: inv.patientName,
    uhid: inv.uhid,
    paymentMode: inv.paymentMode,
    amount: inv.amount,
    // Insurance is printed from insuranceCovered, so it is not repeated as an item.
    items: [
      ...b.charges,
      ...b.deductions.filter((d) => d.kind !== 'insurance').map((d) => ({ description: d.description, qty: 1, rate: -d.amount, amount: -d.amount })),
    ],
    doctorName: doc?.name,
    department: doc?.department,
    room: roomForInvoice(inv, ctx.patient),
    status: inv.status,
    insuranceCovered: b.insurance || undefined,
    signatory: signatoryFor(inv, ctx.doctors),
    footer: ctx.footer,
    hospital: hospitalHeader(ctx.hospital),
  };
};

/** Plain-text receipt for WhatsApp / SMS / the share sheet. */
export const receiptShareText = (inv: Invoice, hospitalName: string): string =>
  [
    hospitalName,
    `${receiptHeading(inv)} ${inv.invoiceNo}`,
    `Patient: ${inv.patientName} (UHID ${inv.uhid})`,
    inv.status === 'Paid'
      ? `Amount paid: ${formatCurrency(inv.amount)} via ${inv.paymentMode} on ${inv.date}, ${invoiceDisplayTime(inv)}.`
      : `Amount due: ${formatCurrency(inv.amount)}. Please pay at the billing counter or via UPI.`,
    'This is a computer-generated receipt. Thank you for choosing us.',
  ].join('\n');

/** "+91 98765 43210" → "919876543210" (WhatsApp wants country code, digits only). */
export const whatsappNumber = (phone?: string): string | null => {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits.length >= 11 ? digits : null;
};
