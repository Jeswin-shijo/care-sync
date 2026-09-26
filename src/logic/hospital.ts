import * as MD from '../data/mockData';
import type {
  Ambulance,
  Appointment,
  AppNotification,
  AuditEntry,
  BloodRequest,
  BloodStock,
  Branch,
  ClinicalNote,
  ClinicalProfile,
  Department,
  DischargeSummary,
  Doctor,
  HospitalProtocol,
  Invoice,
  InvoiceItem,
  LabParameter,
  LabSample,
  LabTest,
  Medicine,
  NurseTask,
  Patient,
  PatientDocument,
  PatientReminder,
  PrescriptionLine,
  PrescriptionReviewItem,
  RadiologyOrder,
  RadiologyScan,
  StaffMember,
  SupplyItem,
  Visit,
  VitalsRecord,
  WardInfo,
} from '../data/mockData';
import { HOSPITAL_CONFIG } from '../constants/config';
import {
  addDays,
  ageFromDob,
  clockToMinutes,
  daysFromToday,
  formatClock,
  toISODate as toISODateLocal,
  formatDayMonth,
  formatDisplayDate,
  fromISODate,
  monthsUntilExpiry,
  parseDob,
  startOfToday,
  todayISO,
  weekdayShort,
} from '../utils/dates';
import { itemsTotal, nextInvoiceNumber, outstandingForPatient, paidOnDate } from './billing';
import { checkPrescriptionSafety, type SafetyAlert } from './safety';
import { isAbnormal, latestVitals, parameterFlag, resultSummary, resultsForPatient, vitalsFlags } from './clinical';

// -------------------------------------------------------------
// State
// -------------------------------------------------------------
export type UserRole = 'doctor' | 'nurse' | 'lab' | 'pharmacy' | 'admin' | 'patient';
export type PaymentMode = Invoice['paymentMode'];

export interface CartItem {
  id: string;
  type: 'medicine' | 'lab' | 'radiology' | 'consultation';
  name: string;
  price: number;
  qty: number;
}

export interface AiCitation {
  label: string;
  detail?: string;
}

export interface AiActionCard {
  type: 'appointment' | 'invoice' | 'patient' | 'report';
  title: string;
  description: string;
  actionLabel?: string;
  /** expo-router path, e.g. "/pharmacy-review" or "/patient/[id]". */
  route?: string;
  params?: any;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionCard?: AiActionCard;
  citations?: AiCitation[];
  followUps?: string[];
  createdAt?: number;
}

export interface HospitalProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  regNo: string;
}

export interface HospitalSettings {
  notificationsEnabled: boolean;
  smsAlerts: boolean;
  whatsappAlerts: boolean;
  emailReports: boolean;
  language: string;
  gstPercent: number;
  paymentModes: Record<PaymentMode, boolean>;
  receiptFooter: string;
}

export interface HospitalState {
  activeRole: UserRole;
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  invoices: Invoice[];
  medicines: Medicine[];
  labTests: LabTest[];
  radiologyScans: RadiologyScan[];
  notifications: AppNotification[];
  selectedPatientId: string | null;
  cart: CartItem[];
  aiChatMessages: AiChatMessage[];
  patientChatMessages: AiChatMessage[];
  nurseTasks: NurseTask[];
  wardInfo: WardInfo[];
  labSamples: LabSample[];
  prescriptionReviews: PrescriptionReviewItem[];
  hospitalProtocols: HospitalProtocol[];
  patientReminders: PatientReminder[];
  clinicalProfiles: ClinicalProfile[];
  vitals: VitalsRecord[];
  visits: Visit[];
  clinicalNotes: ClinicalNote[];
  radiologyOrders: RadiologyOrder[];
  dischargeSummaries: DischargeSummary[];
  bloodStock: BloodStock[];
  bloodRequests: BloodRequest[];
  ambulances: Ambulance[];
  supplies: SupplyItem[];
  documents: PatientDocument[];
  staff: StaffMember[];
  departments: Department[];
  branches: Branch[];
  auditLog: AuditEntry[];
  settings: HospitalSettings;
  hospitalProfile: HospitalProfile;
  patientAppUserId: string;
}

export const ROLE_ACTOR: Record<UserRole, string> = {
  doctor: 'Dr. Priya Menon',
  nurse: 'Nurse Anjali Thomas',
  lab: 'Vishnu Prasad',
  pharmacy: 'Neethu George',
  admin: 'Rajiv Menon',
  patient: 'Patient App',
};

export const createInitialState = (): HospitalState => ({
  activeRole: 'doctor',
  patients: MD.INITIAL_PATIENTS,
  doctors: MD.INITIAL_DOCTORS,
  appointments: MD.INITIAL_APPOINTMENTS,
  invoices: MD.INITIAL_INVOICES,
  medicines: MD.INITIAL_MEDICINES,
  labTests: MD.INITIAL_LAB_TESTS,
  radiologyScans: MD.INITIAL_RADIOLOGY_SCANS,
  notifications: MD.INITIAL_NOTIFICATIONS,
  selectedPatientId: MD.INITIAL_PATIENTS[0]?.id ?? null,
  cart: [],
  aiChatMessages: [],
  patientChatMessages: [],
  nurseTasks: MD.INITIAL_NURSE_TASKS,
  wardInfo: MD.INITIAL_WARD_INFO,
  labSamples: MD.INITIAL_LAB_SAMPLES,
  prescriptionReviews: MD.INITIAL_PRESCRIPTION_REVIEWS,
  hospitalProtocols: MD.INITIAL_HOSPITAL_PROTOCOLS,
  patientReminders: MD.INITIAL_PATIENT_REMINDERS,
  clinicalProfiles: MD.INITIAL_CLINICAL_PROFILES,
  vitals: MD.INITIAL_VITALS,
  visits: MD.INITIAL_VISITS,
  clinicalNotes: MD.INITIAL_CLINICAL_NOTES,
  radiologyOrders: MD.INITIAL_RADIOLOGY_ORDERS,
  dischargeSummaries: MD.DISCHARGE_SUMMARIES,
  bloodStock: MD.INITIAL_BLOOD_STOCK,
  bloodRequests: MD.INITIAL_BLOOD_REQUESTS,
  ambulances: MD.INITIAL_AMBULANCES,
  supplies: MD.INITIAL_SUPPLIES,
  documents: MD.INITIAL_DOCUMENTS,
  staff: MD.INITIAL_STAFF,
  departments: MD.INITIAL_DEPARTMENTS,
  branches: MD.INITIAL_BRANCHES,
  auditLog: MD.INITIAL_AUDIT_LOG,
  settings: {
    notificationsEnabled: true,
    smsAlerts: true,
    whatsappAlerts: true,
    emailReports: false,
    language: 'English',
    gstPercent: 0,
    paymentModes: { UPI: true, Cash: true, Card: true, 'Net Banking': true },
    receiptFooter: 'Thank you for choosing City Care Multispecialty Hospital',
  },
  hospitalProfile: {
    name: HOSPITAL_CONFIG.name,
    tagline: HOSPITAL_CONFIG.tagline,
    address: HOSPITAL_CONFIG.address,
    phone: HOSPITAL_CONFIG.phone,
    email: HOSPITAL_CONFIG.email,
    website: HOSPITAL_CONFIG.website,
    gstin: HOSPITAL_CONFIG.gstin,
    regNo: HOSPITAL_CONFIG.regNo,
  },
  patientAppUserId: MD.PATIENT_APP_USER_ID,
});

export interface Transition<R> {
  state: HospitalState;
  result: R;
}

