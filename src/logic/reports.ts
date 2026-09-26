import {
  LAB_PIPELINE_BASE,
  LOW_STOCK_THRESHOLD,
  PATIENT_REGISTRY_BASE,
  REPORT_DEFINITIONS,
  REVENUE_BY_PERIOD,
  TODAY_COLLECTION_BASE,
} from '../data/mockData';
import type { Invoice, InvoiceItem, LabSample, Patient, ReportDefinition, WardInfo } from '../data/mockData';
import { bedSummary, expiresSoon, isExpired, labPipelineCounts, todayStatsFor } from './hospital';
import type { HospitalState } from './hospital';
import { paymentModeSplit, receiptHeading, revenueForPeriod } from './billing';
import {
  clockToMinutes,
  daysFromToday,
  formatClock,
  formatDayMonth,
  formatDisplayDate,
  isoDaysFromToday,
  todayISO,
  weekdayShort,
} from '../utils/dates';

/**
 * Live reports built from the hospital state (pure — unit-tested in Node).
 *
 * Every report is recomputed from the current records, so a bill collected or
 * a patient admitted a moment ago shows up immediately. Hospital-wide counters
 * that CareSync does not itemise (other billing desks, analyzer volume, legacy
 * registrations) are called out in each report's notes so totals reconcile.
 */

export interface ReportKpi {
  label: string;
  value: string;
}

export interface ReportChartPoint {
  label: string;
  value: number;
}

export interface ReportData {
  id: string;
  title: string;
  subtitle: string;
  category: ReportDefinition['category'];
  /** Display string, e.g. "26 Sep 2026, 10:45 AM". */
  generatedAt: string;
  kpis: ReportKpi[];
  columns: string[];
  rows: string[][];
  /** Column indexes rendered right-aligned (amounts, counts). */
  alignRight?: number[];
  chart?: ReportChartPoint[];
  chartTitle?: string;
  chartUnit?: 'currency' | 'count' | 'percent';
  notes?: string[];
}

type ReportBody = Omit<ReportData, 'id' | 'title' | 'subtitle' | 'category' | 'generatedAt'>;

