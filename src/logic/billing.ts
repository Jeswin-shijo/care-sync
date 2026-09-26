import type { Invoice, InvoiceItem, RevenuePeriod, RevenueSnapshot } from '../data/mockData';

/** Receipt number prefix per invoice type (REG-2026-00126, PH-2026-00322 …). */
export const INVOICE_PREFIX: Record<Invoice['type'], string> = {
  REG: 'REG',
  OPD: 'OPD',
  IPD: 'IPD',
  Pharmacy: 'PH',
  Lab: 'LB',
  Radiology: 'RAD',
  Surgery: 'SUR',
};

/** Human heading printed on the receipt / PDF for each invoice type. */
export const RECEIPT_HEADING: Record<Invoice['type'], string> = {
  REG: 'Registration Receipt',
  OPD: 'OPD Consultation Receipt',
  IPD: 'IPD Receipt',
  Pharmacy: 'Pharmacy Bill',
  Lab: 'Laboratory Bill',
  Radiology: 'Radiology Bill',
  Surgery: 'Surgery / Procedure Bill',
};

export const receiptHeading = (invoice: Pick<Invoice, 'type' | 'title'>): string => {
  if (/final/i.test(invoice.title)) return 'Final Hospital Bill';
  if (invoice.type === 'IPD' && /admission|advance/i.test(invoice.title)) return 'IPD Admission Receipt';
  return RECEIPT_HEADING[invoice.type];
};

/**
 * Next sequential receipt number for a type in a year, e.g. OPD-2026-00892.
 * Sequential per prefix+year so numbers never collide.
 */
export const nextInvoiceNumber = (invoices: Invoice[], type: Invoice['type'], year: number): string => {
  const prefix = `${INVOICE_PREFIX[type]}-${year}-`;
  const max = invoices.reduce((highest, inv) => {
    if (!inv.invoiceNo.startsWith(prefix)) return highest;
    const n = Number(inv.invoiceNo.slice(prefix.length));
    return Number.isFinite(n) && n > highest ? n : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
};

export const itemsTotal = (items: InvoiceItem[]): number =>
  items.reduce((sum, item) => sum + item.amount, 0);

/** Sum of paid invoices on an ISO date. */
export const paidOnDate = (invoices: Invoice[], dateISO: string): number =>
  invoices
    .filter((inv) => inv.status === 'Paid' && inv.dateISO === dateISO)
    .reduce((sum, inv) => sum + inv.amount, 0);

export const pendingInvoices = (invoices: Invoice[], minAmount = 0): Invoice[] =>
  invoices
    .filter((inv) => inv.status === 'Pending' && inv.amount > minAmount)
    .sort((a, b) => b.amount - a.amount);

export const outstandingForPatient = (invoices: Invoice[], patientId: string): number =>
  invoices
    .filter((inv) => inv.patientId === patientId && inv.status === 'Pending')
    .reduce((sum, inv) => sum + inv.amount, 0);

export const paymentModeSplit = (invoices: Invoice[], dateISO?: string) => {
  const split: Record<Invoice['paymentMode'], number> = { UPI: 0, Cash: 0, Card: 0, 'Net Banking': 0 };
  invoices
    .filter((inv) => inv.status === 'Paid' && (!dateISO || inv.dateISO === dateISO))
    .forEach((inv) => {
      split[inv.paymentMode] += inv.amount;
    });
  return split;
};

/**
 * Revenue for a period. The mock snapshot supplies the hospital-wide totals;
 * "today" is re-scaled so it always agrees with the live collection shown on
 * the dashboard and billing screens.
 */
export const revenueForPeriod = (
  snapshots: Record<RevenuePeriod, RevenueSnapshot>,
  period: RevenuePeriod,
  liveTodayCollection: number
): RevenueSnapshot => {
  const base = snapshots[period];
  if (period !== 'today' || base.total === 0) return base;
  const k = liveTodayCollection / base.total;
  const scale = (n: number) => Math.round(n * k);
  const parts = {
    opd: { ...base.opd, amount: scale(base.opd.amount) },
    ipd: { ...base.ipd, amount: scale(base.ipd.amount) },
    pharmacy: { ...base.pharmacy, amount: scale(base.pharmacy.amount) },
    diagnostics: { ...base.diagnostics, amount: scale(base.diagnostics.amount) },
    other: { ...base.other, amount: 0 },
  };
  // Put rounding drift into "other" so the parts always add up to the total.
  parts.other.amount =
    liveTodayCollection - parts.opd.amount - parts.ipd.amount - parts.pharmacy.amount - parts.diagnostics.amount;
  return {
    ...base,
    ...parts,
    total: liveTodayCollection,
    chart: base.chart.map((c) => ({ ...c, value: scale(c.value) })),
  };
};
