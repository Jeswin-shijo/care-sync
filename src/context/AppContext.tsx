import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type {
  Ambulance,
  Appointment,
  BloodRequest,
  ClinicalNote,
  ClinicalProfile,
  DischargeSummary,
  Invoice,
  LabParameter,
  LabSample,
  Patient,
  PatientDocument,
  PrescriptionReviewItem,
  RadiologyOrder,
  RevenuePeriod,
  RevenueSnapshot,
  Visit,
  VitalsRecord,
} from '../data/mockData';
import { REVENUE_BY_PERIOD } from '../data/mockData';
import * as H from '../logic/hospital';
import { answerPatientQuery, answerStaffQuery, AiAnswer } from '../logic/aiEngine';
import { AiAlert, buildAiAlerts, labTrends, LabTrend, resultsForPatient } from '../logic/clinical';
import { revenueForPeriod } from '../logic/billing';
import type { SafetyAlert } from '../logic/safety';
import { formatClock } from '../utils/dates';
import { ROLE_LABEL } from '../logic/access';
import { errorMessage } from '../api/client';
import * as HospitalApi from '../api/hospitalApi';
import { useToast } from './ToastContext';
import { useSession } from './SessionContext';

export type { CartItem, AiChatMessage, UserRole, PaymentMode, RoomType } from '../logic/hospital';
type CartItem = H.CartItem;
type UserRole = H.UserRole;

/**
 * Where this store's data lives:
 * - `live`: the MediOS backend (signed-in account). Changes are saved to the API
 *   first and then applied locally with the server's ids.
 * - `demo`: the offline demo's sample hospital, kept in memory.
 * - `preview`: the same sample hospital, opened from a live session for modules
 *   the backend does not cover yet (see PreviewScope). Nothing reaches the server.
 */
export type DataMode = 'live' | 'demo' | 'preview';
export type DataStatus = 'idle' | 'loading' | 'ready' | 'error';

type ConsultationResult = ReturnType<typeof H.saveConsultation>['result'];
type VitalsResult = ReturnType<typeof H.recordVitals>['result'];

/**
 * Central hospital store.
 *
 * All business rules live in pure functions under src/logic (tested by
 * scripts/testing-agent.js). This provider runs each one as a synchronous
 * transaction against the latest state, so chained actions (register → bill →
 * notify) never read stale data. Changes to records the backend holds are async:
 * they resolve to null when the server refused them (the user has been told).
 */
interface AppContextType extends Omit<H.HospitalState, 'selectedPatientId'> {
  dataMode: DataMode;
  dataStatus: DataStatus;
  dataError: string | null;
  /** Reloads the backend's records (live); a no-op elsewhere. */
  refreshData: () => Promise<void>;

  selectedPatientId: string | null;
  selectedPatient: Patient | null;
  /** Who is acting: the signed-in staff member, or the demo role's sample staff. */
  actorName: string;
  patientAppUser: Patient | undefined;
  todayStats: ReturnType<typeof H.todayStatsFor>;
  bedSummary: ReturnType<typeof H.bedSummary>;
  labPipeline: ReturnType<typeof H.labPipelineCounts>;
  aiAlerts: AiAlert[];
  upcomingAppointments: Appointment[];
  unreadCount: number;
  aiTyping: boolean;
  patientAiTyping: boolean;

  // Record lookups (never fall back to another patient)
  getPatient: (id?: string | null) => Patient | undefined;
  getProfile: (patientId: string) => ClinicalProfile | undefined;
  getVitals: (patientId: string) => VitalsRecord[];
  getLatestVitals: (patientId: string) => VitalsRecord | undefined;
  getVisits: (patientId: string) => Visit[];
  getLabResults: (patientId: string) => LabSample[];
  getLabOrders: (patientId: string) => LabSample[];
  getLabTrends: (patientId: string) => LabTrend[];
  getRadiologyOrders: (patientId: string) => RadiologyOrder[];
  getInvoicesForPatient: (patientId: string) => Invoice[];
  getAppointmentsForPatient: (patientId: string) => Appointment[];
  getDocuments: (patientId: string) => PatientDocument[];
  getClinicalNotes: (patientId: string) => ClinicalNote[];
  getDischargeSummary: (patientId: string) => DischargeSummary | null;
  getRevenue: (period: RevenuePeriod) => RevenueSnapshot;
  getCopilotStats: (doctorName: string) => ReturnType<typeof H.copilotStats>;
  getAvailableSlots: (doctorId: string, dateISO: string) => H.SlotInfo[];
  checkDrugsForPatient: (patientId: string, drugs: string[]) => SafetyAlert[];
  findDuplicatePatients: (phone: string, name?: string) => Patient[];
  askCopilot: (query: string, patientId?: string) => AiAnswer;

