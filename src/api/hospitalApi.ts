import type {
  Appointment,
  AppNotification,
  ClinicalNote,
  ClinicalProfile,
  Doctor,
  Invoice,
  LabSample,
  Patient,
  PatientDocument,
  RadiologyOrder,
  Visit,
  VitalsRecord,
} from '../data/mockData';
import type { HospitalProfile, ServerIds } from '../logic/hospital';
import { formatClock, formatDisplayDate } from '../utils/dates';
import { api } from './client';
import * as M from './mappers';
import type {
  ApiAppointment,
  ApiConsultation,
  ApiDocument,
  ApiImaging,
  ApiInvoice,
  ApiLabReport,
  ApiMedication,
  ApiPatient,
  ApiPrescription,
  ApiSettings,
  ApiTask,
  ApiVitals,
} from './types';

// Reads the hospital from the backend in the app's own shape, and saves the
// changes the app makes. Saves return the ids the server assigned, which the app
// feeds back into its transitions (withServerIds) so local and server copies match.

/** Everything the live app shows that the backend holds. */
export interface LiveSnapshot {
  patients: Patient[];
  clinicalProfiles: ClinicalProfile[];
  doctors: Doctor[];
  appointments: Appointment[];
  invoices: Invoice[];
  visits: Visit[];
  clinicalNotes: ClinicalNote[];
  vitals: VitalsRecord[];
  labSamples: LabSample[];
  radiologyOrders: RadiologyOrder[];
  documents: PatientDocument[];
  notifications: AppNotification[];
  hospitalProfile: Partial<HospitalProfile>;
}

/** Runs `fn` over `items` with at most `limit` requests in flight. */
async function inBatches<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const enc = encodeURIComponent;

export async function loadHospital(): Promise<LiveSnapshot> {
  const [settings, patientPage, appointmentPage, bills, medications, labReports, imaging, documents, tasks] = await Promise.all([
    api<ApiSettings>('/settings'),
    api<{ patients: ApiPatient[] }>('/patients', { query: { limit: 500 } }),
    api<{ appointments: ApiAppointment[] }>('/appointments', { query: { limit: 500 } }),
    api<ApiInvoice[]>('/billing/invoices'),
    api<ApiMedication[]>('/medications'),
    api<ApiLabReport[]>('/lab-reports'),
    api<ApiImaging[]>('/imaging'),
    api<ApiDocument[]>('/documents'),
    api<ApiTask[]>('/tasks-alerts'),
  ]);
  const apiPatients = patientPage.patients;

  // Consultations, prescriptions and vitals are only served per patient.
  const charts = await inBatches(apiPatients, 4, async (p) => {
    const [consultations, prescriptions, vitals] = await Promise.all([
      api<ApiConsultation[]>('/consultations', { query: { uhid: p.uhid } }),
      api<ApiPrescription[]>('/prescriptions', { query: { uhid: p.uhid } }),
      api<ApiVitals[]>(`/vitals/${enc(p.uhid)}`),
    ]);
    return { patient: p, consultations, prescriptions, vitals };
  });

  const patients = apiPatients.map(M.toPatient);
  const byUhid = new Map(patients.map((p) => [p.uhid, p]));
  const idByUhid = new Map(patients.map((p) => [p.uhid, p.id]));
  const doctor = M.toDoctor(settings);

  const visits: Visit[] = [];
  const clinicalNotes: ClinicalNote[] = [];
  const vitals: VitalsRecord[] = [];
  const profiles: ClinicalProfile[] = [];
  for (const chart of charts) {
    const id = chart.patient.id;
    for (const c of chart.consultations) {
      if (c.visitType === M.CLINICAL_NOTE_TYPE) clinicalNotes.push(M.toClinicalNote(c, id));
      else visits.push(M.toVisit(c, id, chart.prescriptions));
    }
    vitals.push(...chart.vitals.map((v) => M.toVitals(v, id)));
    const latest = chart.consultations.find((c) => c.visitType !== M.CLINICAL_NOTE_TYPE);
    profiles.push(M.toProfile(chart.patient, medications, latest?.reason ?? ''));
  }

  return {
    patients,
    clinicalProfiles: profiles,
    doctors: [doctor],
    appointments: M.toAppointments(appointmentPage.appointments, idByUhid, doctor),
    invoices: bills.map((b) => M.toInvoice(b, idByUhid.get(b.uhid) ?? '')),
    visits,
    clinicalNotes,
    vitals,
    labSamples: labReports.map((r) => M.toLabSample(r, byUhid.get(r.uhid))),
    radiologyOrders: imaging.map((i) => M.toRadiologyOrder(i, byUhid.get(i.uhid))),
    documents: documents.map((d) => M.toDocument(d, byUhid.get(d.uhid))),
    notifications: tasks
      .filter((t) => t.status !== 'Completed')
      .map(M.toNotification)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    hospitalProfile: Object.fromEntries(
      PROFILE_FIELDS.filter((k) => settings.hospital?.[k]).map((k) => [k, k === 'address' ? settings.hospital![k]!.replace(/\s*\n\s*/g, ' ') : settings.hospital![k]])
    ),
  };
}

