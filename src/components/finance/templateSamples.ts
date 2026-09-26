import type { DischargeSummary, Doctor, Invoice, InvoiceItem, LabTest, Medicine, Patient, RadiologyScan, WardInfo } from '../../data/mockData';
import { INVOICE_PREFIX, itemsTotal, receiptHeading } from '../../logic/billing';
import { isExpired } from '../../logic/hospital';
import { clockToMinutes, formatClock, formatDisplayDate, relativeDayLabel, todayISO } from '../../utils/dates';
import { NURSING_ITEM, REGISTRATION_ITEM } from './catalog';
import { invoiceDisplayTime } from './invoiceUtils';
import type { FinanceTemplate } from './templates';

export interface TemplateSources {
  invoices: Invoice[];
  patients: Patient[];
  doctors: Doctor[];
  wardInfo: WardInfo[];
  medicines: Medicine[];
  labTests: LabTest[];
  radiologyScans: RadiologyScan[];
  dischargeSummaries: DischargeSummary[];
}

export type TemplateSample =
  | { kind: 'invoice'; invoice: Invoice; fromRecord: boolean; note: string }
  | { kind: 'claim'; invoice: Invoice; note: string }
  | { kind: 'discharge'; summary: DischargeSummary; note: string }
  | { kind: 'none'; note: string };

const stamp = (inv: Invoice) => `${inv.dateISO ?? ''}|${String(clockToMinutes(invoiceDisplayTime(inv))).padStart(4, '0')}`;
const newestFirst = (a: Invoice, b: Invoice) => (stamp(a) < stamp(b) ? 1 : stamp(a) > stamp(b) ? -1 : 0);

/** Real invoices that a template would have produced, newest first. */
export const invoicesForTemplate = (t: FinanceTemplate, invoices: Invoice[]): Invoice[] => {
  const list = (() => {
    switch (t.kind) {
      case 'admission':
        return invoices.filter((i) => i.type === 'IPD' && receiptHeading(i) === 'IPD Admission Receipt');
      case 'final-bill':
        return invoices.filter((i) => receiptHeading(i) === 'Final Hospital Bill');
      case 'claim':
        return invoices.filter((i) => (i.insuranceCovered ?? 0) > 0);
      case 'discharge':
        return [];
      default:
        return invoices.filter((i) => i.type === t.invoiceType && receiptHeading(i) !== 'Final Hospital Bill');
    }
  })();
  const sorted = [...list].sort(newestFirst);
  // Claim forms are filed for in-patient stays first.
  return t.kind === 'claim' ? [...sorted.filter((i) => i.type === 'IPD'), ...sorted.filter((i) => i.type !== 'IPD')] : sorted;
};

const sourceNote = (inv: Invoice) =>
  `Filled with ${inv.invoiceNo} • ${inv.patientName}${inv.dateISO ? ` (${relativeDayLabel(inv.dateISO)})` : ''}`;

const line = (description: string, rate: number, qty = 1): InvoiceItem => ({ description, qty, rate, amount: Math.round(rate * qty * 100) / 100 });