  // Session
  /** Switches role in the offline demo; a signed-in account keeps its own role. */
  setActiveRole: (role: UserRole) => void;
  /** False when the role comes from the signed-in account. */
  canSwitchRole: boolean;
  setSelectedPatient: (patient: Patient | null) => void;
  setSelectedPatientId: (id: string | null) => void;
  setPatientAppUser: (patientId: string) => void;

  // Patients & appointments
  registerPatient: (input: H.RegisterPatientInput) => Promise<{ patient: Patient; invoice: Invoice } | null>;
  scheduleAppointment: (input: H.ScheduleInput) => Promise<H.ScheduleResult | null>;
  updateAppointmentStatus: (appointmentId: string, status: Appointment['status']) => Promise<void>;
  /**
   * Front-desk check-in: the appointment moves to Waiting. Signed in, the server
   * issues today's queue token, whose label is returned (null if refused).
   */
  checkInAppointment: (appointmentId: string) => Promise<{ label: string; existing: boolean } | null>;

  // Clinical
  saveConsultation: (input: H.ConsultationInput) => Promise<ConsultationResult | null>;
  recordVitals: (patientId: string, input: H.VitalsInput, recordedBy?: string) => Promise<VitalsResult | null>;
  saveClinicalNote: (patientId: string, content: string, source: ClinicalNote['source'], approvedBy: string) => Promise<ClinicalNote | null>;
  admitPatient: (input: H.AdmitInput) => H.AdmitResult;
  dischargePatient: (patientId: string) => H.DischargeResult;

  // Billing
  createInvoice: (invoiceData: H.CreateInvoiceInput) => Promise<Invoice | null>;
  markInvoicePaid: (invoiceId: string, mode: H.PaymentMode) => Promise<Invoice | null>;

  // Pharmacy counter cart
  cart: CartItem[];
  addToCart: (item: { id: string; type: CartItem['type']; name: string; price: number }) => { ok: boolean; error?: H.CartError };
  removeFromCart: (itemId: string, removeAll?: boolean) => void;
  decrementCartItem: (itemId: string) => void;
  clearCart: (restoreStock?: boolean) => void;
  checkoutPharmacyCart: (patientId: string, mode: H.PaymentMode, status?: Invoice['status']) => Invoice | null;

  // Diagnostics
  orderLabTests: (patientId: string, testIds: string[], opts: H.OrderOptions) => { invoice: Invoice; samples: LabSample[] } | null;
  orderRadiologyScans: (
    patientId: string,
    scanIds: string[],
    opts: H.OrderOptions & { date?: string; time?: string }
  ) => { invoice: Invoice; orders: RadiologyOrder[] } | null;
  receiveSample: (sampleId: string) => LabSample | null;
  enterLabResults: (sampleId: string, params: LabParameter[]) => LabSample | null;
  analyzerResultsFor: (testName: string) => LabParameter[];
  updateLabSampleStatus: (sampleId: string, status: LabSample['status']) => void;

  // Pharmacy review
  dispensePrescription: (
    reviewId: string,
    opts?: { override?: { reason: string; by: string }; paymentMode?: H.PaymentMode }
  ) => H.DispenseResult;
  requestClarification: (reviewId: string, note: string) => PrescriptionReviewItem | null;
  applySaferAlternative: (reviewId: string) => PrescriptionReviewItem | null;

  // Nursing & patient app
  toggleNurseTask: (taskId: string) => void;
  togglePatientReminder: (id: string) => void;