// -------------------------------------------------------------
// Formatting helpers (engine-independent, Indian digit grouping)
// -------------------------------------------------------------
const groupIndian = (digits: string): string => {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(',')},${last3}`;
};

/** "₹4,82,500" / "₹12.50" */
export const inr = (amount: number): string => {
  const safe = Number.isFinite(amount) ? amount : 0;
  const cents = Math.round(Math.abs(safe) * 100);
  const whole = Math.floor(cents / 100);
  const paise = cents % 100;
  return `${safe < 0 ? '-' : ''}₹${groupIndian(String(whole))}${paise ? `.${String(paise).padStart(2, '0')}` : ''}`;
};

const count = (n: number): string => groupIndian(String(Math.round(Math.abs(n))));
const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const sumBy = <T,>(list: T[], pick: (item: T) => number): number => list.reduce((total, item) => total + pick(item), 0);
const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

const generatedAtLabel = (): string => `${formatDisplayDate(new Date())}, ${formatClock()}`;

/** "Dr. Arjun Nair (Cardiology)" → { name: "Dr. Arjun Nair", department: "Cardiology" } */
const splitDoctor = (doctorName?: string): { name: string; department?: string } | null => {
  const raw = (doctorName ?? '').trim();
  if (!raw) return null;
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(raw);
  return m ? { name: m[1].trim(), department: m[2].trim() } : { name: raw };
};

const firstName = (doctor: string) => doctor.replace(/^Dr\.?\s+/i, '').split(/\s+/)[0] ?? doctor;
const insurer = (insurance: string) => insurance.replace(/\s*\((active|inactive|expired)\)\s*$/i, '').trim() || 'Self Pay';

/** Time a receipt is dated by: when it was paid, else when it was raised. */
const receiptTime = (inv: Invoice) => (inv.status === 'Paid' ? inv.paidAt ?? inv.time : inv.time);

const chargeLines = (inv: Invoice): InvoiceItem[] =>
  inv.items?.length ? inv.items.filter((i) => i.amount > 0) : [{ description: inv.title, qty: 1, amount: inv.amount }];

const wardLabel = (w: WardInfo): string => {
  if (w.type === 'ICU') return 'ICU';
  if (w.type === 'Deluxe') return 'Deluxe';
  return /Ward\s+[A-Z]\b/.exec(w.name)?.[0] ?? w.name;
};

const TEST_NAMES: Array<[RegExp, string]> = [
  [/cbc|blood count/i, 'Complete Blood Count (CBC)'],
  [/lft|liver/i, 'Liver Function Test (LFT)'],
  [/kft|kidney|renal function/i, 'Kidney Function Test (KFT)'],
  [/hba1c/i, 'HbA1c'],
  [/lipid/i, 'Lipid Profile'],
  [/thyroid|tsh/i, 'Thyroid Profile'],
  [/urine/i, 'Urine Routine & Microscopy'],
  [/dengue/i, 'Dengue NS1 Antigen'],
  [/culture/i, 'Blood Culture & Sensitivity'],
  [/smear/i, 'Peripheral Smear'],
  [/troponin/i, 'Troponin I'],
];
/** One canonical name per test, so "LFT (Liver Function Test)" and "Liver Function Test (LFT)" group together. */
const testName = (name: string) => TEST_NAMES.find(([re]) => re.test(name))?.[1] ?? name;

const LAB_CATEGORY_SHORT: Record<LabSample['category'], string> = {
  Hematology: 'Haem',
  Biochemistry: 'Biochem',
  Microbiology: 'Micro',
  Pathology: 'Path',
};

const RADIOLOGY_SHORT: Record<string, string> = {
  'X-Ray': 'X-Ray',
  'CT Scan': 'CT',
  MRI: 'MRI',
  Ultrasound: 'USG',
  Mammography: 'Mammo',
};

/** Whole days between two ISO dates (b − a). */
const daysBetween = (fromISO: string, toISO: string) => daysFromToday(toISO) - daysFromToday(fromISO);

// -------------------------------------------------------------
// Financial
// -------------------------------------------------------------
const dailyCollection = (s: HospitalState): ReportBody => {
  const t = todayISO();
  const stats = todayStatsFor(s);
  const todays = s.invoices
    .filter((i) => i.dateISO === t)
    .sort((a, b) => clockToMinutes(receiptTime(a)) - clockToMinutes(receiptTime(b)));
  const paid = todays.filter((i) => i.status === 'Paid');
  const pending = todays.filter((i) => i.status === 'Pending');
  const paidTotal = sumBy(paid, (i) => i.amount);
  const pendingTotal = sumBy(pending, (i) => i.amount);
  const split = paymentModeSplit(s.invoices, t);
  const modes = Object.keys(split) as Array<keyof typeof split>;

  return {
    kpis: [
      { label: 'Total Collection', value: inr(stats.todayCollection) },
      { label: 'CareSync Receipts', value: inr(paidTotal) },
      { label: 'Receipts Issued', value: count(paid.length) },
      { label: 'Pending Raised Today', value: inr(pendingTotal) },
    ],
    columns: ['Receipt No', 'Time', 'Patient', 'Particulars', 'Mode', 'Status', 'Amount'],
    rows: todays.map((i) => [
      i.invoiceNo,
      receiptTime(i),
      i.patientName,
      i.title || receiptHeading(i),
      i.status === 'Paid' ? i.paymentMode : '—',
      i.status,
      inr(i.amount),
    ]),
    alignRight: [6],
    chart: modes.map((m) => ({ label: m, value: split[m] })),
    chartTitle: 'Itemised receipts by payment mode',
    chartUnit: 'currency',
    notes: [
      `Reconciliation: ${inr(paidTotal)} itemised in CareSync + ${inr(TODAY_COLLECTION_BASE)} from counters not itemised (other OPD desks, emergency, services) = ${inr(stats.todayCollection)}.`,
      paidTotal > 0
        ? `Payment modes (itemised): ${modes.map((m) => `${m} ${pct(split[m], paidTotal)}%`).join(' • ')}.`
        : 'No itemised receipts collected yet today.',
      pending.length
        ? `${plural(pending.length, 'invoice')} raised today ${pending.length === 1 ? 'is' : 'are'} still pending (${inr(pendingTotal)}) and excluded from the collection.`
        : 'Every invoice raised today has been collected.',
      `Hospital-wide outstanding: ${inr(stats.pendingAmount)} across ${plural(stats.pendingCount, 'invoice')}.`,
    ],
  };
};

const opdCollection = (s: HospitalState): ReportBody => {
  const stats = todayStatsFor(s);
  const rev = revenueForPeriod(REVENUE_BY_PERIOD, 'today', stats.todayCollection);
  const opd = s.invoices.filter((i) => i.type === 'OPD');
  const groups = new Map<string, { department: string; doctor: string; bills: number; paid: number; pending: number }>();
  opd.forEach((inv) => {
    const doc = splitDoctor(inv.doctorName);
    const doctor = doc?.name ?? 'Unassigned';
    const department = doc?.department ?? s.doctors.find((d) => d.name === doctor)?.department ?? 'General OPD';
    const key = `${department}|${doctor}`;
    const g = groups.get(key) ?? { department, doctor, bills: 0, paid: 0, pending: 0 };
    g.bills += 1;
    if (inv.status === 'Paid') g.paid += inv.amount;
    else g.pending += inv.amount;
    groups.set(key, g);
  });
  const list = [...groups.values()].sort((a, b) => a.department.localeCompare(b.department) || b.paid - a.paid);
  const byDept = new Map<string, number>();
  list.forEach((g) => byDept.set(g.department, (byDept.get(g.department) ?? 0) + g.paid));
  const paidTotal = sumBy(list, (g) => g.paid);
  const pendingTotal = sumBy(list, (g) => g.pending);
  const dates = opd.map((i) => i.dateISO).filter((d): d is string => !!d).sort();

  return {
    kpis: [
      { label: 'OPD Collected', value: inr(paidTotal) },
      { label: 'OPD Bills', value: count(opd.length) },
      { label: 'Pending', value: inr(pendingTotal) },
      { label: 'OPD Patients Today', value: count(stats.opdToday) },
    ],
    columns: ['Department', 'Doctor', 'Bills', 'Collected', 'Pending'],
    rows: list.map((g) => [g.department, g.doctor, count(g.bills), inr(g.paid), g.pending ? inr(g.pending) : '—']),
    alignRight: [2, 3, 4],
    chart: [...byDept.entries()].map(([label, value]) => ({ label, value })),
    chartTitle: 'Collected by department',
    chartUnit: 'currency',
    notes: [
      `Hospital MIS today: ${inr(rev.opd.amount)} OPD revenue from ${count(rev.opd.count)} consultations across all counters.`,
      dates.length
        ? `Itemised rows cover consultation bills raised in CareSync from ${formatDayMonth(dates[0])} to ${formatDayMonth(dates[dates.length - 1])}.`
        : 'No OPD consultation bills have been raised in CareSync yet.',
      pendingTotal > 0 ? `Walk-in consultations billed at the desk stay pending until collected (${inr(pendingTotal)}).` : 'All OPD bills are collected.',
    ],
  };
};

const ROOM_LINE = /room|bed|suite|ward|icu/i;

const ipdAdmission = (s: HospitalState): ReportBody => {
  const stats = todayStatsFor(s);
  const beds = bedSummary(s);
  const admitted = s.patients
    .filter((p) => p.status === 'Admitted')
    .sort((a, b) => (b.admittedOn ?? '').localeCompare(a.admittedOn ?? ''));
  const ipdBills = s.invoices.filter((i) => i.type === 'IPD' || i.type === 'Surgery');
  const roomCharges = sumBy(
    s.invoices.filter((i) => i.type === 'IPD'),
    (i) => sumBy(chargeLines(i).filter((l) => ROOM_LINE.test(l.description)), (l) => l.amount)
  );
  const outstanding = ipdBills.filter((i) => i.status === 'Pending');

  return {
    kpis: [
      { label: 'Beds Occupied', value: count(beds.occupied) },
      { label: 'Occupancy', value: `${beds.pct}%` },
      { label: 'Admissions Today', value: count(stats.admissionsToday) },
      { label: 'Room & Bed Charges', value: inr(roomCharges) },
    ],
    columns: ['Patient', 'UHID', 'Room / Bed', 'Admitted', 'Day', 'Consultant', 'Billed', 'Due'],
    rows: admitted.map((p) => {
      const bills = ipdBills.filter((i) => i.patientId === p.id);
      const billed = sumBy(bills, (i) => i.amount);
      const due = sumBy(bills.filter((i) => i.status === 'Pending'), (i) => i.amount);
      const day = p.admittedOn ? Math.max(1, -daysFromToday(p.admittedOn) + 1) : 1;
      return [
        p.name,
        p.uhid,
        p.room ?? '—',
        p.admittedOn ? formatDayMonth(p.admittedOn) : '—',
        String(day),
        p.attendingDoctor ?? '—',
        billed ? inr(billed) : '—',
        due ? inr(due) : '—',
      ];
    }),
    alignRight: [4, 6, 7],
    chart: s.wardInfo.map((w) => ({ label: wardLabel(w), value: w.occupied })),
    chartTitle: 'Occupied beds by ward',
    chartUnit: 'count',
    notes: [
      `Daily room rates: ${s.wardInfo.map((w) => `${wardLabel(w)} ${w.dailyRate ? inr(w.dailyRate) : '—'}`).join(' • ')}.`,
      `Discharges today: ${count(stats.dischargesToday)}. Bed counts are hospital-wide; the table lists in-patients with CareSync records.`,
      outstanding.length
        ? `IPD & surgery outstanding: ${inr(sumBy(outstanding, (i) => i.amount))} across ${plural(outstanding.length, 'invoice')} — collect before discharge.`
        : 'No IPD or surgery invoices are outstanding.',
    ],
  };
};

const pharmacySales = (s: HospitalState): ReportBody => {
  const stats = todayStatsFor(s);
  const rev = revenueForPeriod(REVENUE_BY_PERIOD, 'today', stats.todayCollection);
  const bills = s.invoices.filter((i) => i.type === 'Pharmacy');
  const lines = new Map<string, { qty: number; revenue: number; bills: Set<string> }>();
  bills.forEach((b) =>
    chargeLines(b).forEach((l) => {
      const entry = lines.get(l.description) ?? { qty: 0, revenue: 0, bills: new Set<string>() };
      entry.qty += l.qty ?? 1;
      entry.revenue += l.amount;
      entry.bills.add(b.id);
      lines.set(l.description, entry);
    })
  );
  const sold = [...lines.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
  const stockOf = (name: string) => {
    const lower = name.toLowerCase();
    const med = s.medicines.find((m) => m.name.toLowerCase() === lower) ?? s.medicines.find((m) => lower.startsWith(m.name.toLowerCase()));
    if (!med) return 'Not stocked';
    if (med.stock === 0) return 'Out of stock';
    return `${count(med.stock)} left${med.stock <= LOW_STOCK_THRESHOLD ? ' (low)' : ''}`;
  };
  const low = s.medicines.filter((m) => m.stock <= LOW_STOCK_THRESHOLD);
  const expiring = s.medicines.filter((m) => expiresSoon(m));
  const expired = s.medicines.filter((m) => isExpired(m));
  const pendingBills = bills.filter((b) => b.status === 'Pending');

  const notes = [
    low.length
      ? `Low stock (≤ ${LOW_STOCK_THRESHOLD}): ${low.map((m) => `${m.name} (${m.stock === 0 ? 'out of stock' : m.stock})`).join(', ')}.`
      : `All medicines are above the low-stock threshold of ${LOW_STOCK_THRESHOLD}.`,
    expiring.length
      ? `Expiring within 2 months: ${expiring.map((m) => `${m.name} (exp ${m.expiry})`).join(', ')}.`
      : 'No batches expire in the next 2 months.',
  ];
  if (expired.length) notes.push(`Expired — remove from shelf: ${expired.map((m) => `${m.name} (exp ${m.expiry})`).join(', ')}.`);
  if (pendingBills.length) notes.push(`${plural(pendingBills.length, 'pharmacy bill')} pending collection (${inr(sumBy(pendingBills, (b) => b.amount))}).`);
  notes.push(`Hospital MIS today: ${inr(rev.pharmacy.amount)} pharmacy revenue from ${count(rev.pharmacy.count)} prescriptions across all counters.`);

  return {
    kpis: [
      { label: 'Pharmacy Sales', value: inr(sumBy(bills, (b) => b.amount)) },
      { label: 'Bills', value: count(bills.length) },
      { label: 'Low Stock Items', value: count(low.length) },
      { label: 'Expiring ≤ 2 Months', value: count(expiring.length) },
    ],
    columns: ['Medicine', 'Qty Sold', 'Bills', 'Revenue', 'Stock'],
    rows: sold.map(([name, e]) => [name, count(e.qty), count(e.bills.size), inr(e.revenue), stockOf(name)]),
    alignRight: [1, 2, 3],
    chart: sold.slice(0, 6).map(([name, e]) => ({ label: name.split(/\s+/)[0], value: e.revenue })),
    chartTitle: 'Top medicines by revenue',
    chartUnit: 'currency',
    notes,
  };
};

const labRadiology = (s: HospitalState): ReportBody => {
  const t = todayISO();
  const stats = todayStatsFor(s);
  const rev = revenueForPeriod(REVENUE_BY_PERIOD, 'today', stats.todayCollection);
  const pipe = labPipelineCounts(s);
  const samples = s.labSamples.filter((x) => x.date === t);
  const orders = s.radiologyOrders.filter((o) => o.date === t);
  const labBills = s.invoices.filter((i) => i.type === 'Lab' && i.dateISO === t);
  const radBills = s.invoices.filter((i) => i.type === 'Radiology' && i.dateISO === t);

  const labRows = new Map<string, { orders: number; done: number; abnormal: number; billed: number }>();
  samples.forEach((x) => {
    const key = testName(x.testName);
    const r = labRows.get(key) ?? { orders: 0, done: 0, abnormal: 0, billed: 0 };
    r.orders += 1;
    if (x.status === 'Completed' || x.status === 'Abnormal') r.done += 1;
    if (x.status === 'Abnormal') r.abnormal += 1;
    labRows.set(key, r);
  });
  labBills.forEach((b) =>
    chargeLines(b).forEach((l) => {
      const key = testName(l.description);
      const r = labRows.get(key) ?? { orders: 0, done: 0, abnormal: 0, billed: 0 };
      r.billed += l.amount;
      labRows.set(key, r);
    })
  );

  const radRows = new Map<string, { orders: number; done: number; billed: number }>();
  orders.forEach((o) => {
    const r = radRows.get(o.scanName) ?? { orders: 0, done: 0, billed: 0 };
    r.orders += 1;
    if (o.status === 'Reported') r.done += 1;
    radRows.set(o.scanName, r);
  });
  radBills.forEach((b) =>
    chargeLines(b).forEach((l) => {
      const r = radRows.get(l.description) ?? { orders: 0, done: 0, billed: 0 };
      r.billed += l.amount;
      radRows.set(l.description, r);
    })
  );

  const chart: ReportChartPoint[] = [];
  (Object.keys(LAB_CATEGORY_SHORT) as Array<LabSample['category']>).forEach((cat) => {
    const n = samples.filter((x) => x.category === cat).length;
    if (n) chart.push({ label: LAB_CATEGORY_SHORT[cat], value: n });
  });
  Object.keys(RADIOLOGY_SHORT).forEach((cat) => {
    const n = orders.filter((o) => o.category === cat).length;
    if (n) chart.push({ label: RADIOLOGY_SHORT[cat], value: n });
  });

  const abnormal = samples.filter((x) => x.status === 'Abnormal');
  const unsampled = [...labRows.entries()].filter(([, r]) => r.billed > 0 && r.orders === 0).map(([name]) => name);
  const notes = [
    `Hospital-wide lab pipeline today: New ${pipe.New} • Processing ${pipe.Processing} • Completed ${pipe.Completed} • Abnormal ${pipe.Abnormal} (includes analyzer volume not itemised in CareSync).`,
    `Hospital MIS today: ${inr(rev.diagnostics.amount)} diagnostics revenue from ${count(rev.diagnostics.count)} tests across all counters.`,
  ];
  if (abnormal.length) notes.push(`Abnormal today: ${abnormal.map((x) => `${x.patientName} — ${testName(x.testName)}`).join('; ')}.`);
  if (unsampled.length) notes.push(`Billed today without a sample in the LIS: ${unsampled.join(', ')} — check collection.`);

  return {
    kpis: [
      { label: 'Lab Samples Today', value: count(samples.length) },
      { label: 'Abnormal Flagged', value: count(abnormal.length) },
      { label: 'Radiology Orders', value: count(orders.length) },
      { label: 'Diagnostics Billed', value: inr(sumBy([...labBills, ...radBills], (b) => b.amount)) },
    ],
    columns: ['Service', 'Type', 'Orders', 'Completed', 'Abnormal', 'Billed'],
    rows: [
      ...[...labRows.entries()].map(([name, r]) => [name, 'Lab', count(r.orders), count(r.done), r.abnormal ? `${r.abnormal} abnormal` : '—', r.billed ? inr(r.billed) : '—']),
      ...[...radRows.entries()].map(([name, r]) => [name, 'Radiology', count(r.orders), count(r.done), '—', r.billed ? inr(r.billed) : '—']),
    ],
    alignRight: [2, 3, 5],
    chart,
    chartTitle: 'Orders today by section',
    chartUnit: 'count',
    notes,
  };
};

const doctorWise = (s: HospitalState): ReportBody => {
  const t = todayISO();
  const stats = todayStatsFor(s);
  const rev = revenueForPeriod(REVENUE_BY_PERIOD, 'today', stats.todayCollection);
  const rows = s.doctors.map((d) => {
    const appts = s.appointments.filter((a) => a.doctorId === d.id && a.status !== 'Cancelled');
    const today = appts.filter((a) => a.date === t);
    const bills = s.invoices.filter((i) => i.type === 'OPD' && splitDoctor(i.doctorName)?.name === d.name);
    return {
      doctor: d,
      today: today.length,
      seen: today.filter((a) => a.status === 'Completed').length,
      upcoming: appts.filter((a) => a.date > t).length,
      inpatients: s.patients.filter((p) => p.status === 'Admitted' && p.attendingDoctor === d.name).length,
      revenue: sumBy(bills.filter((i) => i.status === 'Paid'), (i) => i.amount),
    };
  });
  rows.sort((a, b) => b.today - a.today || b.revenue - a.revenue || a.doctor.name.localeCompare(b.doctor.name));
  const revenue = sumBy(rows, (r) => r.revenue);
  const top = [...rows].sort((a, b) => b.revenue - a.revenue)[0];
  const busiest = rows[0];
  const notes: string[] = [];
  if (busiest && busiest.today) notes.push(`Busiest today: ${busiest.doctor.name} with ${plural(busiest.today, 'appointment')}.`);
  if (top && top.revenue) notes.push(`Highest OPD collection: ${top.doctor.name} (${inr(top.revenue)}).`);
  notes.push(`OPD revenue counts paid consultation bills in CareSync; hospital MIS OPD today is ${inr(rev.opd.amount)}.`);

  return {
    kpis: [
      { label: 'Doctors', value: count(s.doctors.length) },
      { label: 'Appointments Today', value: count(sumBy(rows, (r) => r.today)) },
      { label: 'Consultations Done', value: count(sumBy(rows, (r) => r.seen)) },
      { label: 'OPD Revenue', value: inr(revenue) },
    ],
    columns: ['Doctor', 'Department', 'Today', 'Seen', 'Upcoming', 'In-patients', 'OPD Revenue'],
    rows: rows.map((r) => [
      r.doctor.name,
      r.doctor.department,
      count(r.today),
      count(r.seen),
      count(r.upcoming),
      count(r.inpatients),
      r.revenue ? inr(r.revenue) : '—',
    ]),
    alignRight: [2, 3, 4, 5, 6],
    chart: rows.filter((r) => r.today > 0).map((r) => ({ label: firstName(r.doctor.name), value: r.today })),
    chartTitle: 'Appointments today by doctor',
    chartUnit: 'count',
    notes,
  };
};

// -------------------------------------------------------------
// Patient
// -------------------------------------------------------------
const AGE_BANDS: Array<[string, number, number]> = [
  ['0–17', 0, 17],
  ['18–35', 18, 35],
  ['36–50', 36, 50],
  ['51–65', 51, 65],
  ['65+', 66, 200],
];

const patientRegister = (s: HospitalState): ReportBody => {
  const list = [...s.patients].sort((a, b) => (b.registeredDate ?? '').localeCompare(a.registeredDate ?? ''));
  const insured = list.filter((p) => insurer(p.insurance) !== 'Self Pay').length;
  const byStatus = (status: Patient['status']) => list.filter((p) => p.status === status).length;
  const thisMonth = list.filter((p) => daysFromToday(p.registeredDate) >= -30).length;
  const byGender = (g: Patient['gender']) => list.filter((p) => p.gender === g).length;

  return {
    kpis: [
      { label: 'Registry Total', value: count(PATIENT_REGISTRY_BASE + s.patients.length) },
      { label: 'Active', value: count(byStatus('Active')) },
      { label: 'Admitted', value: count(byStatus('Admitted')) },
      { label: 'Insured', value: `${pct(insured, list.length)}%` },
    ],
    columns: ['Patient', 'UHID', 'Age / Sex', 'Status', 'Insurance', 'Registered'],
    rows: list.map((p) => [
      p.name,
      p.uhid,
      `${p.age} / ${p.gender[0]}`,
      p.status,
      insurer(p.insurance),
      formatDisplayDate(p.registeredDate),
    ]),
    chart: AGE_BANDS.map(([label, lo, hi]) => ({ label, value: list.filter((p) => p.age >= lo && p.age <= hi).length })),
    chartTitle: 'Patients by age band',
    chartUnit: 'count',
    notes: [
      `${count(PATIENT_REGISTRY_BASE)} registrations from before CareSync are counted in the registry total but not itemised.`,
      `Registered in the last 30 days: ${count(thisMonth)}. Gender split: Female ${byGender('Female')} • Male ${byGender('Male')} • Other ${byGender('Other')}.`,
      `Discharged: ${count(byStatus('Discharged'))}. Self-pay patients: ${count(list.length - insured)}.`,
    ],
  };
};

const admissionsDischarges = (s: HospitalState): ReportBody => {
  const stats = todayStatsFor(s);
  const current = s.patients
    .filter((p) => p.status === 'Admitted')
    .sort((a, b) => (b.admittedOn ?? '').localeCompare(a.admittedOn ?? ''));
  const recent = s.patients
    .filter((p) => p.status !== 'Admitted' && p.dischargedOn && daysFromToday(p.dischargedOn) >= -30)
    .sort((a, b) => (b.dischargedOn ?? '').localeCompare(a.dischargedOn ?? ''));
  const stayOf = (p: Patient) => {
    if (!p.admittedOn) return 1;
    const end = p.status === 'Admitted' || !p.dischargedOn ? todayISO() : p.dischargedOn;
    return Math.max(1, daysBetween(p.admittedOn, end));
  };
  const everyone = [...current, ...recent];
  const avgStay = everyone.length ? sumBy(everyone, stayOf) / everyone.length : 0;
  const summaryRoom = (p: Patient) => s.dischargeSummaries.find((d) => d.patientId === p.id)?.room;
  const byDept = new Map<string, number>();
  current.forEach((p) => {
    const dept = p.department ?? 'General';
    byDept.set(dept, (byDept.get(dept) ?? 0) + 1);
  });
  const finals = s.dischargeSummaries.filter((d) => d.status !== 'Draft').length;
  const pendingDischarge = s.nurseTasks.filter((t) => t.category === 'Discharge' && !t.completed);

  const notes = [
    `Discharge summaries on file: ${finals} final, ${s.dischargeSummaries.length - finals} draft.`,
    pendingDischarge.length
      ? `Discharge preparation pending: ${pendingDischarge.map((t) => `${t.patientName} (${t.ward})`).join(', ')}.`
      : 'No discharge preparations pending on the wards.',
    'Admission and discharge counts are hospital-wide; the table lists patients with CareSync records from the last 30 days.',
  ];

  return {
    kpis: [
      { label: 'Current In-patients', value: count(current.length) },
      { label: 'Admissions Today', value: count(stats.admissionsToday) },
      { label: 'Discharges Today', value: count(stats.dischargesToday) },
      { label: 'Avg Length of Stay', value: `${avgStay.toFixed(1)} days` },
    ],
    columns: ['Patient', 'Status', 'Room / Ward', 'Admitted', 'Discharged', 'Stay', 'Consultant'],
    rows: everyone.map((p) => [
      p.name,
      p.status === 'Admitted' ? 'In-patient' : 'Discharged',
      p.room ?? summaryRoom(p) ?? '—',
      p.admittedOn ? formatDayMonth(p.admittedOn) : '—',
      p.status !== 'Admitted' && p.dischargedOn ? formatDayMonth(p.dischargedOn) : '—',
      plural(stayOf(p), 'day'),
      p.attendingDoctor ?? '—',
    ]),
    alignRight: [5],
    chart: [...byDept.entries()].map(([label, value]) => ({ label, value })),
    chartTitle: 'In-patients by department',
    chartUnit: 'count',
    notes,
  };
};

const followUps = (s: HospitalState): ReportBody => {
  const t = todayISO();
  type Row = { patient: string; doctor: string; date: string; time: string; status: string; reason: string; phone?: string };
  const phoneOf = (patientId: string) => s.patients.find((p) => p.id === patientId)?.phone;
  const rows: Row[] = s.appointments
    .filter((a) => a.type === 'Follow Up' && a.status !== 'Cancelled')
    .map((a) => ({
      patient: a.patientName,
      doctor: a.doctorName,
      date: a.date,
      time: a.time,
      status:
        a.status === 'Completed'
          ? 'Completed'
          : a.status === 'Not Arrived' || a.date < t
            ? 'Missed'
            : a.date === t
              ? 'Due today'
              : 'Upcoming',
      reason: a.reason ?? a.department,
      phone: phoneOf(a.patientId),
    }));
  // Follow-ups advised at a visit but never booked.
  s.visits
    .filter((v) => v.followUpDate && Math.abs(daysFromToday(v.followUpDate)) <= 30)
    .forEach((v) => {
      const booked = s.appointments.some((a) => a.patientId === v.patientId && a.date === v.followUpDate && a.status !== 'Cancelled');
      if (booked) return;
      const patient = s.patients.find((p) => p.id === v.patientId);
      rows.push({
        patient: patient?.name ?? 'Unknown patient',
        doctor: v.doctorName,
        date: v.followUpDate!,
        time: '—',
        status: v.followUpDate! < t ? 'Missed' : 'Not booked',
        reason: `Advised after: ${v.diagnosis}`,
        phone: patient?.phone,
      });
    });
  const order: Record<string, number> = { Missed: 0, 'Due today': 1, 'Not booked': 2, Upcoming: 3, Completed: 4 };
  rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.date.localeCompare(b.date) || clockToMinutes(a.time) - clockToMinutes(b.time));
  const n = (status: string) => rows.filter((r) => r.status === status).length;
  const missed = rows.filter((r) => r.status === 'Missed');
  const week = Array.from({ length: 7 }, (_, i) => isoDaysFromToday(i));

  const notes = [
    missed.length
      ? `Call to rebook: ${missed.map((r) => `${r.patient}${r.phone ? ` (${r.phone})` : ''}`).join(', ')}.`
      : 'No missed follow-ups.',
    'Follow-ups advised during a consultation but not yet booked are listed as “Not booked”.',
  ];

  return {
    kpis: [
      { label: 'Upcoming', value: count(n('Upcoming')) },
      { label: 'Due Today', value: count(n('Due today')) },
      { label: 'Missed', value: count(missed.length) },
      { label: 'Not Booked', value: count(n('Not booked')) },
    ],
    columns: ['Patient', 'Doctor', 'Date', 'Time', 'Status', 'Reason'],
    rows: rows.map((r) => [r.patient, r.doctor, formatDayMonth(r.date), r.time, r.status, r.reason]),
    chart: week.map((iso, i) => ({
      label: i === 0 ? 'Today' : weekdayShort(iso),
      value: rows.filter((r) => r.date === iso && r.status !== 'Completed').length,
    })),
    chartTitle: 'Follow-ups due in the next 7 days',
    chartUnit: 'count',
    notes,
  };
};

// -------------------------------------------------------------
// Operational
// -------------------------------------------------------------
const bedOccupancy = (s: HospitalState): ReportBody => {
  const beds = bedSummary(s);
  const busy = s.wardInfo.filter((w) => pct(w.occupied, w.totalBeds) >= 85);
  const dailyBedRevenue = sumBy(s.wardInfo, (w) => w.occupied * (w.dailyRate ?? 0));
  return {
    kpis: [
      { label: 'Total Beds', value: count(beds.total) },
      { label: 'Occupied', value: count(beds.occupied) },
      { label: 'Available', value: count(beds.available) },
      { label: 'Occupancy', value: `${beds.pct}%` },
    ],
    columns: ['Ward', 'Type', 'Beds', 'Occupied', 'Free', 'Occupancy', 'Rate / Day'],
    rows: s.wardInfo.map((w) => [
      w.name,
      w.type,
      count(w.totalBeds),
      count(w.occupied),
      count(w.available),
      `${pct(w.occupied, w.totalBeds)}%`,
      w.dailyRate ? inr(w.dailyRate) : '—',
    ]),
    alignRight: [2, 3, 4, 5, 6],
    chart: s.wardInfo.map((w) => ({ label: wardLabel(w), value: pct(w.occupied, w.totalBeds) })),
    chartTitle: 'Occupancy by ward',
    chartUnit: 'percent',
    notes: [
      `ICU: ${beds.icuAvailable} of ${beds.icuTotal} beds free.`,
      busy.length
        ? `Above 85% occupancy: ${busy.map((w) => `${w.name} (${pct(w.occupied, w.totalBeds)}%)`).join(', ')} — plan discharges or step-down transfers.`
        : 'No ward is above 85% occupancy.',
      `Bed revenue at current occupancy: ${inr(dailyBedRevenue)} per day.`,
    ],
  };
};

const STATUS_ORDER: Record<LabSample['status'], number> = { Abnormal: 0, New: 1, Processing: 2, Completed: 3 };

const labTat = (s: HospitalState): ReportBody => {
  const t = todayISO();
  const pipe = labPipelineCounts(s);
  const samples = s.labSamples
    .filter((x) => x.date === t)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || clockToMinutes(a.collectedAt) - clockToMinutes(b.collectedAt));
  const abnormal = samples.filter((x) => x.status === 'Abnormal');
  const awaiting = samples.filter((x) => x.status === 'New' && (x.collectedAt === '—' || !x.collectedAt));

  const notes = [
    `Pipeline totals include analyzer volume not itemised in CareSync (base: New ${LAB_PIPELINE_BASE.New}, Processing ${LAB_PIPELINE_BASE.Processing}, Completed ${LAB_PIPELINE_BASE.Completed}, Abnormal ${LAB_PIPELINE_BASE.Abnormal}).`,
    abnormal.length
      ? `Abnormal results to acknowledge: ${abnormal.map((x) => `${x.patientName} — ${testName(x.testName)}${x.flag ? ` (${x.flag})` : ''}`).join('; ')}.`
      : 'No abnormal results today.',
  ];
  if (awaiting.length) notes.push(`Awaiting sample collection: ${awaiting.map((x) => `${x.patientName} (${testName(x.testName)})`).join(', ')}.`);

  return {
    kpis: [
      { label: 'New', value: count(pipe.New) },
      { label: 'Processing', value: count(pipe.Processing) },
      { label: 'Completed', value: count(pipe.Completed) },
      { label: 'Abnormal', value: count(pipe.Abnormal) },
    ],
    columns: ['Sample', 'Patient', 'Test', 'Collected', 'Status', 'TAT / Flag'],
    rows: samples.map((x) => [
      x.sampleCode,
      x.patientName,
      testName(x.testName),
      x.collectedAt || '—',
      x.status,
      x.status === 'Abnormal' ? x.flag ?? 'Abnormal — review' : x.turnaroundTime,
    ]),
    chart: [
      { label: 'New', value: pipe.New },
      { label: 'Processing', value: pipe.Processing },
      { label: 'Completed', value: pipe.Completed },
      { label: 'Abnormal', value: pipe.Abnormal },
    ],
    chartTitle: 'Samples by status (hospital-wide)',
    chartUnit: 'count',
    notes,
  };
};

const inventoryStatus = (s: HospitalState): ReportBody => {
  const below = s.supplies.filter((x) => x.stock < x.reorderLevel).sort((a, b) => a.stock / a.reorderLevel - b.stock / b.reorderLevel);
  const meds = s.medicines
    .filter((m) => m.stock <= LOW_STOCK_THRESHOLD || isExpired(m) || expiresSoon(m))
    .sort((a, b) => a.stock - b.stock);
  const medStatus = (m: (typeof meds)[number]) => {
    const parts: string[] = [];
    if (m.stock === 0) parts.push('Out of stock');
    else if (m.stock <= LOW_STOCK_THRESHOLD) parts.push('Low stock');
    if (isExpired(m)) parts.push(`Expired ${m.expiry}`);
    else if (expiresSoon(m)) parts.push(`Expires ${m.expiry}`);
    return parts.join(' • ');
  };
  const onOrder = s.supplies.filter((x) => x.onOrder);

  return {
    kpis: [
      { label: 'Supplies Below Reorder', value: count(below.length) },
      { label: 'Indents On Order', value: count(onOrder.length) },
      { label: 'Medicines Low', value: count(s.medicines.filter((m) => m.stock > 0 && m.stock <= LOW_STOCK_THRESHOLD).length) },
      { label: 'Out of Stock / Expired', value: count(s.medicines.filter((m) => m.stock === 0 || isExpired(m)).length) },
    ],
    columns: ['Item', 'Category', 'Stock', 'Reorder At', 'On Order', 'Status'],
    rows: [
      ...below.map((x) => [
        x.name,
        x.category,
        `${count(x.stock)} ${x.unit}`,
        count(x.reorderLevel),
        x.onOrder ? count(x.onOrder) : '—',
        x.onOrder ? 'Indent raised' : 'Reorder now',
      ]),
      ...meds.map((m) => [
        m.name,
        `Medicine • ${m.category}`,
        `${count(m.stock)} ${m.dosageForm}`,
        count(LOW_STOCK_THRESHOLD),
        '—',
        medStatus(m),
      ]),
    ],
    alignRight: [2, 3, 4],
    chart: below.map((x) => ({ label: x.name.split(/[\s(]/)[0], value: pct(x.stock, x.reorderLevel) })),
    chartTitle: 'Stock as % of reorder level',
    chartUnit: 'percent',
    notes: [
      `${s.supplies.length - below.length} of ${s.supplies.length} supply lines are at or above their reorder level.`,
      onOrder.length
        ? `Indents on order: ${onOrder.map((x) => `${x.name} (+${x.onOrder} ${x.unit})`).join(', ')}.`
        : 'No indents are currently on order.',
      'Raise and receive indents from Inventory — this report updates instantly.',
    ],
  };
};

const BUILDERS: Record<string, (s: HospitalState) => ReportBody> = {
  'daily-collection': dailyCollection,
  'opd-collection': opdCollection,
  'ipd-admission': ipdAdmission,
  'pharmacy-sales': pharmacySales,
  'lab-radiology': labRadiology,
  'doctor-wise': doctorWise,
  'patient-register': patientRegister,
  'admissions-discharges': admissionsDischarges,
  'follow-ups': followUps,
  'bed-occupancy': bedOccupancy,
  'lab-tat': labTat,
  'inventory-status': inventoryStatus,
};

/** Builds a report from live state; null for an unknown report id. */
export const buildReport = (id: string, s: HospitalState): ReportData | null => {
  const def = REPORT_DEFINITIONS.find((d) => d.id === id);
  const build = def ? BUILDERS[def.id] : undefined;
  if (!def || !build) return null;
  return {
    id: def.id,
    title: def.title,
    subtitle: def.subtitle,
    category: def.category,
    generatedAt: generatedAtLabel(),
    ...build(s),
  };
};