// ---------------------------------------------------------------- saving changes

const PROFILE_FIELDS = ['name', 'tagline', 'address', 'phone', 'email', 'website', 'gstin', 'regNo'] as const;

/** Hospital profile edits go to the settings' hospital section (shared with the web app). */
export const saveHospitalProfile = (patch: Partial<HospitalProfile>) => api('/settings', { method: 'PUT', body: { hospital: patch } });

/** Bill item categories the backend accepts. */
const BILL_CATEGORY: Record<Invoice['type'], string> = {
  REG: 'Administrative',
  OPD: 'Consultation',
  IPD: 'Others',
  Pharmacy: 'Others',
  Lab: 'Lab',
  Radiology: 'Radiology',
  Surgery: 'Others',
};

/** The backend's frequency code from the app's ("OD (Before food)" → "OD"); undefined when not one of its codes. */
const rxFrequency = (frequency: string) => /^(OD|BD|TDS|QID|HS|SOS)\b/i.exec(frequency.trim())?.[1].toUpperCase();

/** Prescription items accept only these instructions; others go to the prescription notes. */
const RX_INSTRUCTIONS = ['After food', 'Before food', 'At night', 'SOS (Fever)', 'With warm water'];
const rxInstruction = (text?: string) => {
  const normalised = text === 'At bedtime' ? 'At night' : text;
  return normalised && RX_INSTRUCTIONS.includes(normalised) ? normalised : undefined;
};

/** "26 Sep 2026" for an ISO day (the backend's record date format). */
const display = (iso: string) => formatDisplayDate(iso);

async function saveBill(invoice: Invoice, uhid: string): Promise<ApiInvoice> {
  return api<ApiInvoice>('/billing/invoices', {
    method: 'POST',
    body: {
      uhid,
      patientName: invoice.patientName,
      billDate: `${invoice.date}, ${invoice.time}`,
      // Free text on the backend; carries the bill's type for the round trip (see mappers.invoiceType).
      visitType: M.BILL_VISIT_TYPE[invoice.type],
      createdBy: invoice.doctorName ?? '',
      paymentMode: invoice.paymentMode,
      items: (invoice.items ?? []).map((i) => ({
        service: i.description,
        category: BILL_CATEGORY[invoice.type],
        qty: i.qty ?? 1,
        unitPrice: i.rate ?? i.amount,
        discount: 0,
        amount: i.amount,
      })),
      subtotal: invoice.amount,
      discount: 0,
      tax: 0,
      totalAmount: invoice.amount,
      paidAmount: invoice.status === 'Paid' ? invoice.amount : 0,
      notes: invoice.title,
    },
  });
}

const billIds = (bills: ApiInvoice[]): ServerIds => ({ ids: { inv: bills.map((b) => b.id) }, invoiceNos: bills.map((b) => b.billNumber) });