  // Notifications
  /** Post an in-app notification (optionally audited). */
  notify: (n: Parameters<typeof H.notify>[1], auditAction?: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearReadNotifications: () => void;

  // AI
  sendAiMessage: (messageText: string) => void;
  sendPatientAiMessage: (messageText: string) => void;
  clearAiChat: () => void;
  clearPatientChat: () => void;

  // Operations
  dispatchAmbulance: (ambulanceId: string, trip: { pickup: string; reason: string; priority?: 'Emergency' | 'Routine' }) => Ambulance | null;
  completeAmbulanceTrip: (ambulanceId: string) => void;
  setAmbulanceMaintenance: (ambulanceId: string, inService: boolean) => void;
  issueBlood: (requestId: string) => { ok: boolean; error?: 'INSUFFICIENT' | 'NOT_FOUND' };
  createBloodRequest: (input: Parameters<typeof H.createBloodRequest>[1]) => void;
  recordBloodDonation: (group: Parameters<typeof H.recordBloodDonation>[1], units?: number) => void;
  rejectBloodRequest: (requestId: string, reason: string) => BloodRequest | null;
  raiseMedicineIndent: (medicineId: string, qty: number) => void;
  receiveMedicineIndent: (medicineId: string) => void;
  getWardBedMap: (wardId: string) => { named: Map<number, Patient>; occupied: Set<number>; free: number[] } | null;
  raiseIndent: (supplyId: string, qty: number) => void;
  receiveIndent: (supplyId: string) => void;
  addDocument: (input: Parameters<typeof H.addDocument>[1]) => Promise<PatientDocument | null>;

  // Settings
  updateSettings: (patch: Partial<H.HospitalSettings>) => void;
  updateHospitalProfile: (patch: Partial<H.HospitalProfile>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/** The sample hospital for preview screens opened from a live session (see PreviewScope). */
const PreviewStoreContext = createContext<AppContextType | undefined>(undefined);

/** Minimum time away before returning to the app reloads the backend's records. */
const FOREGROUND_REFRESH_MS = 60_000;

const byDateDesc = <T extends { date?: string }>(a: T, b: T) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1);

/** A live store before (or after) a session: no records at all, never sample data. */
const emptyLiveState = (): H.HospitalState => ({
  ...H.createInitialState(),
  patients: [],
  doctors: [],
  appointments: [],
  invoices: [],
  notifications: [],
  selectedPatientId: null,
  nurseTasks: [],
  labSamples: [],
  prescriptionReviews: [],
  patientReminders: [],
  clinicalProfiles: [],
  vitals: [],
  visits: [],
  clinicalNotes: [],
  radiologyOrders: [],
  dischargeSummaries: [],
  bloodRequests: [],
  documents: [],
  auditLog: [],
  patientAppUserId: '',
  live: true,
});

/**
 * The backend's records in place of the sample ones. Catalogues and stock that the
 * backend does not hold (medicines, tests, beds, blood, fleet) stay as configured;
 * sample records about the demo hospital's patients are dropped.
 */
const withSnapshot = (s: H.HospitalState, snap: HospitalApi.LiveSnapshot): H.HospitalState => {
  const hospitalProfile = {
    ...s.hospitalProfile,
    tagline: '',
    website: '',
    gstin: '',
    regNo: '',
    ...snap.hospitalProfile,
  };
  return {
    ...s,
    patients: snap.patients,
    clinicalProfiles: snap.clinicalProfiles,
    doctors: snap.doctors,
    appointments: snap.appointments,
    invoices: snap.invoices,
    visits: snap.visits,
    clinicalNotes: snap.clinicalNotes,
    vitals: snap.vitals,
    labSamples: snap.labSamples,
    radiologyOrders: snap.radiologyOrders,
    documents: snap.documents,
    notifications: snap.notifications,
    hospitalProfile,
    settings: { ...s.settings, receiptFooter: `Thank you for choosing ${hospitalProfile.name}` },
    selectedPatientId: snap.patients.some((p) => p.id === s.selectedPatientId) ? s.selectedPatientId : (snap.patients[0]?.id ?? null),
  };
};

/** Appointments whose status a transition changed, e.g. the one a consultation closed. */
const changedAppointments = (before: H.HospitalState, after: H.HospitalState) =>
  after.appointments.filter((a) => before.appointments.find((b) => b.id === a.id && b.status !== a.status));

interface StoreOptions {
  mode: DataMode;
  /** Load the backend's records (live store with a signed-in account). */
  active: boolean;
  /** The signed-in account's role; null lets the user switch freely (offline demo). */
  lockedRole: UserRole | null;
  /** The signed-in staff member's name (live). */
  staffName?: string;
}

function useHospitalStore({ mode, active, lockedRole, staffName }: StoreOptions): AppContextType {
  const live = mode === 'live';
  const [state, setState] = useState<H.HospitalState>(live ? emptyLiveState : H.createInitialState);
  const stateRef = useRef(state);
  const [aiTyping, setAiTyping] = useState(false);
  const [patientAiTyping, setPatientAiTyping] = useState(false);
  const [dataStatus, setDataStatus] = useState<DataStatus>(live ? 'idle' : 'ready');
  const [dataError, setDataError] = useState<string | null>(null);
  const { showToast } = useToast();

  const commit = useCallback((next: H.HospitalState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /** Runs a pure transition against the latest state and commits it. */
  const run = useCallback(
    <R,>(fn: (s: H.HospitalState) => H.Transition<R>): R => {
      const { state: next, result } = fn(stateRef.current);
      commit(next);
      return result;
    },
    [commit]
  );

  const update = useCallback((fn: (s: H.HospitalState) => H.HospitalState) => commit(fn(stateRef.current)), [commit]);

  // ------------------------------------------------------------ live data

  const loadLive = useCallback(async () => {
    setDataStatus('loading');
    setDataError(null);
    try {
      const snap = await HospitalApi.loadHospital();
      update((s) => withSnapshot(s, snap));
      setDataStatus('ready');
    } catch (err) {
      setDataError(errorMessage(err));
      setDataStatus('error');
    }
  }, [update]);

  useEffect(() => {
    if (!live) return;
    if (active) {
      // A fresh session: start from nothing, then load the hospital.
      commit({ ...emptyLiveState(), activeRole: lockedRole ?? 'doctor', signedInAs: staffName });
      loadLive();
    } else {
      // Signed out: drop every patient record from memory.
      commit(emptyLiveState());
      setDataStatus('idle');
      setDataError(null);
    }
  }, [live, active, lockedRole, staffName, commit, loadLive]);

  // Sample stores: each account (or a return to the offline demo) starts from a
  // fresh sample hospital, working as the account's role.
  useEffect(() => {
    if (live) return;
    commit({ ...H.createInitialState(), activeRole: lockedRole ?? 'doctor' });
  }, [live, lockedRole, commit]);

  const refreshData = useCallback(async () => {
    if (!live || !active) return;
    // Nothing on screen yet (a failed first load): show progress, not stale data.
    if (!stateRef.current.patients.length) setDataStatus('loading');
    try {
      const snap = await HospitalApi.loadHospital();
      update((s) => withSnapshot(s, snap));
      setDataStatus('ready');
      setDataError(null);
    } catch (err) {
      if (stateRef.current.patients.length) showToast({ type: 'danger', title: 'Could not refresh', message: errorMessage(err) });
      else {
        setDataError(errorMessage(err));
        setDataStatus('error');
      }
    }
  }, [live, active, update, showToast]);

  // Back in the foreground after a while: pick up what changed elsewhere (e.g. the web app).
  const lastLoaded = useRef(0);
  useEffect(() => {
    if (dataStatus === 'ready') lastLoaded.current = Date.now();
  }, [dataStatus, state.patients]);
  useEffect(() => {
    if (!live || !active) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && Date.now() - lastLoaded.current > FOREGROUND_REFRESH_MS) refreshData();
    });
    return () => sub.remove();
  }, [live, active, refreshData]);

  /**
   * Live write: plan the change with the pure transition, save what it would
   * create, then apply it for real with the ids the server assigned. A refused
   * save is reported and leaves local data untouched (resolves to null).
   */
  const persist = useCallback(
    async <R,>(
      what: string,
      transition: (s: H.HospitalState) => H.Transition<R>,
      save: (planned: H.Transition<R>, before: H.HospitalState) => Promise<H.ServerIds>
    ): Promise<R | null> => {
      const before = stateRef.current;
      let ids: H.ServerIds;
      try {
        ids = await save(transition(before), before);
      } catch (err) {
        showToast({ type: 'danger', title: `${what} not saved`, message: errorMessage(err) });
        // Part of a multi-step save may have gone through; show what the server has.
        refreshData();
        return null;
      }
      return run((s) => H.withServerIds(ids, () => transition(s)));
    },
    [run, refreshData, showToast]
  );

  const actions = useMemo(() => {
    const reply = (
      key: 'aiChatMessages' | 'patientChatMessages',
      text: string,
      answer: (s: H.HospitalState) => AiAnswer,
      setTyping: (v: boolean) => void
    ) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const userMsg: H.AiChatMessage = {
        id: H.newId('msg'),
        sender: 'user',
        text: trimmed,
        timestamp: formatClock(),
        createdAt: Date.now(),
      };
      update((s) => ({ ...s, [key]: [...s[key], userMsg] }));
      setTyping(true);
      // A short, length-aware "thinking" pause keeps the simulation believable.
      setTimeout(() => {
        const a = answer(stateRef.current);
        const assistantMsg: H.AiChatMessage = {
          id: H.newId('msg'),
          sender: 'assistant',
          text: a.text,
          timestamp: formatClock(),
          createdAt: Date.now(),
          actionCard: a.actionCard,
          citations: a.citations,
          followUps: a.followUps,
        };
        update((s) =>
          H.withAudit({ ...s, [key]: [...s[key], assistantMsg] }, 'AI query answered', trimmed.slice(0, 60), 'MediOS AI')
        );
        setTyping(false);
      }, 650 + Math.min(900, trimmed.length * 10));
    };

    const patientOf = (s: H.HospitalState, id: string) => {
      const patient = H.findPatient(s, id);
      if (!patient) throw new Error('This patient is not in the hospital records.');
      return patient;
    };

    return {
      // Session
      setActiveRole: (role: UserRole) => {
        if (lockedRole || stateRef.current.activeRole === role) return;
        update((s) => H.withAudit({ ...s, activeRole: role }, `Switched role to ${role}`));
        // Portals switch role when opened; say so, so later access checks aren't a surprise.
        showToast({ message: `Now working as ${ROLE_LABEL[role]} — access follows this role.`, title: `${ROLE_LABEL[role]} view`, type: 'info', icon: 'swap-horizontal' });
      },
      setSelectedPatient: (patient: Patient | null) => update((s) => ({ ...s, selectedPatientId: patient?.id ?? null })),
      setSelectedPatientId: (id: string | null) => update((s) => ({ ...s, selectedPatientId: id })),
      setPatientAppUser: (patientId: string) => update((s) => ({ ...s, patientAppUserId: patientId, patientChatMessages: [] })),

      // Patients & appointments
      registerPatient: async (input: H.RegisterPatientInput) => {
        if (!live) return run((s) => H.registerPatient(s, input));
        return persist('Registration', (s) => H.registerPatient(s, input), ({ result }) =>
          HospitalApi.savePatient(result.patient, { allergies: input.allergies, conditions: input.conditions }, result.invoice)
        );
      },
      scheduleAppointment: async (input: H.ScheduleInput) => {
        if (!live) return run((s) => H.scheduleAppointment(s, input));
        const planned = H.scheduleAppointment(stateRef.current, input).result;
        // Clash checks run locally first; only a bookable slot goes to the server.
        if (!planned.ok) return planned;
        return persist('Appointment', (s) => H.scheduleAppointment(s, input), ({ result }, before) => {
          if (!result.ok) throw new Error('That slot was just taken. Pick another.');
          const patient = patientOf(before, input.patientId);
          return HospitalApi.saveAppointment(result.appointment, patient, H.findProfile(before, patient.id)?.conditions ?? [], result.invoice);
        });
      },
      updateAppointmentStatus: async (appointmentId: string, status: Appointment['status']) => {
        const previous = stateRef.current.appointments.find((a) => a.id === appointmentId)?.status;
        run((s) => H.updateAppointmentStatus(s, appointmentId, status));
        if (!live || !previous) return;
        try {
          await HospitalApi.setAppointmentStatus(appointmentId, status);
        } catch (err) {
          // Put it back: the server still has the old status.
          update((s) => ({ ...s, appointments: s.appointments.map((a) => (a.id === appointmentId ? { ...a, status: previous } : a)) }));
          showToast({ type: 'danger', title: 'Status not saved', message: errorMessage(err) });
        }
      },

      checkInAppointment: async (appointmentId: string) => {
        const apt = stateRef.current.appointments.find((a) => a.id === appointmentId);
        if (!apt) return null;
        if (!live) {
          run((s) => H.updateAppointmentStatus(s, appointmentId, 'Waiting'));
          return { label: String(apt.tokenNo), existing: false };
        }
        try {
          const { token, existing } = await HospitalApi.checkIn(appointmentId);
          update((s) => ({
            ...s,
            appointments: s.appointments.map((a) => (a.id === appointmentId ? { ...a, status: 'Waiting', tokenNo: token.number } : a)),
          }));
          return { label: token.label, existing };
        } catch (err) {
          showToast({ type: 'danger', title: 'Not checked in', message: errorMessage(err) });
          refreshData();
          return null;
        }
      },

      // Clinical
      saveConsultation: async (input: H.ConsultationInput) => {
        if (!live) return run((s) => H.saveConsultation(s, input));
        return persist('Consultation', (s) => H.saveConsultation(s, input), ({ state: after, result }, before) => {
          const patient = patientOf(before, input.patientId);
          return HospitalApi.saveConsultation({
            patient,
            visit: result.visit,
            conditions: H.findProfile(before, patient.id)?.conditions ?? [],
            completedAppointmentIds: changedAppointments(before, after).map((a) => a.id),
            walkInBill: result.invoice,
            followUp: result.followUp,
          });
        });
      },
      recordVitals: async (patientId: string, input: H.VitalsInput, recordedBy?: string) => {
        if (!live) return run((s) => H.recordVitals(s, patientId, input, recordedBy));
        return persist('Vitals', (s) => H.recordVitals(s, patientId, input, recordedBy), ({ result }, before) =>
          HospitalApi.saveVitals(result.record, patientOf(before, patientId))
        );
      },
      saveClinicalNote: async (patientId: string, content: string, source: ClinicalNote['source'], approvedBy: string) => {
        if (!live) return run((s) => H.saveClinicalNote(s, patientId, content, source, approvedBy));
        return persist('Clinical note', (s) => H.saveClinicalNote(s, patientId, content, source, approvedBy), ({ result }, before) =>
          HospitalApi.saveClinicalNote(result, patientOf(before, patientId))
        );
      },
      admitPatient: (input: H.AdmitInput) => run((s) => H.admitPatient(s, input)),
      dischargePatient: (patientId: string) => run((s) => H.dischargePatient(s, patientId)),

      // Billing
      createInvoice: async (input: H.CreateInvoiceInput) => {
        if (!live) return run((s) => H.createInvoice(s, input));
        return persist('Invoice', (s) => H.createInvoice(s, input), ({ result }) => HospitalApi.saveInvoice(result));
      },
      markInvoicePaid: async (invoiceId: string, mode: H.PaymentMode) => {
        const invoice = stateRef.current.invoices.find((i) => i.id === invoiceId);
        if (live && invoice && invoice.status !== 'Paid') {
          try {
            await HospitalApi.payInvoice(invoice, mode);
          } catch (err) {
            showToast({ type: 'danger', title: 'Payment not recorded', message: errorMessage(err) });
            return null;
          }
        }
        return run((s) => H.markInvoicePaid(s, invoiceId, mode));
      },

      // Pharmacy counter cart
      addToCart: (item: { id: string; type: CartItem['type']; name: string; price: number }) => run((s) => H.addToCart(s, item)),
      removeFromCart: (itemId: string, removeAll: boolean = false) =>
        update((s) => {
          const item = s.cart.find((c) => c.id === itemId);
          if (!item) return s;
          return !removeAll && item.qty > 1 ? H.decrementCartItem(s, itemId) : H.removeFromCart(s, itemId);
        }),
      decrementCartItem: (itemId: string) => update((s) => H.decrementCartItem(s, itemId)),
      // Stock is only deducted at checkout, so clearing never needs to restore it.
      clearCart: (_restoreStock?: boolean) => update((s) => ({ ...s, cart: [] })),
      checkoutPharmacyCart: (patientId: string, mode: H.PaymentMode, status?: Invoice['status']) =>
        run((s) => H.checkoutPharmacyCart(s, patientId, mode, status)),

      // Diagnostics
      orderLabTests: (patientId: string, testIds: string[], opts: H.OrderOptions) => run((s) => H.orderLabTests(s, patientId, testIds, opts)),
      orderRadiologyScans: (patientId: string, scanIds: string[], opts: H.OrderOptions & { date?: string; time?: string }) =>
        run((s) => H.orderRadiologyScans(s, patientId, scanIds, opts)),
      receiveSample: (sampleId: string) => run((s) => H.receiveSample(s, sampleId)),
      enterLabResults: (sampleId: string, params: LabParameter[]) => run((s) => H.enterLabResults(s, sampleId, params)),
      analyzerResultsFor: H.analyzerResultsFor,
      updateLabSampleStatus: (sampleId: string, status: LabSample['status']) => {
        run((s) => H.updateLabSampleStatus(s, sampleId, status));
      },

      // Pharmacy review
      dispensePrescription: (reviewId: string, opts?: { override?: { reason: string; by: string }; paymentMode?: H.PaymentMode }) =>
        run((s) => H.dispensePrescription(s, reviewId, opts)),
      requestClarification: (reviewId: string, note: string) => run((s) => H.requestClarification(s, reviewId, note)),
      applySaferAlternative: (reviewId: string) => run((s) => H.applySaferAlternative(s, reviewId)),

      // Nursing & patient app
      toggleNurseTask: (taskId: string) => {
        run((s) => H.toggleNurseTask(s, taskId));
      },
      togglePatientReminder: (id: string) => {
        run((s) => H.togglePatientReminder(s, id));
      },
      notify: (n: Parameters<typeof H.notify>[1], auditAction?: string) => update((s) => H.notify(s, n, auditAction)),

      // Notifications
      markNotificationAsRead: (id: string) =>
        update((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllNotificationsAsRead: () => update((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearReadNotifications: () => update((s) => ({ ...s, notifications: s.notifications.filter((n) => !n.read) })),

      // AI
      sendAiMessage: (text: string) => reply('aiChatMessages', text, (s) => answerStaffQuery(text, s), setAiTyping),
      sendPatientAiMessage: (text: string) =>
        reply('patientChatMessages', text, (s) => answerPatientQuery(text, s, s.patientAppUserId), setPatientAiTyping),
      clearAiChat: () => update((s) => ({ ...s, aiChatMessages: [] })),
      clearPatientChat: () => update((s) => ({ ...s, patientChatMessages: [] })),

      // Operations
      dispatchAmbulance: (id: string, trip: { pickup: string; reason: string; priority?: 'Emergency' | 'Routine' }) =>
        run((s) => H.dispatchAmbulance(s, id, trip)),
      completeAmbulanceTrip: (id: string) => {
        run((s) => H.completeAmbulanceTrip(s, id));
      },
      setAmbulanceMaintenance: (id: string, inService: boolean) => {
        run((s) => H.setAmbulanceMaintenance(s, id, inService));
      },
      issueBlood: (requestId: string) => run((s) => H.issueBlood(s, requestId)),
      createBloodRequest: (input: Parameters<typeof H.createBloodRequest>[1]) => {
        run((s) => H.createBloodRequest(s, input));
      },
      recordBloodDonation: (group: Parameters<typeof H.recordBloodDonation>[1], units = 1) =>
        update((s) => H.recordBloodDonation(s, group, units)),
      rejectBloodRequest: (requestId: string, reason: string) => run((s) => H.rejectBloodRequest(s, requestId, reason)),
      raiseMedicineIndent: (medicineId: string, qty: number) => {
        run((s) => H.raiseMedicineIndent(s, medicineId, qty));
      },
      receiveMedicineIndent: (medicineId: string) => {
        run((s) => H.receiveMedicineIndent(s, medicineId));
      },
      raiseIndent: (supplyId: string, qty: number) => {
        run((s) => H.raiseIndent(s, supplyId, qty));
      },
      receiveIndent: (supplyId: string) => {
        run((s) => H.receiveIndent(s, supplyId));
      },
      addDocument: async (input: Parameters<typeof H.addDocument>[1]) => {
        if (!live) return run((s) => H.addDocument(s, input));
        return persist('Document', (s) => H.addDocument(s, input), ({ result }, before) =>
          HospitalApi.saveDocument(result, patientOf(before, input.patientId))
        );
      },

      // Settings
      updateSettings: (patch: Partial<H.HospitalSettings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      updateHospitalProfile: (patch: Partial<H.HospitalProfile>) => {
        const previous = stateRef.current.hospitalProfile;
        update((s) => H.withAudit({ ...s, hospitalProfile: { ...s.hospitalProfile, ...patch } }, 'Updated hospital profile'));
        if (!live) return;
        HospitalApi.saveHospitalProfile(patch).catch((err) => {
          // The server keeps the old profile; show that again.
          update((s) => ({ ...s, hospitalProfile: previous }));
          showToast({ type: 'danger', title: 'Hospital profile not saved', message: errorMessage(err) });
        });
      },

      // Reads that must see the very latest state (used inside event handlers)
      getAvailableSlots: (doctorId: string, dateISO: string) => H.getAvailableSlots(stateRef.current, doctorId, dateISO),
      checkDrugsForPatient: (patientId: string, drugs: string[]) => H.checkDrugsForPatient(stateRef.current, patientId, drugs),
      findDuplicatePatients: (phone: string, name?: string) => H.findDuplicatePatients(stateRef.current, phone, name),
      askCopilot: (query: string, patientId?: string) => answerStaffQuery(query, stateRef.current, patientId),
    };
  }, [run, update, persist, refreshData, showToast, live, lockedRole]);

  const derived = useMemo(() => {
    const todayStats = H.todayStatsFor(state);
    return {
      selectedPatient: H.findPatient(state, state.selectedPatientId) ?? null,
      actorName: H.actorOf(state),
      patientAppUser: H.findPatient(state, state.patientAppUserId),
      todayStats,
      bedSummary: H.bedSummary(state),
      labPipeline: H.labPipelineCounts(state),
      aiAlerts: buildAiAlerts(state),
      upcomingAppointments: H.upcomingAppointments(state, 3),
      unreadCount: state.notifications.filter((n) => !n.read).length,
      getPatient: (id?: string | null) => H.findPatient(state, id),
      getProfile: (patientId: string) => H.findProfile(state, patientId),
      getVitals: (patientId: string) =>
        state.vitals.filter((v) => v.patientId === patientId).sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
      getLatestVitals: (patientId: string) => H.latestVitals(state.vitals, patientId),
      getVisits: (patientId: string) => state.visits.filter((v) => v.patientId === patientId).sort(byDateDesc),
      getLabResults: (patientId: string) => resultsForPatient(state.labSamples, patientId),
      getLabOrders: (patientId: string) => state.labSamples.filter((x) => x.patientId === patientId).sort(byDateDesc),
      getLabTrends: (patientId: string) => labTrends(state.labSamples, patientId),
      getRadiologyOrders: (patientId: string) => state.radiologyOrders.filter((o) => o.patientId === patientId).sort(byDateDesc),
      getInvoicesForPatient: (patientId: string) => state.invoices.filter((i) => i.patientId === patientId),
      getAppointmentsForPatient: (patientId: string) => state.appointments.filter((a) => a.patientId === patientId).sort(byDateDesc),
      getDocuments: (patientId: string) => state.documents.filter((d) => d.patientId === patientId).sort(byDateDesc),
      getClinicalNotes: (patientId: string) => state.clinicalNotes.filter((n) => n.patientId === patientId).sort(byDateDesc),
      getDischargeSummary: (patientId: string) => H.buildDischargeSummary(state, patientId),
      // Live: the backend keeps no revenue history, so the period figures are today's collection only.
      getRevenue: (period: RevenuePeriod) => revenueForPeriod(REVENUE_BY_PERIOD, period, todayStats.todayCollection),
      getCopilotStats: (doctorName: string) => H.copilotStats(state, doctorName),
      getWardBedMap: (wardId: string) => {
        const ward = state.wardInfo.find((w) => w.id === wardId);
        return ward ? H.wardBedMap(state, ward) : null;
      },
    };
  }, [state]);

  return useMemo<AppContextType>(
    () => ({
      ...state,
      ...derived,
      ...actions,
      dataMode: mode,
      dataStatus,
      dataError,
      refreshData: live ? refreshData : async () => {},
      canSwitchRole: !lockedRole,
      aiTyping,
      patientAiTyping,
    }),
    [state, derived, actions, mode, dataStatus, dataError, live, refreshData, lockedRole, aiTyping, patientAiTyping]
  );
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const session = useSession();
  const live = session.status === 'live';
  const liveStore = useHospitalStore({ mode: 'live', active: live, lockedRole: live ? session.role : null, staffName: session.user?.name });
  // The offline demo, and the sandbox that preview modules open from a live session.
  const sampleStore = useHospitalStore({ mode: live ? 'preview' : 'demo', active: false, lockedRole: live ? session.role : null });

  return (
    <PreviewStoreContext.Provider value={sampleStore}>
      <AppContext.Provider value={live ? liveStore : sampleStore}>{children}</AppContext.Provider>
    </PreviewStoreContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

/** The sample hospital, for screens the backend does not cover yet (see PreviewScope). */
export const usePreviewStore = () => {
  const context = useContext(PreviewStoreContext);
  if (!context) throw new Error('usePreviewStore must be used within an AppProvider');
  return context;
};

/** Makes the sample hospital the store for everything inside (preview modules). */
export const PreviewStoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AppContext.Provider value={usePreviewStore()}>{children}</AppContext.Provider>
);
