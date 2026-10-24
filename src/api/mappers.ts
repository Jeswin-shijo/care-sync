import type {
  Appointment,
  ClinicalNote,
  ClinicalProfile,
  Doctor,
  Invoice,
  LabParameter,
  LabSample,
  Patient,
  PatientDocument,
  AppNotification,
  RadiologyOrder,
  Visit,
  VitalsRecord,
} from '../data/mockData';
import { formatDisplayDate, toISODate } from '../utils/dates';
import type {
  ApiAppointment,
  ApiAppointmentStatus,
  ApiConsultation,
  ApiDocument,
  ApiImaging,
  ApiInvoice,
  ApiLabReport,
  ApiMedication,
  ApiPatient,
  ApiPrescription,
  ApiQueueBoard,
  ApiRole,
  ApiSettings,
  ApiTask,
  ApiVitals,
} from './types';

// Backend records → the app's own types (src/data/mockData.ts is the contract the
// screens are built on). Pure functions: no React, no network, unit-tested in
// Node by scripts/testing-agent.js. Fields the backend does not hold are left
// empty, never invented.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "26 Sep 2026" or "26 Sep 2026, 09:05 AM" → "2026-09-26"; '' when unparseable. */
export const isoFromDisplay = (value?: string): string => {
  const m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/.exec(value ?? '');
  if (!m) return '';
  const month = MONTHS.indexOf(m[2][0].toUpperCase() + m[2].slice(1, 3).toLowerCase());
  return month < 0 ? '' : `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};

/** The clock part of "26 Sep 2026, 09:05 AM" → "09:05 AM"; '' when absent. */
export const timeFromDisplay = (value?: string): string => /(\d{1,2}:\d{2}\s*[AP]M)/i.exec(value ?? '')?.[1].toUpperCase() ?? '';

/** "Allergy: Penicillin" → "Penicillin" (the backend prefixes allergy tags). */
const stripAllergy = (a: string) => a.replace(/^allergy:\s*/i, '').trim();

// ---------------------------------------------------------------- staff & roles

/** Account role → the app's role. Front-desk staff get the receptionist's access. */
export const roleFor = (role: ApiRole): 'doctor' | 'nurse' | 'lab' | 'pharmacy' | 'admin' | 'reception' =>
  role === 'pharmacist' ? 'pharmacy' : role === 'staff' ? 'reception' : role;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const clock = (minutes: number) => `${String(Math.floor(minutes / 60) % 12 || 12).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} ${minutes < 720 ? 'AM' : 'PM'}`;

/** "09:00-13:00, 14:00-17:00" + 30 → ["09:00 AM", "09:30 AM", …]; the API's call-agent settings define the sessions. */
export const slotsFromSessions = (sessions: string | undefined, slotMinutes: number | undefined): string[] => {
  const step = slotMinutes && slotMinutes >= 5 ? slotMinutes : 30;
  const out: string[] = [];
  for (const part of (sessions || '09:00-13:00, 14:00-17:00').split(',')) {
    const m = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/.exec(part);
    if (!m) continue;
    const open = Number(m[1]) * 60 + Number(m[2]);
    const close = Number(m[3]) * 60 + Number(m[4]);
    for (let t = open; t + step <= close; t += step) out.push(clock(t));
  }
  return out;
};

/** The hospital's doctor, from the settings' doctor profile (the backend runs one doctor's clinic). */
export const toDoctor = (settings: ApiSettings): Doctor => {
  const profile = settings.profile ?? {};
  const sessions = settings.callAgent?.clinicSessions || '09:00-13:00, 14:00-17:00';
  const closed = settings.callAgent?.closedDays ?? [];
  return {
    id: 'doc-primary',
    name: profile.name || 'Doctor',
    specialty: profile.specialization || profile.designation || 'General Physician',
    department: 'General Medicine',
    room: 'OPD',
    // No fee is stored on the backend; consultation invoices use the standard fee.
    fee: 500,
    timing: sessions
      .split(',')
      .map((s) => s.trim().split('-').map((t) => clock(Number(t.split(':')[0]) * 60 + Number(t.split(':')[1] ?? 0))).join(' - '))
      .join(', '),
    rating: 0,
    experienceYears: 0,
    availableDays: WEEKDAYS.filter((d) => !closed.includes(d)),
    qualification: profile.credentials || undefined,
    slots: slotsFromSessions(sessions, settings.callAgent?.slotMinutes),
  };
};

// ---------------------------------------------------------------- patients

export const toPatient = (p: ApiPatient): Patient => ({
  id: p.id,
  uhid: p.uhid,
  name: p.name,
  age: p.age,
  gender: p.gender,
  phone: p.phone,
  dob: p.dob ?? '',
  address: p.address ?? '',
  bloodGroup: p.bloodGroup || 'Not known',
  insurance: p.insurance?.provider ? `${p.insurance.provider}${p.insurance.policyNumber ? ` (${p.insurance.policyNumber})` : ''}` : 'Self Pay',
  status: p.status === 'Admitted' ? 'Admitted' : p.status === 'Discharged' ? 'Discharged' : 'Active',
  registeredDate: p.createdAt ? toISODate(new Date(p.createdAt)) : '',
  avatar: p.avatar || undefined,
  department: p.department || undefined,
  attendingDoctor: p.doctor || undefined,
  email: p.email || undefined,
  emergencyContact: p.emergencyContact || undefined,
});

/** The parts of a clinical profile the backend records: allergies, conditions and active medicines. */
export const toProfile = (p: ApiPatient, medications: ApiMedication[], latestReason = ''): ClinicalProfile => {
  const allergies = (p.allergies ?? []).map(stripAllergy).filter(Boolean);
  return {
    patientId: p.id,
    allergies,
    conditions: p.conditions ?? [],
    currentMedications: medications.filter((m) => m.uhid === p.uhid && (m.status ?? 'Active') === 'Active').map((m) => m.medicine),
    surgicalHistory: [],
    familyHistory: [],
    lifestyle: '',
    chiefComplaint: latestReason,
    riskFlags: allergies.length ? [`Allergy: ${allergies.join(', ')}`] : [],
  };
};

// ---------------------------------------------------------------- appointments

const APPOINTMENT_STATUS: Record<ApiAppointmentStatus, Appointment['status']> = {
  Scheduled: 'Confirmed',
  'Checked In': 'Waiting',
  Waiting: 'Waiting',
  'In Consultation': 'In Consultation',
  Completed: 'Completed',
  Canceled: 'Cancelled',
  'No Show': 'Not Arrived',
};

/** The app's status → the backend's (no-show is "No Show"; booked is "Scheduled"). */
export const apiAppointmentStatus = (status: Appointment['status']): ApiAppointmentStatus =>
  status === 'Confirmed' ? 'Scheduled' : status === 'Cancelled' ? 'Canceled' : status === 'Not Arrived' ? 'No Show' : status;

export const appointmentTypeFor = (type: string): Appointment['type'] =>
  /follow/i.test(type) ? 'Follow Up' : /ipd|admission/i.test(type) ? 'IPD' : 'OPD';

/** The backend's appointment type for one of the app's. */
export const apiAppointmentType = (type: Appointment['type']) => (type === 'Follow Up' ? 'Follow-up' : type === 'IPD' ? 'IPD Admission' : 'Consultation');

/** Queue token number by appointment id, for appointments checked in today (cancelled tokens excluded). */
export const queueNumbers = (board: ApiQueueBoard | null) =>
  new Map((board?.tokens ?? []).filter((t) => t.appointmentId && t.status !== 'cancelled').map((t) => [t.appointmentId!, t.number]));

/**
 * Appointments with the app's patient ids. The token is the queue token issued at
 * check-in (the number on the waiting-room display); 0 until then.
 */
export const toAppointments = (
  list: ApiAppointment[],
  patientIdByUhid: Map<string, string>,
  doctor: Doctor,
  queued: Map<string, number> = new Map()
): Appointment[] =>
  list.map((a) => ({
    id: a.id,
    patientId: patientIdByUhid.get(a.uhid) ?? '',
    patientName: a.patientName,
    doctorId: doctor.id,
    doctorName: doctor.name,
    department: doctor.department,
    type: appointmentTypeFor(a.type),
    time: a.time,
    date: a.date,
    status: APPOINTMENT_STATUS[a.status] ?? 'Confirmed',
    tokenNo: queued.get(a.id) ?? 0,
    reason: a.condition || undefined,
    confirmation: a.confirmation,
  }));

// ---------------------------------------------------------------- visits, notes, vitals

/** Consultations the copilot saved as stand-alone notes rather than visits. */
export const CLINICAL_NOTE_TYPE = 'Clinical Note';

const firstLine = (text?: string) => (text ?? '').split('\n').map((l) => l.trim()).find(Boolean) ?? '';

export const toVisit = (c: ApiConsultation, patientId: string, prescriptions: ApiPrescription[]): Visit => {
  const rx = prescriptions.find((p) => p.uhid === c.uhid && p.date === c.visitDate);
  return {
    id: c.id,
    patientId,
    date: isoFromDisplay(c.visitDate),
    type: c.visitType === 'IPD' ? 'IPD' : /follow/i.test(c.visitType) ? 'Follow Up' : /emergency/i.test(c.visitType) ? 'Emergency' : 'OPD',
    department: c.department,
    doctorName: c.doctor,
    symptoms: c.reason || firstLine(c.subjective),
    diagnosis: c.icd10?.length ? c.icd10.map((d) => d.description).join('; ') : firstLine(c.assessment),
    prescription: (rx?.items ?? []).map((i) => ({
      name: i.medicine,
      dose: i.dose ?? '',
      frequency: i.frequency ?? '',
      duration: i.duration ?? '',
      instructions: i.instructions || undefined,
    })),
    advice: c.plan || undefined,
    source: c.isFinal ? undefined : 'Draft',
  };
};

export const toClinicalNote = (c: ApiConsultation, patientId: string): ClinicalNote => ({
  id: c.id,
  patientId,
  date: isoFromDisplay(c.visitDate),
  time: c.visitTime,
  author: c.doctor,
  content:
    c.freeText ||
    [`S: ${c.subjective}`, `O: ${c.objective}`, `A: ${c.assessment}`, `P: ${c.plan}`].filter((l) => l.length > 3).join('\n'),
  status: c.isFinal ? 'Approved' : 'Draft',
  source: 'Text',
  approvedBy: c.isFinal ? c.doctor : undefined,
});

export const toVitals = (v: ApiVitals, patientId: string): VitalsRecord => ({
  id: v.id,
  patientId,
  date: isoFromDisplay(v.recordedAt),
  time: timeFromDisplay(v.recordedAt),
  bp: `${v.bpSystolic}/${v.bpDiastolic}`,
  pulse: v.heartRate,
  spo2: v.spo2 ?? 0,
  temp: v.temperature ?? 0,
  respRate: v.respiratoryRate,
  sugar: v.bloodSugarFasting,
  recordedBy: v.recordedBy,
});

// ---------------------------------------------------------------- diagnostics

const LAB_CATEGORIES: LabSample['category'][] = ['Biochemistry', 'Hematology', 'Microbiology', 'Pathology'];

/** "13.0 – 17.0" → { low: 13, high: 17 }; "< 200" → { high: 200 }; "> 60" → { low: 60 }. */
export const parseRange = (range?: string): { low?: number; high?: number } => {
  const r = (range ?? '').replace(/,/g, '');
  const between = /(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)/.exec(r);
  if (between) return { low: Number(between[1]), high: Number(between[2]) };
  const below = /[<≤]\s*(\d+(?:\.\d+)?)/.exec(r);
  if (below) return { high: Number(below[1]) };
  const above = /[>≥]\s*(\d+(?:\.\d+)?)/.exec(r);
  return above ? { low: Number(above[1]) } : {};
};

export const toLabSample = (r: ApiLabReport, patient?: Patient): LabSample => {
  const params = r.groups.flatMap((g) => g.parameters);
  const numeric: LabParameter[] = params
    .filter((p) => Number.isFinite(Number(p.result)))
    .map((p) => ({ name: p.name, value: Number(p.result), unit: p.unit ?? '', ...parseRange(p.referenceRange) }));
  const abnormal = params.filter((p) => p.status && !/normal/i.test(p.status));
  const pending = /pending|process|collected/i.test(r.status);
  return {
    id: r.id,
    sampleCode: `LAB-${r.id.slice(-6).toUpperCase()}`,
    patientName: patient?.name ?? '',
    uhid: r.uhid,
    testName: r.testName,
    category: LAB_CATEGORIES.find((c) => c.toLowerCase() === r.category.toLowerCase()) ?? 'Biochemistry',
    collectedAt: r.time,
    status: pending ? 'Processing' : abnormal.length ? 'Abnormal' : 'Completed',
    resultValue: params
      .slice(0, 3)
      .map((p) => `${p.name}: ${p.result}${p.unit ? ` ${p.unit}` : ''}`)
      .join(' • '),
    normalRange: params
      .slice(0, 3)
      .filter((p) => p.referenceRange)
      .map((p) => `${p.name}: ${p.referenceRange}`)
      .join(' • '),
    flag: abnormal.length ? abnormal.map((p) => `${p.name} ${p.status}`).join(', ') : undefined,
    turnaroundTime: pending ? 'In progress' : 'Ready',
    patientId: patient?.id,
    date: isoFromDisplay(r.date),
    parameters: numeric,
  };
};

const SCAN_CATEGORY: [RegExp, RadiologyOrder['category']][] = [
  [/x-?ray/i, 'X-Ray'],
  [/\bct\b|computed/i, 'CT Scan'],
  [/mri|magnetic/i, 'MRI'],
  [/ultra|usg|sono|echo/i, 'Ultrasound'],
  [/mammo/i, 'Mammography'],
];

export const toRadiologyOrder = (i: ApiImaging, patient?: Patient): RadiologyOrder => {
  const report = i.radiologistReport;
  const reported = !!report?.findings || /complete|report|final/i.test(i.status);
  return {
    id: i.id,
    patientId: patient?.id ?? '',
    patientName: patient?.name ?? '',
    scanName: i.bodyPart && !i.title.toLowerCase().includes(i.bodyPart.toLowerCase()) ? `${i.title} (${i.bodyPart})` : i.title,
    category: SCAN_CATEGORY.find(([re]) => re.test(i.modality))?.[1] ?? 'X-Ray',
    date: isoFromDisplay(i.date),
    time: i.time,
    status: reported ? 'Reported' : /progress|acquir/i.test(i.status) ? 'In Progress' : 'Scheduled',
    findings: report?.findings || i.findings?.join(' ') || undefined,
    impression: report?.impression || i.impression || undefined,
    orderedBy: report?.reportedBy || i.radiologist || '',
  };
};

// ---------------------------------------------------------------- billing

const PAYMENT_MODES: Invoice['paymentMode'][] = ['UPI', 'Cash', 'Card', 'Net Banking'];

/** The bill's type as stored in the backend's free-text visitType. */
export const BILL_VISIT_TYPE: Record<Invoice['type'], string> = {
  REG: 'Registration',
  OPD: 'OPD',
  IPD: 'IPD',
  Pharmacy: 'Pharmacy',
  Lab: 'Lab',
  Radiology: 'Radiology',
  Surgery: 'Surgery',
};

const invoiceType = (b: ApiInvoice): Invoice['type'] => {
  const saved = (Object.keys(BILL_VISIT_TYPE) as Invoice['type'][]).find((t) => BILL_VISIT_TYPE[t].toLowerCase() === b.visitType?.toLowerCase());
  if (saved && saved !== 'OPD') return saved;
  // Bills made elsewhere (web app, seed): infer from the items.
  const categories = b.items.map((i) => `${i.category ?? ''} ${i.service}`.toLowerCase()).join(' ');
  if (/regist/.test(categories)) return 'REG';
  if (/ipd|admission|room/i.test(b.visitType) || /room|bed charge/.test(categories)) return 'IPD';
  if (/surgery|procedure/.test(categories)) return 'Surgery';
  if (b.items.length && b.items.every((i) => /pharma|medicine/i.test(i.category ?? ''))) return 'Pharmacy';
  if (b.items.length && b.items.every((i) => /lab/i.test(i.category ?? ''))) return 'Lab';
  if (b.items.length && b.items.every((i) => /radio|imaging|x-ray|scan/i.test(`${i.category} ${i.service}`))) return 'Radiology';
  return 'OPD';
};

export const toInvoice = (b: ApiInvoice, patientId: string): Invoice => {
  const paid = b.balanceDue <= 0 && b.totalAmount > 0;
  return {
    id: b.id,
    invoiceNo: b.billNumber,
    title: b.items.length === 1 ? b.items[0].service : `${b.visitType} Bill`,
    type: invoiceType(b),
    patientId,
    patientName: b.patientName,
    uhid: b.uhid,
    date: isoFromDisplay(b.billDate) ? formatDisplayDate(isoFromDisplay(b.billDate)) : b.billDate,
    dateISO: isoFromDisplay(b.billDate) || undefined,
    time: timeFromDisplay(b.billDate),
    amount: b.totalAmount,
    // "Card (Online)" → "Card"; anything unrecognised reads as Cash.
    paymentMode: PAYMENT_MODES.find((m) => b.paymentMode?.toLowerCase().startsWith(m.toLowerCase())) ?? 'Cash',
    status: paid ? 'Paid' : 'Pending',
    doctorName: b.createdBy || undefined,
    items: b.items.map((i) => ({
      description: i.subCategory ? `${i.service} — ${i.subCategory}` : i.service,
      qty: i.qty,
      rate: i.unitPrice,
      amount: i.amount,
    })),
    paidAt: paid ? timeFromDisplay(b.billDate) || undefined : undefined,
    balanceDue: b.balanceDue,
  };
};

// ---------------------------------------------------------------- documents & alerts

/** Backend category → the app's document type, matched on category then title. */
const DOCUMENT_TYPE: [RegExp, PatientDocument['type']][] = [
  [/discharge/i, 'Discharge'],
  [/consent/i, 'Consent'],
  [/insurance|claim/i, 'Insurance'],
  [/id proof|identity|aadhaar/i, 'ID Proof'],
  [/imaging|radiology|x-ray|scan|mri|\bct\b/i, 'Imaging'],
  [/referral/i, 'Referral'],
  [/certificate/i, 'Certificate'],
  [/prescription|bill/i, 'Prescription'],
];

export const toDocument = (d: ApiDocument, patient?: Patient): PatientDocument => ({
  id: d.id,
  patientId: patient?.id ?? '',
  patientName: patient?.name ?? '',
  title: d.title,
  type: DOCUMENT_TYPE.find(([re]) => re.test(`${d.category} ${d.title}`))?.[1] ?? 'Lab Report',
  date: isoFromDisplay(d.date),
  size: d.fileSize || '—',
  uploadedBy: d.author,
});

/** The backend's document category for one of the app's types. */
export const apiDocumentCategory = (type: PatientDocument['type']): string =>
  ({
    Consent: 'Consent Form',
    'ID Proof': 'ID Proof',
    Insurance: 'Insurance & Claims',
    'Lab Report': 'Lab / Diagnostic',
    Discharge: 'Discharge Summary',
    Imaging: 'Imaging Report',
    Referral: 'Referral Letter',
    Certificate: 'Medical Certificate',
    Prescription: 'Prescription / Bill',
  })[type];

/** Open tasks & alerts from the backend, as the app's notifications (newest first). */
export const toNotification = (t: ApiTask): AppNotification => {
  const createdAt = t.createdAt ? Date.parse(t.createdAt) : undefined;
  return {
    id: t.id,
    title: t.title,
    description: [t.patientName, t.subtitle].filter(Boolean).join(' • '),
    category: /follow|appointment|communication/i.test(`${t.type} ${t.category}`) ? 'Appointments' : /bill|payment/i.test(t.type) ? 'Billing' : 'System',
    timestamp: t.dueDateTime,
    read: t.status === 'Completed',
    createdAt: Number.isFinite(createdAt) ? createdAt : undefined,
  };
};

/** Display date for the backend ("26 Sep 2026") from an app ISO day. */
export const displayFromIso = (iso: string) => formatDisplayDate(iso);