const merge = (...parts: ServerIds[]): ServerIds => ({
  ids: parts.reduce<Record<string, string[]>>((all, p) => {
    for (const [k, v] of Object.entries(p.ids ?? {})) all[k] = [...(all[k] ?? []), ...(v ?? [])];
    return all;
  }, {}),
  uhids: parts.flatMap((p) => p.uhids ?? []),
  invoiceNos: parts.flatMap((p) => p.invoiceNos ?? []),
});

export async function savePatient(
  patient: Patient,
  extra: { allergies?: string[]; conditions?: string[] },
  registrationBill: Invoice
): Promise<ServerIds> {
  const insured = patient.insurance && !/^self/i.test(patient.insurance);
  const created = await api<ApiPatient>('/patients', {
    method: 'POST',
    body: {
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      dob: patient.dob || undefined,
      address: patient.address || undefined,
      email: patient.email,
      emergencyContact: patient.emergencyContact,
      bloodGroup: patient.bloodGroup,
      conditions: extra.conditions ?? [],
      // The backend stores allergy tags with this prefix.
      allergies: (extra.allergies ?? []).map((a) => `Allergy: ${a}`),
      ...(insured && { insurance: { provider: patient.insurance } }),
      visitType: 'OPD',
      status: 'Today',
      department: 'General Medicine',
    },
  });
  const bill = await saveBill(registrationBill, created.uhid);
  return merge({ ids: { pat: [created.id] }, uhids: [created.uhid] }, billIds([bill]));
}

export async function saveAppointment(appointment: Appointment, patient: Patient, conditions: string[], bill?: Invoice): Promise<ServerIds> {
  const created = await api<ApiAppointment>('/appointments', {
    method: 'POST',
    body: {
      uhid: patient.uhid,
      patientName: patient.name,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      date: appointment.date,
      time: appointment.time,
      type: M.apiAppointmentType(appointment.type),
      condition: appointment.reason ?? '',
      status: 'Scheduled',
      tags: conditions,
    },
  });
  const bills = bill ? [await saveBill(bill, patient.uhid)] : [];
  return merge({ ids: { apt: [created.id] } }, billIds(bills));
}

export const setAppointmentStatus = (id: string, status: Appointment['status']) =>
  api<ApiAppointment>(`/appointments/${enc(id)}/status`, { method: 'PATCH', body: { status: M.apiAppointmentStatus(status) } });

/**
 * A finished OPD consultation: the SOAP note, its prescription (also recorded as
 * the patient's active medicines), the appointment it closed, a walk-in bill and
 * the follow-up it booked.
 */