/** Clearly-labelled sample built from the catalogues when no real bill exists yet. */
const synthesize = (t: FinanceTemplate, s: TemplateSources): { invoice: Invoice; note: string } | null => {
  const admitted = s.patients
    .filter((p) => p.status === 'Admitted' && p.wardId)
    .sort((a, b) => (b.admittedOn ?? '').localeCompare(a.admittedOn ?? ''));
  const patient = t.kind === 'admission' ? admitted[0] ?? s.patients[0] : s.patients[0];
  if (!patient) return null;
  const ward = s.wardInfo.find((w) => w.id === patient.wardId) ?? s.wardInfo.find((w) => w.type === 'General');
  const rate = ward?.dailyRate ?? 1600;
  const doctor = s.doctors.find((d) => d.name === patient.attendingDoctor) ?? s.doctors[0];
  const type = t.invoiceType;

  let title = t.createTitle ?? t.title;
  let items: InvoiceItem[];
  let note = `Sample data for ${patient.name} from the hospital catalogue — not a real bill`;
  switch (t.kind) {
    case 'admission':
      items = [line(`${ward?.name ?? 'General Ward'} — advance (1 day)`, rate), line('Admission, Nursing & Sanitization', 1000)];
      note = `Sample data from ${patient.name}'s admission — not a real bill`;
      break;
    case 'final-bill':
      items = [
        line(`Room Charges (5 days)`, rate, 5),
        line('Doctor Fees', 3000),
        line('Pharmacy', 2450),
        line('Lab & Radiology', 4200),
        line('Procedure Charges', 15000),
      ];
      break;
    default:
      switch (type) {
        case 'REG':
          items = [line(REGISTRATION_ITEM.name, REGISTRATION_ITEM.rate)];
          title = 'Registration Fee';
          break;
        case 'OPD':
          items = [line(`Specialist Consultation — ${doctor?.name ?? 'Consultant'}`, doctor?.fee ?? 500)];
          title = 'OPD Consultation Fee';
          break;
        case 'Pharmacy':
          items = s.medicines
            .filter((m) => m.stock >= 10 && !isExpired(m))
            .slice(0, 2)
            .map((m) => line(m.name, m.price, 10));
          title = 'Pharmacy Bill';
          break;
        case 'Lab':
          items = s.labTests.slice(0, 2).map((x) => line(x.name, x.price));
          title = 'Laboratory Bill';
          break;
        case 'Radiology':
          items = s.radiologyScans.slice(0, 1).map((x) => line(x.name, x.price));
          title = 'Radiology Bill';
          break;
        case 'Surgery':
          items = [line('Surgeon & Anaesthetist Fees', 38000), line('Operation Theatre & Consumables', 24000)];
          break;
        default:
          items = [line(`${ward?.name ?? 'General Ward'} — room charges`, rate), line(NURSING_ITEM.name, NURSING_ITEM.rate)];
      }
  }
  if (!items.length) return null;
  const now = new Date();
  const withDoctor = type === 'OPD' || type === 'IPD' || type === 'Surgery';
  return {
    invoice: {
      id: `sample-${t.id}`,
      // Clearly not a real receipt number.
      invoiceNo: `${INVOICE_PREFIX[type]}-${now.getFullYear()}-SAMPLE`,
      title,
      type,
      patientId: patient.id,
      patientName: patient.name,
      uhid: patient.uhid,
      date: t.kind === 'admission' && patient.admittedOn ? formatDisplayDate(patient.admittedOn) : formatDisplayDate(now),
      dateISO: t.kind === 'admission' && patient.admittedOn ? patient.admittedOn : todayISO(),
      time: formatClock(now),
      amount: itemsTotal(items),
      paymentMode: 'UPI',
      status: 'Paid',
      doctorName: withDoctor && doctor ? `${doctor.name} (${doctor.department})` : undefined,
      items,
    },
    note,
  };
};

const latestSummary = (s: TemplateSources): DischargeSummary | undefined => {
  const dischargedOn = (d: DischargeSummary) => s.patients.find((p) => p.id === d.patientId)?.dischargedOn ?? '';
  const finals = s.dischargeSummaries.filter((d) => d.status !== 'Draft').sort((a, b) => dischargedOn(b).localeCompare(dischargedOn(a)));
  return finals[0] ?? s.dischargeSummaries[0];
};

/** What a template preview renders: prefer the most recent real record of that kind. */
export const resolveTemplateSample = (t: FinanceTemplate, s: TemplateSources): TemplateSample => {
  if (t.kind === 'discharge') {
    const summary = latestSummary(s);
    return summary
      ? { kind: 'discharge', summary, note: `Filled with ${summary.patientName}'s ${summary.status === 'Draft' ? 'draft' : 'final'} summary` }
      : { kind: 'none', note: 'No discharge summaries yet. They are generated when an in-patient is discharged.' };
  }
  const real = invoicesForTemplate(t, s.invoices)[0];
  if (t.kind === 'claim') {
    return real
      ? { kind: 'claim', invoice: real, note: sourceNote(real) }
      : { kind: 'none', note: 'No insured in-patient bills yet. Raise an IPD bill with an insurance-approved amount to file a claim.' };
  }
  if (real) return { kind: 'invoice', invoice: real, fromRecord: true, note: sourceNote(real) };
  const sample = synthesize(t, s);
  return sample
    ? { kind: 'invoice', invoice: sample.invoice, fromRecord: false, note: sample.note }
    : { kind: 'none', note: 'Add a patient to preview this template.' };
};