// -------------------------------------------------------------
// Small helpers
// -------------------------------------------------------------
let idCounter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(idCounter++).toString(36)}`;

const nowClock = () => formatClock(new Date());
const today = () => todayISO();
const actorOf = (s: HospitalState) =>
  s.activeRole === 'patient' ? s.patients.find((p) => p.id === s.patientAppUserId)?.name ?? 'Patient' : ROLE_ACTOR[s.activeRole];

const withNotification = (
  s: HospitalState,
  n: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'createdAt'>
): HospitalState => ({
  ...s,
  notifications: [
    { ...n, id: newId('notif'), timestamp: 'Just now', read: false, createdAt: Date.now() },
    ...s.notifications,
  ],
});

export const withAudit = (s: HospitalState, action: string, target?: string, actor?: string): HospitalState => ({
  ...s,
  auditLog: [
    { id: newId('aud'), at: Date.now(), actor: actor ?? actorOf(s), role: s.activeRole, action, target },
    ...s.auditLog,
  ].slice(0, 200),
});

const replaceById = <T extends { id: string }>(list: T[], id: string, patch: Partial<T> | ((item: T) => T)): T[] =>
  list.map((item) => (item.id === id ? (typeof patch === 'function' ? patch(item) : { ...item, ...patch }) : item));

export const findPatient = (s: HospitalState, id?: string | null) => (id ? s.patients.find((p) => p.id === id) : undefined);
export const findProfile = (s: HospitalState, patientId: string) => s.clinicalProfiles.find((c) => c.patientId === patientId);

const nextUhid = (patients: Patient[], year: number) => {
  const prefix = `CC${year}`;
  const max = patients.reduce((m, p) => (p.uhid.startsWith(prefix) ? Math.max(m, Number(p.uhid.slice(prefix.length)) || 0) : m), 0);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
};

const nextSampleCode = (samples: LabSample[], year: number) => {
  const prefix = `SMP-${year}-`;
  const max = samples.reduce((m, smp) => (smp.sampleCode.startsWith(prefix) ? Math.max(m, Number(smp.sampleCode.slice(prefix.length)) || 0) : m), 9000);
  return `${prefix}${max + 1}`;
};

const nextRxCode = (reviews: PrescriptionReviewItem[], year: number) => {
  const prefix = `RX-${year}-`;
  const max = reviews.reduce((m, r) => (r.prescriptionCode.startsWith(prefix) ? Math.max(m, Number(r.prescriptionCode.slice(prefix.length)) || 0) : m), 400);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
};

// -------------------------------------------------------------
// Billing
// -------------------------------------------------------------
export interface CreateInvoiceInput {
  type: Invoice['type'];
  patientId: string;
  amount?: number;
  paymentMode: PaymentMode;
  title: string;
  items: InvoiceItem[];
  doctorName?: string;
  status?: Invoice['status'];
  /** Used only when the patient id is unknown (walk-in). */
  patientName?: string;
  uhid?: string;
  insuranceCovered?: number;
}

export const createInvoice = (s: HospitalState, input: CreateInvoiceInput): Transition<Invoice> => {
  const patient = findPatient(s, input.patientId);
  const now = new Date();
  const status = input.status ?? 'Paid';
  const invoice: Invoice = {
    id: newId('inv'),
    invoiceNo: nextInvoiceNumber(s.invoices, input.type, now.getFullYear()),
    title: input.title,
    type: input.type,
    patientId: input.patientId,
    patientName: patient?.name ?? input.patientName ?? 'Walk-in Patient',
    uhid: patient?.uhid ?? input.uhid ?? '—',
    date: formatDisplayDate(now),
    dateISO: today(),
    time: formatClock(now),
    amount: input.amount ?? itemsTotal(input.items),
    paymentMode: input.paymentMode,
    status,
    doctorName: input.doctorName,
    items: input.items,
    paidAt: status === 'Paid' ? formatClock(now) : undefined,
    insuranceCovered: input.insuranceCovered,
  };
  let next: HospitalState = { ...s, invoices: [invoice, ...s.invoices] };
  if (status === 'Paid') {
    next = withNotification(next, {
      title: 'Payment received',
      description: `₹${invoice.amount.toLocaleString('en-IN')} • ${invoice.invoiceNo} via ${invoice.paymentMode}`,
      category: 'Billing',
      route: '/receipt/[id]',
      params: { id: invoice.id },
    });
  }
  next = withAudit(next, `${status === 'Paid' ? 'Collected' : 'Raised'} ${invoice.invoiceNo} ₹${invoice.amount.toLocaleString('en-IN')}`, invoice.patientName);
  return { state: next, result: invoice };
};

export const markInvoicePaid = (s: HospitalState, invoiceId: string, mode: PaymentMode): Transition<Invoice | null> => {
  const inv = s.invoices.find((i) => i.id === invoiceId);
  if (!inv || inv.status === 'Paid') return { state: s, result: inv ?? null };
  const updated: Invoice = { ...inv, status: 'Paid', paymentMode: mode, paidAt: nowClock(), dateISO: today(), date: formatDisplayDate(new Date()) };
  let next: HospitalState = { ...s, invoices: replaceById(s.invoices, invoiceId, updated) };
  next = withNotification(next, {
    title: 'Payment received',
    description: `₹${inv.amount.toLocaleString('en-IN')} • ${inv.invoiceNo} via ${mode}`,
    category: 'Billing',
    route: '/receipt/[id]',
    params: { id: inv.id },
  });
  next = withAudit(next, `Collected pending ${inv.invoiceNo} ₹${inv.amount.toLocaleString('en-IN')} (${mode})`, inv.patientName);
  return { state: next, result: updated };
};

// -------------------------------------------------------------
// Patients
// -------------------------------------------------------------
export interface RegisterPatientInput {
  name: string;
  phone: string;
  /** DD/MM/YYYY */
  dob: string;
  gender: Patient['gender'];
  address: string;
  bloodGroup: string;
  insurance: string;
  email?: string;
  emergencyContact?: string;
  allergies?: string[];
  conditions?: string[];
  paymentMode?: PaymentMode;
}

export const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : phone.trim();
};

export const phoneDigits = (phone: string) => phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');

export const findDuplicatePatients = (s: HospitalState, phone: string, name?: string) => {
  const digits = phoneDigits(phone);
  return s.patients.filter(
    (p) =>
      (digits.length === 10 && phoneDigits(p.phone) === digits) ||
      (!!name && p.name.trim().toLowerCase() === name.trim().toLowerCase())
  );
};

export const registerPatient = (
  s: HospitalState,
  input: RegisterPatientInput
): Transition<{ patient: Patient; invoice: Invoice }> => {
  const dob = parseDob(input.dob);
  const now = new Date();
  const patient: Patient = {
    id: newId('pat'),
    uhid: nextUhid(s.patients, now.getFullYear()),
    name: input.name.trim(),
    age: dob ? ageFromDob(dob) : 0,
    gender: input.gender,
    phone: normalizePhone(input.phone),
    dob: dob ? formatDisplayDate(dob) : input.dob,
    address: input.address.trim(),
    bloodGroup: input.bloodGroup,
    insurance: input.insurance.trim() || 'Self Pay',
    status: 'Active',
    registeredDate: today(),
    email: input.email?.trim() || undefined,
    emergencyContact: input.emergencyContact?.trim() || undefined,
  };
  const profile: ClinicalProfile = {
    patientId: patient.id,
    allergies: input.allergies ?? [],
    conditions: input.conditions ?? [],
    currentMedications: [],
    surgicalHistory: [],
    familyHistory: [],
    lifestyle: '',
    chiefComplaint: 'New registration — no consultation yet.',
    riskFlags: input.allergies?.length ? [`Allergy: ${input.allergies.join(', ')}`] : [],
  };
  let next: HospitalState = {
    ...s,
    patients: [patient, ...s.patients],
    clinicalProfiles: [profile, ...s.clinicalProfiles],
    selectedPatientId: patient.id,
  };
  // The new patient object is passed explicitly — no lookup in stale state.
  const billed = createInvoice(next, {
    type: 'REG',
    patientId: patient.id,
    paymentMode: input.paymentMode ?? 'UPI',
    title: 'Registration Fee',
    items: [{ description: 'Patient Registration & Smart UHID Card', qty: 1, rate: 500, amount: 500 }],
  });
  next = withNotification(billed.state, {
    title: 'New patient registered',
    description: `${patient.name} registered with UHID ${patient.uhid}`,
    category: 'System',
    route: '/patient/[id]',
    params: { id: patient.id },
  });
  next = withAudit(next, 'Registered patient', `${patient.name} (${patient.uhid})`);
  return { state: next, result: { patient, invoice: billed.result } };
};

// -------------------------------------------------------------
// Appointments
// -------------------------------------------------------------
export interface SlotInfo {
  time: string;
  available: boolean;
  reason?: 'booked' | 'past' | 'day-off';
}

export const getAvailableSlots = (s: HospitalState, doctorId: string, dateISO: string): SlotInfo[] => {
  const doctor = s.doctors.find((d) => d.id === doctorId);
  if (!doctor) return [];
  const slots = doctor.slots ?? [];
  const date = fromISODate(dateISO);
  const offDay = date ? !doctor.availableDays.includes(weekdayShort(date)) : false;
  const isToday = dateISO === today();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const taken = new Set(
    s.appointments
      .filter((a) => a.doctorId === doctorId && a.date === dateISO && a.status !== 'Cancelled')
      .map((a) => a.time)
  );
  return slots.map((time) => {
    if (offDay) return { time, available: false, reason: 'day-off' as const };
    if (taken.has(time)) return { time, available: false, reason: 'booked' as const };
    if (isToday && clockToMinutes(time) <= nowMinutes) return { time, available: false, reason: 'past' as const };
    return { time, available: true };
  });
};

export interface ScheduleInput {
  patientId: string;
  doctorId: string;
  /** ISO date */
  date: string;
  time: string;
  type: Appointment['type'];
  department?: string;
  reason?: string;
  paymentMode?: PaymentMode;
  /** Bill the consultation fee now (default true for OPD). */
  bill?: boolean;
}

export type ScheduleResult =
  | { ok: true; appointment: Appointment; invoice?: Invoice }
  | { ok: false; error: 'UNKNOWN_PATIENT' | 'UNKNOWN_DOCTOR' | 'SLOT_TAKEN' | 'PATIENT_BUSY' };

export const scheduleAppointment = (s: HospitalState, input: ScheduleInput): Transition<ScheduleResult> => {
  const patient = findPatient(s, input.patientId);
  const doctor = s.doctors.find((d) => d.id === input.doctorId);
  if (!patient) return { state: s, result: { ok: false, error: 'UNKNOWN_PATIENT' } };
  if (!doctor) return { state: s, result: { ok: false, error: 'UNKNOWN_DOCTOR' } };
  const active = s.appointments.filter((a) => a.date === input.date && a.status !== 'Cancelled');
  if (active.some((a) => a.doctorId === doctor.id && a.time === input.time)) {
    return { state: s, result: { ok: false, error: 'SLOT_TAKEN' } };
  }
  if (active.some((a) => a.patientId === patient.id && a.time === input.time)) {
    return { state: s, result: { ok: false, error: 'PATIENT_BUSY' } };
  }
  // Tokens are never reused, even after a cancellation.
  const tokenNo =
    s.appointments.filter((a) => a.doctorId === doctor.id && a.date === input.date).reduce((m, a) => Math.max(m, a.tokenNo), 0) + 1;
  const appointment: Appointment = {
    id: newId('apt'),
    patientId: patient.id,
    patientName: patient.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    department: input.department || doctor.department,
    type: input.type,
    date: input.date,
    time: input.time,
    status: 'Confirmed',
    tokenNo,
    reason: input.reason,
  };
  let next: HospitalState = { ...s, appointments: [appointment, ...s.appointments] };
  let invoice: Invoice | undefined;
  const shouldBill = input.bill ?? input.type === 'OPD';
  if (shouldBill) {
    const billed = createInvoice(next, {
      type: 'OPD',
      patientId: patient.id,
      paymentMode: input.paymentMode ?? 'UPI',
      title: 'OPD Consultation Fee',
      doctorName: `${doctor.name} (${doctor.department})`,
      items: [{ description: `Specialist Consultation — ${doctor.name}`, qty: 1, rate: doctor.fee, amount: doctor.fee }],
    });
    next = billed.state;
    invoice = billed.result;
  }
  next = withNotification(next, {
    title: input.type === 'Follow Up' ? 'Follow-up scheduled' : 'New appointment booked',
    description: `${patient.name} with ${doctor.name} • ${formatDayMonth(input.date)} ${input.time} • Token ${tokenNo}`,
    category: 'Appointments',
    route: '/appointments',
  });
  next = withAudit(next, `Booked ${input.type} appointment (Token ${tokenNo})`, `${patient.name} → ${doctor.name}`);
  return { state: next, result: { ok: true, appointment, invoice } };
};

export const updateAppointmentStatus = (
  s: HospitalState,
  appointmentId: string,
  status: Appointment['status']
): Transition<Appointment | null> => {
  const apt = s.appointments.find((a) => a.id === appointmentId);
  if (!apt) return { state: s, result: null };
  const updated = { ...apt, status };
  let next: HospitalState = { ...s, appointments: replaceById(s.appointments, appointmentId, updated) };
  next = withAudit(next, `Appointment → ${status}`, `${apt.patientName} • ${apt.time}`);
  return { state: next, result: updated };
};

// -------------------------------------------------------------
// Consultation & prescriptions
// -------------------------------------------------------------
const FREQ_PER_DAY: Array<[RegExp, number]> = [
  [/\bqid\b|four/i, 4],
  [/\btds\b|thrice|three/i, 3],
  [/\bbd\b|twice/i, 2],
  [/weekly/i, 1 / 7],
  [/\bsos\b/i, 0],
  [/\bod\b|\bhs\b|once|night|daily/i, 1],
];

export const quantityFor = (line: Pick<PrescriptionLine, 'frequency' | 'duration'>) => {
  const perDay = FREQ_PER_DAY.find(([re]) => re.test(line.frequency))?.[1] ?? 1;
  const days = Number(/(\d+)\s*day/i.exec(line.duration)?.[1] ?? (/month/i.test(line.duration) ? 30 : 0)) || 10;
  if (perDay === 0) return 6;
  return Math.min(90, Math.max(1, Math.ceil(perDay * days)));
};

export const matchMedicine = (medicines: Medicine[], name: string) => {
  const n = name.toLowerCase().replace(/^inj\.?\s*/, '').trim();
  return (
    medicines.find((m) => n.startsWith(m.name.toLowerCase())) ??
    medicines.find((m) => {
      const [word, strength] = m.name.toLowerCase().split(' ');
      return n.startsWith(word) && (!strength || n.includes(strength));
    })
  );
};

const latestParam = (samples: LabSample[], patientId: string, paramName: string) => {
  for (const smp of resultsForPatient(samples, patientId)) {
    const p = smp.parameters?.find((x) => x.name.toLowerCase().startsWith(paramName.toLowerCase()));
    if (p) return p;
  }
  return undefined;
};

/** Safety context for a patient: allergies, current meds, renal & hepatic markers. */
export const safetyContextFor = (s: HospitalState, patientId: string) => {
  const profile = findProfile(s, patientId);
  const egfr = latestParam(s.labSamples, patientId, 'eGFR')?.value;
  const alt = latestParam(s.labSamples, patientId, 'ALT');
  return {
    allergies: profile?.allergies ?? [],
    currentMedications: profile?.currentMedications ?? [],
    egfr,
    hepaticImpairment: !!alt && parameterFlag(alt) === 'H',
  };
};

export const checkDrugsForPatient = (s: HospitalState, patientId: string, drugs: string[]): SafetyAlert[] =>
  checkPrescriptionSafety(drugs, safetyContextFor(s, patientId));

const safetyStatusFrom = (alerts: SafetyAlert[]): PrescriptionReviewItem['safetyStatus'] => {
  if (alerts.some((a) => a.kind === 'allergy')) return 'Allergy Warning';
  if (alerts.some((a) => a.kind === 'interaction' || a.severity === 'critical')) return 'Interaction Warning';
  return 'Safe';
};

const lineLabel = (l: PrescriptionLine) => `${l.name} (${l.frequency.split(' ')[0]})`;

export interface ConsultationInput {
  patientId: string;
  appointmentId?: string;
  doctorName: string;
  department: string;
  symptoms: string;
  diagnosis: string;
  prescription: PrescriptionLine[];
  advice?: string;
  followUpDate?: string;
  source?: string;
}

export const saveConsultation = (
  s: HospitalState,
  input: ConsultationInput
): Transition<{ visit: Visit; review?: PrescriptionReviewItem; invoice?: Invoice; followUp?: Appointment; alerts: SafetyAlert[] }> => {
  const patient = findPatient(s, input.patientId);
  if (!patient) throw new Error(`Unknown patient ${input.patientId}`);
  const visit: Visit = {
    id: newId('visit'),
    patientId: patient.id,
    date: today(),
    type: 'OPD',
    department: input.department,
    doctorName: input.doctorName,
    symptoms: input.symptoms.trim(),
    diagnosis: input.diagnosis.trim(),
    prescription: input.prescription,
    advice: input.advice,
    followUpDate: input.followUpDate,
    source: input.source,
  };
  let next: HospitalState = { ...s, visits: [visit, ...s.visits] };

  // Profile: this visit's complaint + prescribed drugs become current meds.
  const profile = findProfile(next, patient.id);
  const newMeds = input.prescription.map((l) => `${l.name} ${l.frequency.split(' ')[0]}`);
  if (profile) {
    next = {
      ...next,
      clinicalProfiles: next.clinicalProfiles.map((c) =>
        c.patientId === patient.id
          ? { ...c, chiefComplaint: visit.symptoms || c.chiefComplaint, currentMedications: Array.from(new Set([...newMeds, ...c.currentMedications])).slice(0, 8) }
          : c
      ),
    };
  }

  // Close the appointment this consultation belongs to.
  const apt =
    (input.appointmentId && next.appointments.find((a) => a.id === input.appointmentId)) ||
    next.appointments.find((a) => a.patientId === patient.id && a.date === today() && a.status !== 'Completed' && a.status !== 'Cancelled');
  if (apt) {
    next = { ...next, appointments: replaceById(next.appointments, apt.id, { status: 'Completed' }) };
  }

  // Walk-ins (no appointment) get a consultation bill to collect at the counter.
  let invoice: Invoice | undefined;
  if (!apt) {
    const doctor = next.doctors.find((d) => d.name === input.doctorName);
    const fee = doctor?.fee ?? 500;
    const billed = createInvoice(next, {
      type: 'OPD',
      patientId: patient.id,
      status: 'Pending',
      paymentMode: 'Cash',
      title: 'OPD Consultation Fee',
      doctorName: `${input.doctorName} (${input.department})`,
      items: [{ description: `Walk-in Consultation — ${input.doctorName}`, qty: 1, rate: fee, amount: fee }],
    });
    next = billed.state;
    invoice = billed.result;
  }

  // Prescription → pharmacy review queue (with safety screening).
  let review: PrescriptionReviewItem | undefined;
  const drugNames = input.prescription.map((l) => `${l.name} (${l.frequency.split(' ')[0]})`);
  const alerts = input.prescription.length ? checkDrugsForPatient(next, patient.id, drugNames) : [];
  if (input.prescription.length) {
    const status = safetyStatusFrom(alerts);
    const interaction = alerts.find((a) => a.kind === 'interaction');
    const allergy = alerts.find((a) => a.kind === 'allergy');
    review = {
      id: newId('rx'),
      prescriptionCode: nextRxCode(next.prescriptionReviews, new Date().getFullYear()),
      patientId: patient.id,
      patientName: patient.name,
      uhid: patient.uhid,
      age: patient.age,
      gender: patient.gender,
      doctorName: input.doctorName,
      drugs: input.prescription.map(lineLabel),
      safetyStatus: status,
      interactionAlert: interaction ? `${interaction.detail}` : undefined,
      allergyAlert: allergy ? allergy.detail : undefined,
      dosageValidation:
        alerts.filter((a) => a.kind === 'renal' || a.kind === 'hepatic').map((a) => a.detail).join(' ') ||
        'Doses within standard adult range.',
      alternativeSuggestion: (allergy ?? interaction)?.suggestion,
      status: 'Pending Review',
      items: input.prescription.map((l) => {
        const med = matchMedicine(next.medicines, l.name);
        return { medicineId: med?.id, name: med?.name ?? l.name, qty: quantityFor(l) };
      }),
      source: 'OPD Consultation',
    };
    next = { ...next, prescriptionReviews: [review, ...next.prescriptionReviews] };
    next = withNotification(next, {
      title: status === 'Safe' ? 'Prescription sent to pharmacy' : `Prescription flagged: ${status}`,
      description: `${review.prescriptionCode} • ${patient.name} • ${review.drugs.length} item${review.drugs.length > 1 ? 's' : ''}`,
      category: 'System',
      route: '/pharmacy-review',
    });
  }

  // Follow-up booking (no charge).
  let followUp: Appointment | undefined;
  if (input.followUpDate) {
    const doctor = next.doctors.find((d) => d.name === input.doctorName) ?? next.doctors[0];
    // First date on/after the requested day where the doctor has an open slot (skips days off).
    let date = input.followUpDate;
    let slot: string | undefined;
    for (let i = 0; i < 14 && !slot; i++) {
      const candidate = toISODateLocal(addDays(fromISODate(input.followUpDate) ?? startOfToday(), i));
      const free = getAvailableSlots(next, doctor.id, candidate).find((x) => x.available);
      if (free) {
        date = candidate;
        slot = free.time;
      }
    }
    const scheduled = scheduleAppointment(next, {
      patientId: patient.id,
      doctorId: doctor.id,
      date,
      time: slot ?? doctor.slots?.[0] ?? '10:00 AM',
      type: 'Follow Up',
      reason: `Follow-up: ${visit.diagnosis}`,
      bill: false,
    });
    next = scheduled.state;
    if (scheduled.result.ok) followUp = scheduled.result.appointment;
  }

  next = withAudit(next, 'Saved OPD consultation', `${patient.name} • ${visit.diagnosis || 'No diagnosis'}`);
  return { state: next, result: { visit, review, invoice, followUp, alerts } };
};

// -------------------------------------------------------------
// Vitals & nursing
// -------------------------------------------------------------
export interface VitalsInput {
  bp: string;
  pulse: number;
  spo2: number;
  temp: number;
  respRate?: number;
  sugar?: number;
}

export const recordVitals = (
  s: HospitalState,
  patientId: string,
  input: VitalsInput,
  recordedBy?: string
): Transition<{ record: VitalsRecord; flags: ReturnType<typeof vitalsFlags> }> => {
  const patient = findPatient(s, patientId);
  if (!patient) throw new Error(`Unknown patient ${patientId}`);
  const record: VitalsRecord = {
    id: newId('vit'),
    patientId,
    date: today(),
    time: nowClock(),
    ...input,
    recordedBy: recordedBy ?? actorOf(s),
  };
  const flags = vitalsFlags(record);
  let next: HospitalState = {
    ...s,
    vitals: [record, ...s.vitals],
    // Recording vitals completes that patient's open vitals task.
    nurseTasks: s.nurseTasks.map((t) =>
      t.patientId === patientId && t.category === 'Vitals' && !t.completed ? { ...t, completed: true, completedAt: record.time } : t
    ),
  };
  if (flags.length) {
    next = withNotification(next, {
      title: `Abnormal vitals: ${patient.name}`,
      description: flags.map((f) => f.label).join(' • '),
      category: 'System',
      route: '/doctor-copilot',
      params: { patientId },
    });
  }
  next = withAudit(next, 'Recorded vitals', `${patient.name} • BP ${record.bp}, SpO₂ ${record.spo2}%`, record.recordedBy);
  return { state: next, result: { record, flags } };
};

export const toggleNurseTask = (s: HospitalState, taskId: string): Transition<NurseTask | null> => {
  const task = s.nurseTasks.find((t) => t.id === taskId);
  if (!task) return { state: s, result: null };
  const updated = { ...task, completed: !task.completed, completedAt: !task.completed ? nowClock() : undefined };
  let next: HospitalState = { ...s, nurseTasks: replaceById(s.nurseTasks, taskId, updated) };
  next = withAudit(next, updated.completed ? 'Completed nursing task' : 'Reopened nursing task', `${task.title} • ${task.patientName}`);
  return { state: next, result: updated };
};

// -------------------------------------------------------------
// Admission, beds & discharge
// -------------------------------------------------------------
export type RoomType = 'General Ward' | 'ICU' | 'Private';

export const wardForRoomType = (wards: WardInfo[], roomType: RoomType, gender: Patient['gender']) => {
  if (roomType === 'ICU') return wards.find((w) => w.type === 'ICU');
  if (roomType === 'Private') return wards.find((w) => w.type === 'Deluxe');
  return wards.find((w) => w.id === (gender === 'Male' ? 'ward-gen-a' : 'ward-gen-b')) ?? wards.find((w) => w.type === 'General');
};

export const bedLabel = (ward: WardInfo, n: number) => {
  if (ward.type === 'ICU') return `ICU • Bed ${n}`;
  if (ward.type === 'Deluxe') return `Deluxe Suite ${100 + n}`;
  return `${ward.id === 'ward-gen-a' ? 'Ward A' : 'Ward B'} • Bed ${n}`;
};

/** Bed number encoded in a room label ("Ward A • Bed 14" → 14, "Deluxe Suite 104" → 4). */
export const bedNumberFromRoom = (room?: string): number | null => {
  if (!room) return null;
  const suite = /Suite\s+(\d+)/i.exec(room);
  if (suite) return Number(suite[1]) - 100;
  const bed = /Bed\s+(\d+)/i.exec(room);
  return bed ? Number(bed[1]) : null;
};

/**
 * Bed map for a ward: named in-patients sit on the bed in their room label;
 * the remaining (not individually modelled) occupied beds fill the lowest free
 * numbers. Everything else is free.
 */
export const wardBedMap = (s: HospitalState, ward: WardInfo) => {
  const named = new Map<number, Patient>();
  s.patients
    .filter((p) => p.status === 'Admitted' && p.wardId === ward.id)
    .forEach((p) => {
      const n = bedNumberFromRoom(p.room);
      if (n && n >= 1 && n <= ward.totalBeds) named.set(n, p);
    });
  let anonymous = Math.max(0, ward.occupied - named.size);
  const occupied = new Set<number>(named.keys());
  for (let n = 1; n <= ward.totalBeds && anonymous > 0; n++) {
    if (!occupied.has(n)) {
      occupied.add(n);
      anonymous -= 1;
    }
  }
  const free: number[] = [];
  for (let n = 1; n <= ward.totalBeds; n++) if (!occupied.has(n)) free.push(n);
  return { named, occupied, free };
};

export interface AdmitInput {
  patientId: string;
  roomType: RoomType;
  /** Reserve a specific ward/bed (from the bed map); defaults to the first free bed. */
  wardId?: string;
  bedNo?: number;
  department: string;
  admissionType?: 'New Admission' | 'Re-admission';
  expectedDate?: string;
  notes?: string;
  doctorName?: string;
  paymentMode?: PaymentMode;
}

export type AdmitResult =
  | { ok: true; patient: Patient; invoice: Invoice; ward: WardInfo }
  | { ok: false; error: 'UNKNOWN_PATIENT' | 'ALREADY_ADMITTED' | 'NO_BED' | 'BED_TAKEN' };

export const admitPatient = (s: HospitalState, input: AdmitInput): Transition<AdmitResult> => {
  const patient = findPatient(s, input.patientId);
  if (!patient) return { state: s, result: { ok: false, error: 'UNKNOWN_PATIENT' } };
  if (patient.status === 'Admitted') return { state: s, result: { ok: false, error: 'ALREADY_ADMITTED' } };
  const ward = (input.wardId && s.wardInfo.find((w) => w.id === input.wardId)) || wardForRoomType(s.wardInfo, input.roomType, patient.gender);
  if (!ward || ward.available <= 0) return { state: s, result: { ok: false, error: 'NO_BED' } };
  const { free } = wardBedMap(s, ward);
  if (input.bedNo !== undefined && !free.includes(input.bedNo)) return { state: s, result: { ok: false, error: 'BED_TAKEN' } };
  const bedNo = input.bedNo ?? free[0];
  if (!bedNo) return { state: s, result: { ok: false, error: 'NO_BED' } };

  const room = bedLabel(ward, bedNo);
  const updatedWard: WardInfo = { ...ward, occupied: ward.occupied + 1, available: ward.available - 1 };
  const doctorName =
    input.doctorName ?? s.doctors.find((d) => d.department === input.department)?.name ?? 'Dr. Priya Menon';
  const updatedPatient: Patient = {
    ...patient,
    status: 'Admitted',
    room,
    wardId: ward.id,
    admittedOn: today(),
    dischargedOn: undefined,
    department: input.department,
    attendingDoctor: doctorName,
  };
  let next: HospitalState = {
    ...s,
    patients: replaceById(s.patients, patient.id, updatedPatient),
    wardInfo: replaceById(s.wardInfo, ward.id, updatedWard),
    visits: [
      {
        id: newId('visit'),
        patientId: patient.id,
        date: today(),
        type: 'IPD',
        department: input.department,
        doctorName,
        symptoms: input.notes?.trim() || 'Admitted for in-patient care.',
        diagnosis: `${input.admissionType ?? 'New Admission'} — ${input.department}`,
        prescription: [],
      },
      ...s.visits,
    ],
    nurseTasks: [
      {
        id: newId('nt'),
        title: `Admission Vitals - ${room}`,
        category: 'Vitals',
        ward: room,
        patientName: patient.name,
        uhid: patient.uhid,
        patientId: patient.id,
        timeDue: formatClock(new Date(Date.now() + 30 * 60000)),
        completed: false,
        priority: input.roomType === 'ICU' ? 'High' : 'Medium',
        notes: 'Baseline BP, pulse, SpO₂, temperature; orient patient to ward.',
      },
      ...s.nurseTasks,
    ],
  };
  const rate = ward.dailyRate ?? 1600;
  const billed = createInvoice(next, {
    type: 'IPD',
    patientId: patient.id,
    paymentMode: input.paymentMode ?? 'Card',
    title: 'IPD Admission Advance',
    doctorName: `${doctorName} (${input.department})`,
    items: [
      { description: `${ward.name} — advance (1 day)`, qty: 1, rate, amount: rate },
      { description: 'Admission, Nursing & Sanitization', qty: 1, rate: 1000, amount: 1000 },
    ],
  });
  next = withNotification(billed.state, {
    title: 'Patient admitted',
    description: `${patient.name} admitted to ${room} (${input.department})`,
    category: 'Appointments',
    route: '/patient/[id]',
    params: { id: patient.id },
  });
  next = withAudit(next, `Admitted to ${room}`, patient.name);
  return { state: next, result: { ok: true, patient: updatedPatient, invoice: billed.result, ward: updatedWard } };
};

/** Discharge summary for a patient — stored draft/final, or generated from the record. */
export const buildDischargeSummary = (s: HospitalState, patientId: string): DischargeSummary | null => {
  const stored = s.dischargeSummaries.find((d) => d.patientId === patientId);
  if (stored) return stored;
  const patient = findPatient(s, patientId);
  if (!patient || (!patient.admittedOn && patient.status !== 'Admitted')) return null;
  const profile = findProfile(s, patientId);
  const ipd = s.visits
    .filter((v) => v.patientId === patientId && (v.type === 'IPD' || v.type === 'Emergency'))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const admittedOn = patient.admittedOn ?? today();
  const stay = Math.max(1, -daysFromToday(admittedOn));
  const bills = s.invoices.filter((i) => i.patientId === patientId && (i.type === 'IPD' || i.type === 'Surgery' || i.type === 'Lab' || i.type === 'Radiology' || i.type === 'Pharmacy'));
  const total = bills.reduce((sum, i) => sum + Math.max(0, i.amount), 0) + bills.reduce((sum, i) => sum + (i.insuranceCovered ?? 0), 0);
  const insurance = bills.reduce((sum, i) => sum + (i.insuranceCovered ?? 0), 0);
  const paid = bills.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + Math.max(0, i.amount), 0);
  const meds = (profile?.currentMedications ?? []).slice(0, 4);
  return {
    patientId,
    patientName: patient.name,
    uhid: patient.uhid,
    admissionDate: formatDisplayDate(admittedOn),
    dischargeDate: formatDisplayDate(patient.dischargedOn ?? today()),
    room: patient.room ?? '—',
    stayDuration: `${stay} day${stay > 1 ? 's' : ''}`,
    doctorName: patient.attendingDoctor ?? 'Dr. Priya Menon',
    department: patient.department ?? 'General Medicine',
    diagnosis: ipd[0]?.diagnosis ?? profile?.conditions[0] ?? 'Under evaluation',
    treatmentGiven: meds.length ? meds.join(', ') : 'Supportive care as per ward protocol.',
    advice: [
      'Continue discharge medications as prescribed',
      'Report to emergency for fever, breathlessness or chest pain',
      `Follow up review in OPD on ${formatDisplayDate(addDays(startOfToday(), 7))}`,
    ],
    prescriptions: meds.map((m) => ({ name: m.replace(/\s*\(.*\)|\s+(OD|BD|TDS|SOS|HS)$/i, ''), dosage: m.match(/(OD|BD|TDS|SOS|HS|Night)/i)?.[0] ?? 'As directed', duration: '7 days' })),
    totalAmount: total,
    insuranceApproved: insurance,
    patientPaid: paid,
    status: 'Draft',
  };
};

export type DischargeResult =
  | { ok: true; patient: Patient; summary: DischargeSummary; outstanding: number }
  | { ok: false; error: 'UNKNOWN_PATIENT' | 'NOT_ADMITTED' };

export const dischargePatient = (s: HospitalState, patientId: string): Transition<DischargeResult> => {
  const patient = findPatient(s, patientId);
  if (!patient) return { state: s, result: { ok: false, error: 'UNKNOWN_PATIENT' } };
  if (patient.status !== 'Admitted') return { state: s, result: { ok: false, error: 'NOT_ADMITTED' } };
  const summary: DischargeSummary = {
    ...(buildDischargeSummary(s, patientId) as DischargeSummary),
    dischargeDate: formatDisplayDate(new Date()),
    status: 'Final',
  };
  const ward = s.wardInfo.find((w) => w.id === patient.wardId);
  const updatedPatient: Patient = { ...patient, status: 'Discharged', dischargedOn: today(), room: undefined, wardId: undefined };
  let next: HospitalState = {
    ...s,
    patients: replaceById(s.patients, patientId, updatedPatient),
    wardInfo: ward ? replaceById(s.wardInfo, ward.id, { occupied: Math.max(0, ward.occupied - 1), available: ward.available + 1 }) : s.wardInfo,
    dischargeSummaries: [summary, ...s.dischargeSummaries.filter((d) => d.patientId !== patientId)],
    nurseTasks: s.nurseTasks.map((t) => (t.patientId === patientId && t.category === 'Discharge' && !t.completed ? { ...t, completed: true, completedAt: nowClock() } : t)),
    documents: [
      {
        id: newId('doc'),
        patientId,
        patientName: patient.name,
        title: 'Discharge Summary',
        type: 'Discharge',
        date: today(),
        size: '300 KB',
        uploadedBy: summary.doctorName,
      },
      ...s.documents,
    ],
  };
  next = withNotification(next, {
    title: 'Patient discharged',
    description: `${patient.name} discharged from ${patient.room ?? 'ward'} • bed released`,
    category: 'Appointments',
    route: '/discharge-summary',
    params: { patientId },
  });
  next = withAudit(next, 'Discharged patient', `${patient.name} (${patient.room ?? '—'})`);
  return { state: next, result: { ok: true, patient: updatedPatient, summary, outstanding: outstandingForPatient(next.invoices, patientId) } };
};

// -------------------------------------------------------------
// Pharmacy counter cart
// -------------------------------------------------------------
export type CartError = 'OUT_OF_STOCK' | 'EXPIRED' | 'UNKNOWN_ITEM';

export const cartQtyFor = (s: HospitalState, itemId: string) => s.cart.find((c) => c.id === itemId)?.qty ?? 0;

export const addToCart = (
  s: HospitalState,
  item: { id: string; type: CartItem['type']; name: string; price: number }
): Transition<{ ok: boolean; error?: CartError }> => {
  if (item.type === 'medicine') {
    const med = s.medicines.find((m) => m.id === item.id);
    if (!med) return { state: s, result: { ok: false, error: 'UNKNOWN_ITEM' } };
    if (monthsUntilExpiry(med.expiry) < 0) return { state: s, result: { ok: false, error: 'EXPIRED' } };
    if (cartQtyFor(s, item.id) >= med.stock) return { state: s, result: { ok: false, error: 'OUT_OF_STOCK' } };
  }
  const existing = s.cart.find((c) => c.id === item.id);
  const cart = existing
    ? s.cart.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
    : [...s.cart, { ...item, qty: 1 }];
  return { state: { ...s, cart }, result: { ok: true } };
};

export const decrementCartItem = (s: HospitalState, itemId: string): HospitalState => {
  const item = s.cart.find((c) => c.id === itemId);
  if (!item) return s;
  return {
    ...s,
    cart: item.qty > 1 ? s.cart.map((c) => (c.id === itemId ? { ...c, qty: c.qty - 1 } : c)) : s.cart.filter((c) => c.id !== itemId),
  };
};

export const removeFromCart = (s: HospitalState, itemId: string): HospitalState => ({
  ...s,
  cart: s.cart.filter((c) => c.id !== itemId),
});

export const checkoutPharmacyCart = (
  s: HospitalState,
  patientId: string,
  paymentMode: PaymentMode,
  status: Invoice['status'] = 'Paid'
): Transition<Invoice | null> => {
  const lines = s.cart.filter((c) => c.type === 'medicine');
  if (!lines.length) return { state: s, result: null };
  const billed = createInvoice(s, {
    type: 'Pharmacy',
    patientId,
    paymentMode,
    status,
    title: 'Pharmacy Bill',
    items: lines.map((c) => ({ description: c.name, qty: c.qty, rate: c.price, amount: Math.round(c.price * c.qty * 100) / 100 })),
  });
  let next: HospitalState = {
    ...billed.state,
    medicines: billed.state.medicines.map((m) => {
      const line = lines.find((c) => c.id === m.id);
      return line ? { ...m, stock: Math.max(0, m.stock - line.qty) } : m;
    }),
    cart: billed.state.cart.filter((c) => c.type !== 'medicine'),
  };
  next = withAudit(next, `Dispensed ${lines.reduce((n, c) => n + c.qty, 0)} units at counter`, billed.result.patientName);
  return { state: next, result: billed.result };
};

// -------------------------------------------------------------
// Lab orders & results
// -------------------------------------------------------------
export interface OrderOptions {
  paymentMode: PaymentMode;
  orderedBy?: string;
  status?: Invoice['status'];
}

export const orderLabTests = (
  s: HospitalState,
  patientId: string,
  testIds: string[],
  opts: OrderOptions
): Transition<{ invoice: Invoice; samples: LabSample[] } | null> => {
  const patient = findPatient(s, patientId);
  const tests = testIds.map((id) => s.labTests.find((t) => t.id === id)).filter(Boolean) as LabTest[];
  if (!patient || !tests.length) return { state: s, result: null };
  const year = new Date().getFullYear();
  let samples: LabSample[] = [];
  let code = nextSampleCode(s.labSamples, year);
  tests.forEach((t) => {
    samples.push({
      id: newId('smp'),
      sampleCode: code,
      patientId,
      patientName: patient.name,
      uhid: patient.uhid,
      testName: t.name,
      category: t.category,
      date: today(),
      collectedAt: '—',
      status: 'New',
      turnaroundTime: `Awaiting collection • TAT ${t.turnaroundTime}`,
      orderedBy: opts.orderedBy ?? ROLE_ACTOR.doctor,
    });
    const n = Number(code.split('-')[2]) + 1;
    code = `SMP-${year}-${n}`;
  });
  const billed = createInvoice({ ...s, labSamples: [...samples, ...s.labSamples] }, {
    type: 'Lab',
    patientId,
    paymentMode: opts.paymentMode,
    status: opts.status,
    title: 'Laboratory Bill',
    items: tests.map((t) => ({ description: t.name, qty: 1, rate: t.price, amount: t.price })),
  });
  let next = withNotification(billed.state, {
    title: 'New lab order',
    description: `${patient.name} • ${tests.map((t) => t.name.split('(')[0].trim()).join(', ')}`,
    category: 'System',
    route: '/lab-portal',
  });
  next = withAudit(next, `Ordered ${tests.length} lab test${tests.length > 1 ? 's' : ''}`, patient.name);
  return { state: next, result: { invoice: billed.result, samples } };
};

/** Reference templates the mock "analyzer" fills in. */
const ANALYZER_TEMPLATES: Array<{ match: RegExp; params: LabParameter[] }> = [
  { match: /cbc|blood count/i, params: [
    { name: 'Hemoglobin', value: 13.4, unit: 'g/dL', low: 12, high: 16 },
    { name: 'TLC', value: 8200, unit: '/mcL', low: 4000, high: 11000 },
    { name: 'Platelets', value: 265000, unit: '/mcL', low: 150000, high: 450000 },
  ] },
  { match: /lft|liver/i, params: [
    { name: 'ALT (SGPT)', value: 32, unit: 'U/L', high: 45 },
    { name: 'AST (SGOT)', value: 28, unit: 'U/L', high: 40 },
    { name: 'Total Bilirubin', value: 0.8, unit: 'mg/dL', high: 1.2 },
  ] },
  { match: /kft|kidney/i, params: [
    { name: 'Creatinine', value: 0.9, unit: 'mg/dL', low: 0.6, high: 1.2 },
    { name: 'eGFR', value: 96, unit: 'mL/min', low: 90 },
    { name: 'Urea', value: 26, unit: 'mg/dL', low: 15, high: 40 },
  ] },
  { match: /lipid/i, params: [
    { name: 'Total Cholesterol', value: 214, unit: 'mg/dL', high: 200 },
    { name: 'LDL', value: 138, unit: 'mg/dL', high: 100 },
    { name: 'HDL', value: 41, unit: 'mg/dL', low: 40 },
  ] },
  { match: /hba1c/i, params: [{ name: 'HbA1c', value: 6.1, unit: '%', high: 5.7 }] },
  { match: /thyroid/i, params: [
    { name: 'TSH', value: 2.4, unit: 'mIU/L', low: 0.4, high: 4.5 },
    { name: 'Free T4', value: 1.2, unit: 'ng/dL', low: 0.8, high: 1.8 },
  ] },
  { match: /troponin/i, params: [{ name: 'Troponin I', value: 1.9, unit: 'ng/mL', high: 0.04 }] },
  { match: /dengue/i, params: [{ name: 'NS1 Antigen Index', value: 0.4, unit: 'index', high: 1 }] },
  { match: /urine/i, params: [
    { name: 'Pus cells', value: 2, unit: '/hpf', high: 5 },
    { name: 'RBC', value: 0, unit: '/hpf', high: 2 },
  ] },
];

/** Plausible analyzer output for a test (used by "Fetch from analyzer"). */
export const analyzerResultsFor = (testName: string): LabParameter[] =>
  (ANALYZER_TEMPLATES.find((t) => t.match.test(testName))?.params ?? [{ name: 'Result', value: 1, unit: '', high: 2 }]).map((p) => ({ ...p }));

export const receiveSample = (s: HospitalState, sampleId: string): Transition<LabSample | null> => {
  const smp = s.labSamples.find((x) => x.id === sampleId);
  if (!smp || smp.status !== 'New') return { state: s, result: smp ?? null };
  const updated: LabSample = { ...smp, status: 'Processing', collectedAt: nowClock(), turnaroundTime: 'In analyzer' };
  let next: HospitalState = { ...s, labSamples: replaceById(s.labSamples, sampleId, updated) };
  next = withAudit(next, 'Received sample', `${smp.sampleCode} • ${smp.patientName}`);
  return { state: next, result: updated };
};

export const enterLabResults = (s: HospitalState, sampleId: string, params: LabParameter[]): Transition<LabSample | null> => {
  const smp = s.labSamples.find((x) => x.id === sampleId);
  if (!smp) return { state: s, result: null };
  const abnormal = isAbnormal(params);
  const flagged = params.filter((p) => parameterFlag(p));
  const updated: LabSample = {
    ...smp,
    status: abnormal ? 'Abnormal' : 'Completed',
    parameters: params,
    resultValue: resultSummary(params),
    normalRange: params.map((p) => `${p.name}: ${typeof p.low === 'number' ? p.low : ''}${typeof p.low === 'number' && typeof p.high === 'number' ? '-' : typeof p.high === 'number' ? '<' : '>'}${typeof p.high === 'number' ? p.high : ''}`).join(' • '),
    flag: abnormal ? `${flagged.map((p) => `${p.name} ${parameterFlag(p) === 'H' ? 'high' : 'low'}`).join(', ')} • Clinical correlation required` : undefined,
    turnaroundTime: 'Ready',
    collectedAt: smp.collectedAt === '—' ? nowClock() : smp.collectedAt,
  };
  let next: HospitalState = { ...s, labSamples: replaceById(s.labSamples, sampleId, updated) };
  next = withNotification(next, {
    title: abnormal ? 'Critical lab value' : 'Lab report ready',
    description: `${smp.patientName} • ${smp.testName.split('(')[0].trim()}${abnormal ? ` • ${flagged.map((p) => p.name).join(', ')} out of range` : ''}`,
    category: 'System',
    route: '/doctor-copilot',
    params: { patientId: smp.patientId ?? '', tab: 'Reports' },
  });
  next = withAudit(next, abnormal ? 'Signed abnormal result' : 'Signed result', `${smp.sampleCode} • ${smp.patientName}`);
  return { state: next, result: updated };
};

/** Legacy status update — completing without results fills them from the analyzer. */
export const updateLabSampleStatus = (s: HospitalState, sampleId: string, status: LabSample['status']): Transition<LabSample | null> => {
  const smp = s.labSamples.find((x) => x.id === sampleId);
  if (!smp) return { state: s, result: null };
  if (status === 'Processing') return receiveSample(s, sampleId);
  if ((status === 'Completed' || status === 'Abnormal') && !smp.parameters?.length) {
    return enterLabResults(s, sampleId, analyzerResultsFor(smp.testName));
  }
  const updated = { ...smp, status };
  return { state: { ...s, labSamples: replaceById(s.labSamples, sampleId, updated) }, result: updated };
};

// -------------------------------------------------------------
// Radiology orders
// -------------------------------------------------------------
export const orderRadiologyScans = (
  s: HospitalState,
  patientId: string,
  scanIds: string[],
  opts: OrderOptions & { date?: string; time?: string }
): Transition<{ invoice: Invoice; orders: RadiologyOrder[] } | null> => {
  const patient = findPatient(s, patientId);
  const scans = scanIds.map((id) => s.radiologyScans.find((x) => x.id === id)).filter(Boolean) as RadiologyScan[];
  if (!patient || !scans.length) return { state: s, result: null };
  const orders: RadiologyOrder[] = scans.map((scan, i) => ({
    id: newId('ro'),
    patientId,
    patientName: patient.name,
    scanName: scan.name,
    category: scan.category,
    date: opts.date ?? today(),
    time: opts.time ?? formatClock(new Date(Date.now() + (45 + i * 30) * 60000)),
    status: 'Scheduled',
    orderedBy: opts.orderedBy ?? ROLE_ACTOR.doctor,
  }));
  const billed = createInvoice({ ...s, radiologyOrders: [...orders, ...s.radiologyOrders] }, {
    type: 'Radiology',
    patientId,
    paymentMode: opts.paymentMode,
    status: opts.status,
    title: 'Radiology Bill',
    items: scans.map((scan) => ({ description: scan.name, qty: 1, rate: scan.price, amount: scan.price })),
  });
  let next = withNotification(billed.state, {
    title: 'Scan scheduled',
    description: `${patient.name} • ${scans.map((x) => x.name).join(', ')} • ${orders[0].time}`,
    category: 'Appointments',
    route: '/radiology',
    params: { view: 'schedule' },
  });
  next = withAudit(next, `Scheduled ${scans.length} scan${scans.length > 1 ? 's' : ''}`, patient.name);
  return { state: next, result: { invoice: billed.result, orders } };
};

// -------------------------------------------------------------
// Pharmacy review & dispensing
// -------------------------------------------------------------
export type DispenseResult =
  | { ok: true; review: PrescriptionReviewItem; invoice: Invoice | null; unavailable: string[] }
  | { ok: false; error: 'NOT_FOUND' | 'NEEDS_OVERRIDE' | 'ALREADY_DISPENSED' | 'OUT_OF_STOCK'; shortages?: string[] };

export const dispensePrescription = (
  s: HospitalState,
  reviewId: string,
  opts: { override?: { reason: string; by: string }; paymentMode?: PaymentMode } = {}
): Transition<DispenseResult> => {
  const rx = s.prescriptionReviews.find((r) => r.id === reviewId);
  if (!rx) return { state: s, result: { ok: false, error: 'NOT_FOUND' } };
  if (rx.status === 'Dispensed') return { state: s, result: { ok: false, error: 'ALREADY_DISPENSED' } };
  if (rx.safetyStatus !== 'Safe' && !opts.override) return { state: s, result: { ok: false, error: 'NEEDS_OVERRIDE' } };

  const items = rx.items ?? [];
  const shortages = items
    .filter((it) => it.medicineId)
    .filter((it) => (s.medicines.find((m) => m.id === it.medicineId)?.stock ?? 0) < it.qty)
    .map((it) => it.name);
  if (shortages.length) return { state: s, result: { ok: false, error: 'OUT_OF_STOCK', shortages } };

  const stocked = items.filter((it) => it.medicineId);
  const unavailable = items.filter((it) => !it.medicineId).map((it) => it.name);
  const updatedRx: PrescriptionReviewItem = {
    ...rx,
    status: 'Dispensed',
    dosageValidation: opts.override
      ? `${rx.dosageValidation} • Override by ${opts.override.by}: ${opts.override.reason}`
      : rx.dosageValidation,
  };
  let next: HospitalState = {
    ...s,
    prescriptionReviews: replaceById(s.prescriptionReviews, reviewId, updatedRx),
    medicines: s.medicines.map((m) => {
      const line = stocked.find((it) => it.medicineId === m.id);
      return line ? { ...m, stock: Math.max(0, m.stock - line.qty) } : m;
    }),
  };
  let invoice: Invoice | null = null;
  if (stocked.length && rx.patientId) {
    const billed = createInvoice(next, {
      type: 'Pharmacy',
      patientId: rx.patientId,
      paymentMode: opts.paymentMode ?? 'UPI',
      title: 'Pharmacy Bill',
      doctorName: rx.doctorName,
      items: stocked.map((it) => {
        const med = s.medicines.find((m) => m.id === it.medicineId)!;
        return { description: med.name, qty: it.qty, rate: med.price, amount: Math.round(med.price * it.qty * 100) / 100 };
      }),
    });
    next = billed.state;
    invoice = billed.result;
  }
  // Medication reminders for the patient app.
  if (rx.patientId) {
    const times = ['08:00 AM', '02:00 PM', '09:00 PM'];
    const reminders: PatientReminder[] = rx.drugs.slice(0, 3).map((drug, i) => ({
      id: newId('rem'),
      patientId: rx.patientId,
      medicineName: drug.split('(')[0].trim(),
      dosage: '1 Tablet',
      time: times[i % times.length],
      taken: false,
      instructions: `As prescribed by ${rx.doctorName} (${rx.prescriptionCode})`,
    }));
    next = { ...next, patientReminders: [...next.patientReminders.filter((r) => r.patientId !== rx.patientId || r.taken), ...reminders] };
  }
  next = withNotification(next, {
    title: 'Prescription dispensed',
    description: `${rx.prescriptionCode} • ${rx.patientName}${opts.override ? ' • pharmacist override recorded' : ''}`,
    category: 'System',
    route: '/pharmacy-review',
  });
  next = withAudit(next, opts.override ? `Dispensed with override (${opts.override.reason})` : 'Dispensed prescription', `${rx.prescriptionCode} • ${rx.patientName}`);
  return { state: next, result: { ok: true, review: updatedRx, invoice, unavailable } };
};

export const requestClarification = (s: HospitalState, reviewId: string, note: string): Transition<PrescriptionReviewItem | null> => {
  const rx = s.prescriptionReviews.find((r) => r.id === reviewId);
  if (!rx) return { state: s, result: null };
  const updated: PrescriptionReviewItem = { ...rx, status: 'Doctor Clarification', clarificationNote: note.trim() };
  let next: HospitalState = { ...s, prescriptionReviews: replaceById(s.prescriptionReviews, reviewId, updated) };
  next = withNotification(next, {
    title: `Clarification requested: ${rx.prescriptionCode}`,
    description: `${rx.patientName} • ${note}`,
    category: 'System',
    route: '/pharmacy-review',
  });
  next = withAudit(next, 'Requested doctor clarification', `${rx.prescriptionCode} • ${note}`);
  return { state: next, result: updated };
};

const ALTERNATIVES: Array<{ match: RegExp; replacement: string }> = [
  { match: /clarithromycin|erythromycin/i, replacement: 'Azithromycin 500mg (OD)' },
  { match: /amoxicillin|ampicillin|penicillin/i, replacement: 'Ciprofloxacin 500mg (BD)' },
  { match: /diclofenac|ibuprofen|naproxen/i, replacement: 'Paracetamol 500mg (TDS)' },
  { match: /omeprazole/i, replacement: 'Pantoprazole 40mg (OD)' },
];

/** Applies the safer alternative to the offending drug and re-screens the prescription. */
export const applySaferAlternative = (s: HospitalState, reviewId: string): Transition<PrescriptionReviewItem | null> => {
  const rx = s.prescriptionReviews.find((r) => r.id === reviewId);
  if (!rx) return { state: s, result: null };
  const drugs = rx.drugs.map((d) => ALTERNATIVES.find((a) => a.match.test(d))?.replacement ?? d);
  if (drugs.join('|') === rx.drugs.join('|')) return { state: s, result: rx };
  // The doctor-approved substitution also replaces the drug in the patient's current medication list,
  // otherwise the old drug would keep triggering the same interaction on re-screening.
  const swapped = (meds: string[]) => meds.map((m) => ALTERNATIVES.find((a) => a.match.test(m))?.replacement ?? m);
  const base: HospitalState = rx.patientId
    ? {
        ...s,
        clinicalProfiles: s.clinicalProfiles.map((c) =>
          c.patientId === rx.patientId ? { ...c, currentMedications: swapped(c.currentMedications) } : c
        ),
      }
    : s;
  const alerts = rx.patientId ? checkDrugsForPatient(base, rx.patientId, drugs) : [];
  const items = drugs.map((d, i) => {
    const med = matchMedicine(s.medicines, d);
    return { medicineId: med?.id, name: med?.name ?? d.split('(')[0].trim(), qty: rx.items?.[i]?.qty ?? 10 };
  });
  const status = safetyStatusFrom(alerts);
  const updated: PrescriptionReviewItem = {
    ...rx,
    drugs,
    items,
    safetyStatus: status,
    interactionAlert: alerts.find((a) => a.kind === 'interaction')?.detail,
    allergyAlert: alerts.find((a) => a.kind === 'allergy')?.detail,
    alternativeSuggestion: undefined,
    dosageValidation: status === 'Safe' ? 'Re-screened after substitution: no interactions or allergy conflicts.' : rx.dosageValidation,
    status: 'Pending Review',
  };
  let next: HospitalState = { ...base, prescriptionReviews: replaceById(base.prescriptionReviews, reviewId, updated) };
  next = withAudit(next, 'Applied safer alternative (doctor approved)', `${rx.prescriptionCode} • ${drugs.join(', ')}`);
  return { state: next, result: updated };
};

// -------------------------------------------------------------
// Clinical notes
// -------------------------------------------------------------
export const saveClinicalNote = (
  s: HospitalState,
  patientId: string,
  content: string,
  source: ClinicalNote['source'],
  approvedBy: string
): Transition<ClinicalNote> => {
  const patient = findPatient(s, patientId);
  const note: ClinicalNote = {
    id: newId('note'),
    patientId,
    date: today(),
    time: nowClock(),
    author: approvedBy,
    content: content.trim(),
    status: 'Approved',
    source,
    approvedBy,
  };
  let next: HospitalState = { ...s, clinicalNotes: [note, ...s.clinicalNotes] };
  next = withAudit(next, `Approved ${source === 'AI Draft' ? 'AI-drafted' : source.toLowerCase()} clinical note`, patient?.name, approvedBy);
  return { state: next, result: note };
};

// -------------------------------------------------------------
// Operations modules
// -------------------------------------------------------------
export const dispatchAmbulance = (
  s: HospitalState,
  ambulanceId: string,
  trip: { pickup: string; reason: string; priority?: 'Emergency' | 'Routine' }
): Transition<Ambulance | null> => {
  const amb = s.ambulances.find((a) => a.id === ambulanceId);
  if (!amb || amb.status !== 'Available') return { state: s, result: null };
  const updated: Ambulance = {
    ...amb,
    status: 'On Trip',
    location: `En route to ${trip.pickup}`,
    trip: { ...trip, priority: trip.priority ?? 'Routine', etaMinutes: 8 + Math.floor(Math.random() * 12), dispatchedAt: Date.now() },
  };
  let next: HospitalState = { ...s, ambulances: replaceById(s.ambulances, ambulanceId, updated) };
  next = withNotification(next, {
    title: 'Ambulance dispatched',
    description: `${amb.vehicleNo} → ${trip.pickup} • ETA ${updated.trip!.etaMinutes} min`,
    category: 'System',
    route: '/ambulance',
  });
  next = withAudit(next, 'Dispatched ambulance', `${amb.vehicleNo} → ${trip.pickup}`);
  return { state: next, result: updated };
};

export const completeAmbulanceTrip = (s: HospitalState, ambulanceId: string): Transition<Ambulance | null> => {
  const amb = s.ambulances.find((a) => a.id === ambulanceId);
  if (!amb || amb.status !== 'On Trip') return { state: s, result: null };
  const updated: Ambulance = { ...amb, status: 'Available', location: 'Emergency Bay 1', trip: undefined };
  let next: HospitalState = { ...s, ambulances: replaceById(s.ambulances, ambulanceId, updated) };
  next = withAudit(next, 'Ambulance returned to base', amb.vehicleNo);
  return { state: next, result: updated };
};

export const setAmbulanceMaintenance = (s: HospitalState, ambulanceId: string, inService: boolean): Transition<Ambulance | null> => {
  const amb = s.ambulances.find((a) => a.id === ambulanceId);
  if (!amb || amb.status === 'On Trip') return { state: s, result: null };
  const updated: Ambulance = { ...amb, status: inService ? 'Available' : 'Maintenance', location: inService ? 'Main Block Bay 2' : 'Service Centre, Kalamassery' };
  return { state: withAudit({ ...s, ambulances: replaceById(s.ambulances, ambulanceId, updated) }, inService ? 'Ambulance back in service' : 'Ambulance sent for maintenance', amb.vehicleNo), result: updated };
};

const COMPONENT_KEY: Record<BloodRequest['component'], keyof Omit<BloodStock, 'group'>> = {
  'Whole Blood': 'wholeBlood',
  PRBC: 'prbc',
  Platelets: 'platelets',
  Plasma: 'plasma',
};

export const issueBlood = (s: HospitalState, requestId: string): Transition<{ ok: boolean; error?: 'INSUFFICIENT' | 'NOT_FOUND' }> => {
  const req = s.bloodRequests.find((r) => r.id === requestId);
  if (!req || req.status !== 'Pending Cross-match') return { state: s, result: { ok: false, error: 'NOT_FOUND' } };
  const key = COMPONENT_KEY[req.component];
  const stock = s.bloodStock.find((b) => b.group === req.group);
  if (!stock || stock[key] < req.units) return { state: s, result: { ok: false, error: 'INSUFFICIENT' } };
  let next: HospitalState = {
    ...s,
    bloodStock: s.bloodStock.map((b) => (b.group === req.group ? { ...b, [key]: b[key] - req.units } : b)),
    bloodRequests: replaceById(s.bloodRequests, requestId, { status: 'Issued' }),
  };
  next = withAudit(next, `Issued ${req.units} unit${req.units > 1 ? 's' : ''} ${req.group} ${req.component}`, req.patientName);
  return { state: next, result: { ok: true } };
};

export const createBloodRequest = (
  s: HospitalState,
  input: Omit<BloodRequest, 'id' | 'status' | 'requestedAt' | 'patientName'> & { patientName?: string }
): Transition<BloodRequest> => {
  const patient = findPatient(s, input.patientId);
  const req: BloodRequest = {
    ...input,
    id: newId('br'),
    patientName: patient?.name ?? input.patientName ?? 'Unknown',
    status: 'Pending Cross-match',
    requestedAt: nowClock(),
  };
  let next: HospitalState = { ...s, bloodRequests: [req, ...s.bloodRequests] };
  next = withAudit(next, `Blood request ${req.units} × ${req.group} ${req.component} (${req.priority})`, req.patientName);
  return { state: next, result: req };
};

export const recordBloodDonation = (s: HospitalState, group: BloodStock['group'], units = 1): HospitalState =>
  withAudit(
    { ...s, bloodStock: s.bloodStock.map((b) => (b.group === group ? { ...b, wholeBlood: b.wholeBlood + units } : b)) },
    `Recorded donation (${units} unit ${group})`,
    'Blood Bank'
  );

export const rejectBloodRequest = (s: HospitalState, requestId: string, reason: string): Transition<BloodRequest | null> => {
  const req = s.bloodRequests.find((r) => r.id === requestId);
  if (!req || req.status !== 'Pending Cross-match') return { state: s, result: null };
  const updated: BloodRequest = { ...req, status: 'Rejected', rejectionReason: reason };
  let next: HospitalState = { ...s, bloodRequests: replaceById(s.bloodRequests, requestId, updated) };
  next = withNotification(next, {
    title: 'Blood request rejected',
    description: `${req.patientName} • ${req.units} × ${req.group} ${req.component} — ${reason}`,
    category: 'System',
    route: '/blood-bank',
  });
  next = withAudit(next, `Rejected blood request (${reason})`, req.patientName);
  return { state: next, result: updated };
};

export const raiseIndent = (s: HospitalState, supplyId: string, qty: number): Transition<SupplyItem | null> => {
  const item = s.supplies.find((x) => x.id === supplyId);
  if (!item) return { state: s, result: null };
  const updated = { ...item, onOrder: (item.onOrder ?? 0) + qty };
  let next: HospitalState = { ...s, supplies: replaceById(s.supplies, supplyId, updated) };
  next = withAudit(next, `Raised indent for ${qty} ${item.unit}`, item.name);
  return { state: next, result: updated };
};

export const receiveIndent = (s: HospitalState, supplyId: string): Transition<SupplyItem | null> => {
  const item = s.supplies.find((x) => x.id === supplyId);
  if (!item || !item.onOrder) return { state: s, result: item ?? null };
  const updated: SupplyItem = { ...item, stock: item.stock + item.onOrder, onOrder: undefined, lastRestocked: formatDisplayDate(new Date()) };
  let next: HospitalState = { ...s, supplies: replaceById(s.supplies, supplyId, updated) };
  next = withAudit(next, `Received ${item.onOrder} ${item.unit} into store`, item.name);
  return { state: next, result: updated };
};

export const raiseMedicineIndent = (s: HospitalState, medicineId: string, qty: number): Transition<Medicine | null> => {
  const med = s.medicines.find((m) => m.id === medicineId);
  if (!med || qty <= 0) return { state: s, result: null };
  const updated: Medicine = { ...med, onOrder: (med.onOrder ?? 0) + qty };
  let next: HospitalState = { ...s, medicines: replaceById(s.medicines, medicineId, updated) };
  next = withAudit(next, `Raised purchase indent for ${qty} ${med.dosageForm}`, med.name);
  return { state: next, result: updated };
};

export const receiveMedicineIndent = (s: HospitalState, medicineId: string): Transition<Medicine | null> => {
  const med = s.medicines.find((m) => m.id === medicineId);
  if (!med || !med.onOrder) return { state: s, result: med ?? null };
  const updated: Medicine = { ...med, stock: med.stock + med.onOrder, onOrder: undefined };
  let next: HospitalState = { ...s, medicines: replaceById(s.medicines, medicineId, updated) };
  next = withAudit(next, `Received ${med.onOrder} ${med.dosageForm} into pharmacy store`, med.name);
  return { state: next, result: updated };
};

/** Posts an in-app notification (e.g. "results sent to the ordering doctor"). */
export const notify = (s: HospitalState, n: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'createdAt'>, auditAction?: string): HospitalState => {
  const next = withNotification(s, n);
  return auditAction ? withAudit(next, auditAction, n.description) : next;
};

export const togglePatientReminder = (s: HospitalState, reminderId: string): Transition<PatientReminder | null> => {
  const rem = s.patientReminders.find((r) => r.id === reminderId);
  if (!rem) return { state: s, result: null };
  const updated: PatientReminder = { ...rem, taken: !rem.taken, takenAt: !rem.taken ? nowClock() : undefined };
  let next: HospitalState = { ...s, patientReminders: replaceById(s.patientReminders, reminderId, updated) };
  if (updated.taken) next = withAudit(next, `Dose taken: ${rem.medicineName}`, findPatient(s, rem.patientId)?.name, 'Patient App');
  return { state: next, result: updated };
};

export const addDocument = (
  s: HospitalState,
  input: Omit<PatientDocument, 'id' | 'date' | 'patientName'> & { patientName?: string }
): Transition<PatientDocument> => {
  const patient = findPatient(s, input.patientId);
  const doc: PatientDocument = {
    ...input,
    id: newId('doc'),
    patientName: patient?.name ?? input.patientName ?? 'Unknown',
    date: today(),
  };
  let next: HospitalState = { ...s, documents: [doc, ...s.documents] };
  next = withAudit(next, `Added document (${doc.type})`, `${doc.title} • ${doc.patientName}`);
  return { state: next, result: doc };
};

// -------------------------------------------------------------
// Selectors
// -------------------------------------------------------------
export const bedSummary = (s: HospitalState) => {
  const total = s.wardInfo.reduce((n, w) => n + w.totalBeds, 0);
  const occupied = s.wardInfo.reduce((n, w) => n + w.occupied, 0);
  const icu = s.wardInfo.find((w) => w.type === 'ICU');
  return {
    total,
    occupied,
    available: total - occupied,
    pct: total ? Math.round((occupied / total) * 100) : 0,
    icuAvailable: icu?.available ?? 0,
    icuTotal: icu?.totalBeds ?? 0,
  };
};

export const todayStatsFor = (s: HospitalState) => {
  const t = today();
  const beds = bedSummary(s);
  const opdToday = MD.OPD_TODAY_BASE + s.appointments.filter((a) => a.date === t && a.type !== 'IPD' && a.status !== 'Cancelled').length;
  const admissionsToday = 18 + s.patients.filter((p) => p.status === 'Admitted' && p.admittedOn === t).length;
  const dischargesToday = s.patients.filter((p) => p.dischargedOn === t).length;
  return {
    totalPatients: MD.PATIENT_REGISTRY_BASE + s.patients.length,
    opdToday,
    ipdOccupancy: beds.pct,
    surgeriesToday: MD.SURGERIES_TODAY,
    todayCollection: MD.TODAY_COLLECTION_BASE + paidOnDate(s.invoices, t),
    bedsOccupied: beds.occupied,
    bedsTotal: beds.total,
    admissionsToday,
    dischargesToday: 6 + dischargesToday,
    emergencyToday: MD.EMERGENCY_TODAY,
    footfallToday: opdToday + MD.EMERGENCY_TODAY + beds.occupied,
    pendingAmount: s.invoices.filter((i) => i.status === 'Pending').reduce((n, i) => n + i.amount, 0),
    pendingCount: s.invoices.filter((i) => i.status === 'Pending').length,
  };
};

export const labPipelineCounts = (s: HospitalState) => {
  const t = today();
  const todays = s.labSamples.filter((x) => x.date === t);
  const count = (status: LabSample['status']) => MD.LAB_PIPELINE_BASE[status] + todays.filter((x) => x.status === status).length;
  return { New: count('New'), Processing: count('Processing'), Completed: count('Completed'), Abnormal: count('Abnormal') };
};

export const upcomingAppointments = (s: HospitalState, limit = 3) => {
  const t = today();
  return s.appointments
    .filter((a) => a.date === t && a.status !== 'Completed' && a.status !== 'Cancelled')
    .sort((a, b) => clockToMinutes(a.time) - clockToMinutes(b.time))
    .slice(0, limit);
};

export const copilotStats = (s: HospitalState, doctorName: string) => {
  const t = today();
  const mine = s.appointments.filter((a) => a.date === t && a.doctorName === doctorName && a.status !== 'Cancelled');
  const inpatients = s.patients.filter((p) => p.status === 'Admitted' && p.attendingDoctor === doctorName);
  const pendingReports = s.labSamples.filter(
    (x) => x.date === t && x.orderedBy === doctorName && (x.status === 'New' || x.status === 'Processing')
  ).length;
  const notesToday = new Set(s.clinicalNotes.filter((n) => n.date === t).map((n) => n.patientId));
  const seenToday = new Set(mine.filter((a) => a.status === 'Completed').map((a) => a.patientId));
  const notesPending = [...seenToday].filter((id) => !notesToday.has(id)).length + inpatients.filter((p) => !notesToday.has(p.id)).length;
  return { todaysPatients: mine.length + inpatients.length, pendingReports, notesPending };
};

export const patientLabel = (p: Patient) => `${p.name} • ${p.uhid}`;

export const isExpired = (m: Medicine) => monthsUntilExpiry(m.expiry) < 0;
export const expiresSoon = (m: Medicine) => monthsUntilExpiry(m.expiry) >= 0 && monthsUntilExpiry(m.expiry) <= 2;

export { latestVitals };