export async function saveConsultation(plan: {
  patient: Patient;
  visit: Visit;
  conditions: string[];
  completedAppointmentIds: string[];
  walkInBill?: Invoice;
  followUp?: Appointment;
}): Promise<ServerIds> {
  const { patient, visit } = plan;
  const visitDate = display(visit.date);
  const consultation = await api<ApiConsultation>('/consultations/soap', {
    method: 'POST',
    body: {
      uhid: patient.uhid,
      patientName: patient.name,
      visitDate,
      visitTime: formatClock(),
      visitType: visit.type === 'Follow Up' ? 'Follow-up' : 'Consultation',
      doctor: visit.doctorName,
      department: visit.department,
      reason: visit.symptoms,
      subjective: visit.symptoms,
      objective: '',
      assessment: visit.diagnosis,
      plan: [visit.advice, visit.followUpDate && `Follow-up on ${display(visit.followUpDate)}`].filter(Boolean).join('\n'),
      isFinal: true,
    },
  });
  if (visit.prescription.length) {
    const lines = visit.prescription.map((l) => ({ line: l, frequency: rxFrequency(l.frequency) }));
    const unsupported = lines.find((x) => !x.frequency);
    if (unsupported) throw new Error(`"${unsupported.line.frequency}" for ${unsupported.line.name} is not a frequency the hospital system records (OD, BD, TDS, QID, HS, SOS).`);
    const common = (l: Visit['prescription'][number], frequency: string) => ({
      medicine: l.name,
      dose: l.dose,
      frequency,
      duration: l.duration,
      route: 'Oral',
      indication: visit.diagnosis,
      status: 'Active',
      startDate: visitDate,
    });
    await api('/prescriptions', {
      method: 'POST',
      body: {
        uhid: patient.uhid,
        date: visitDate,
        type: 'OPD',
        items: lines.map(({ line, frequency }) => ({ ...common(line, frequency!), instructions: rxInstruction(line.instructions) })),
        // Instructions outside the prescription form's fixed list are kept word for word here.
        additionalInstructions: lines
          .filter(({ line }) => line.instructions && !rxInstruction(line.instructions))
          .map(({ line }) => `${line.name}: ${line.instructions}`)
          .join('\n'),
      },
    });
    // Medication records take instructions as free text.
    await Promise.all(
      lines.map(({ line, frequency }) => api('/medications', { method: 'POST', body: { uhid: patient.uhid, ...common(line, frequency!), instructions: line.instructions ?? '' } }))
    );
  }
  await Promise.all(plan.completedAppointmentIds.map((id) => setAppointmentStatus(id, 'Completed')));
  const bills = plan.walkInBill ? [await saveBill(plan.walkInBill, patient.uhid)] : [];
  const followUp = plan.followUp ? await saveAppointment(plan.followUp, patient, plan.conditions) : {};
  return merge({ ids: { visit: [consultation.id] } }, billIds(bills), followUp);
}

export async function saveVitals(record: VitalsRecord, patient: Patient): Promise<ServerIds> {
  const [systolic, diastolic] = record.bp.split('/').map((n) => Number(n.trim()));
  const created = await api<ApiVitals>('/vitals', {
    method: 'POST',
    body: {
      uhid: patient.uhid,
      recordedAt: `${display(record.date)}, ${record.time}`,
      recordedBy: record.recordedBy,
      bpSystolic: systolic,
      bpDiastolic: diastolic,
      heartRate: record.pulse,
      temperature: record.temp,
      spo2: record.spo2,
      respiratoryRate: record.respRate,
      bloodSugarFasting: record.sugar,
    },
  });
  return { ids: { vit: [created.id] } };
}

/** An approved clinical note, kept as a consultation record of its own type. */
export async function saveClinicalNote(note: ClinicalNote, patient: Patient): Promise<ServerIds> {
  const created = await api<ApiConsultation>('/consultations/soap', {
    method: 'POST',
    body: {
      uhid: patient.uhid,
      patientName: patient.name,
      visitDate: display(note.date),
      visitTime: note.time,
      visitType: M.CLINICAL_NOTE_TYPE,
      doctor: note.approvedBy ?? note.author,
      department: patient.department ?? 'General Medicine',
      reason: note.source === 'AI Draft' ? 'AI-drafted note (approved)' : 'Clinical note',
      freeText: note.content,
      isFinal: true,
    },
  });
  return { ids: { note: [created.id] } };
}

export async function saveInvoice(invoice: Invoice): Promise<ServerIds> {
  return billIds([await saveBill(invoice, invoice.uhid)]);
}

export const payInvoice = (invoice: Invoice, mode: Invoice['paymentMode']) =>
  api<ApiInvoice>(`/billing/invoices/${enc(invoice.id)}/pay`, {
    method: 'PATCH',
    body: { amount: invoice.balanceDue ?? invoice.amount, paymentMode: mode },
  });

export async function saveDocument(doc: PatientDocument, patient: Patient): Promise<ServerIds> {
  const created = await api<ApiDocument>('/documents', {
    method: 'POST',
    body: {
      uhid: patient.uhid,
      title: doc.title,
      category: M.apiDocumentCategory(doc.type),
      date: display(doc.date),
      fileType: 'pdf',
      fileSize: doc.size,
      description: '',
    },
  });
  return { ids: { doc: [created.id] } };
}
