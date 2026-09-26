import React, { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
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
import { useToast } from './ToastContext';

export type { CartItem, AiChatMessage, UserRole, PaymentMode, RoomType } from '../logic/hospital';
type CartItem = H.CartItem;
type UserRole = H.UserRole;

/**
 * Central hospital store.
 *
 * All business rules live in pure functions under src/logic (tested by
 * scripts/testing-agent.js). This provider runs each one as a synchronous
 * transaction against the latest state, so chained actions (register → bill →
 * notify) never read stale data.
 */
interface AppContextType extends Omit<H.HospitalState, 'selectedPatientId'> {
  selectedPatientId: string | null;
  selectedPatient: Patient | null;
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
  setActiveRole: (role: UserRole) => void;
  setSelectedPatient: (patient: Patient | null) => void;
  setSelectedPatientId: (id: string | null) => void;
  setPatientAppUser: (patientId: string) => void;

  // Patients & appointments
  registerPatient: (input: H.RegisterPatientInput) => { patient: Patient; invoice: Invoice };
  /** @deprecated use registerPatient */
  addPatient: (patientData: Omit<Patient, 'id' | 'uhid' | 'registeredDate'>) => Patient;
  scheduleAppointment: (input: H.ScheduleInput) => H.ScheduleResult;
  /** @deprecated use scheduleAppointment */
  bookAppointment: (data: {
    patientId: string;
    doctorId: string;
    department: string;
    type: 'OPD' | 'IPD' | 'Follow Up';
    date: string;
    time: string;
  }) => Appointment;
  updateAppointmentStatus: (appointmentId: string, status: Appointment['status']) => void;

  // Clinical
  saveConsultation: (input: H.ConsultationInput) => ReturnType<typeof H.saveConsultation>['result'];
  recordVitals: (patientId: string, input: H.VitalsInput, recordedBy?: string) => ReturnType<typeof H.recordVitals>['result'];
  saveClinicalNote: (patientId: string, content: string, source: ClinicalNote['source'], approvedBy: string) => ClinicalNote;
  admitPatient: (input: H.AdmitInput) => H.AdmitResult;
  /** @deprecated use admitPatient */
  admitPatientToIPD: (patientId: string, roomType: string, department: string, notes?: string) => void;
  dischargePatient: (patientId: string) => H.DischargeResult;

  // Billing
  createInvoice: (invoiceData: H.CreateInvoiceInput) => Invoice;
  markInvoicePaid: (invoiceId: string, mode: H.PaymentMode) => Invoice | null;

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
  /** @deprecated use dispensePrescription / requestClarification */
  resolvePrescriptionReview: (reviewId: string, status: PrescriptionReviewItem['status']) => void;

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
  addDocument: (input: Parameters<typeof H.addDocument>[1]) => PatientDocument;

  // Settings
  updateSettings: (patch: Partial<H.HospitalSettings>) => void;
  updateHospitalProfile: (patch: Partial<H.HospitalProfile>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const byDateDesc = <T extends { date?: string }>(a: T, b: T) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<H.HospitalState>(H.createInitialState);
  const stateRef = useRef(state);
  const [aiTyping, setAiTyping] = useState(false);
  const [patientAiTyping, setPatientAiTyping] = useState(false);
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

    return {
      // Session
      setActiveRole: (role: UserRole) => {
        if (stateRef.current.activeRole === role) return;
        update((s) => H.withAudit({ ...s, activeRole: role }, `Switched role to ${role}`));
        // Portals switch role when opened; say so, so later access checks aren't a surprise.
        showToast({ message: `Now working as ${ROLE_LABEL[role]} — access follows this role.`, title: `${ROLE_LABEL[role]} view`, type: 'info', icon: 'swap-horizontal' });
      },
      setSelectedPatient: (patient: Patient | null) => update((s) => ({ ...s, selectedPatientId: patient?.id ?? null })),
      setSelectedPatientId: (id: string | null) => update((s) => ({ ...s, selectedPatientId: id })),
      setPatientAppUser: (patientId: string) => update((s) => ({ ...s, patientAppUserId: patientId, patientChatMessages: [] })),

      // Patients & appointments
      registerPatient: (input: H.RegisterPatientInput) => run((s) => H.registerPatient(s, input)),
      addPatient: (data: Omit<Patient, 'id' | 'uhid' | 'registeredDate'>) =>
        run((s) =>
          H.registerPatient(s, {
            name: data.name,
            phone: data.phone,
            dob: data.dob,
            gender: data.gender,
            address: data.address,
            bloodGroup: data.bloodGroup,
            insurance: data.insurance,
          })
        ).patient,
      scheduleAppointment: (input: H.ScheduleInput) => run((s) => H.scheduleAppointment(s, input)),
      bookAppointment: (data: { patientId: string; doctorId: string; department: string; type: 'OPD' | 'IPD' | 'Follow Up'; date: string; time: string }) => {
        const result = run((s) => H.scheduleAppointment(s, data));
        if (!result.ok) throw new Error(`Booking failed: ${result.error}`);
        return result.appointment;
      },
      updateAppointmentStatus: (appointmentId: string, status: Appointment['status']) => {
        run((s) => H.updateAppointmentStatus(s, appointmentId, status));
      },

      // Clinical
      saveConsultation: (input: H.ConsultationInput) => run((s) => H.saveConsultation(s, input)),
      recordVitals: (patientId: string, input: H.VitalsInput, recordedBy?: string) => run((s) => H.recordVitals(s, patientId, input, recordedBy)),
      saveClinicalNote: (patientId: string, content: string, source: ClinicalNote['source'], approvedBy: string) =>
        run((s) => H.saveClinicalNote(s, patientId, content, source, approvedBy)),
      admitPatient: (input: H.AdmitInput) => run((s) => H.admitPatient(s, input)),
      admitPatientToIPD: (patientId: string, roomType: string, department: string, notes?: string) => {
        const type: H.RoomType = /icu/i.test(roomType) ? 'ICU' : /private|deluxe/i.test(roomType) ? 'Private' : 'General Ward';
        run((s) => H.admitPatient(s, { patientId, roomType: type, department, notes }));
      },
      dischargePatient: (patientId: string) => run((s) => H.dischargePatient(s, patientId)),

      // Billing
      createInvoice: (input: H.CreateInvoiceInput) => run((s) => H.createInvoice(s, input)),
      markInvoicePaid: (invoiceId: string, mode: H.PaymentMode) => run((s) => H.markInvoicePaid(s, invoiceId, mode)),

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
      resolvePrescriptionReview: (reviewId: string, status: PrescriptionReviewItem['status']) => {
        if (status === 'Dispensed') {
          run((s) => H.dispensePrescription(s, reviewId, { override: { reason: 'Legacy approval', by: H.ROLE_ACTOR.pharmacy } }));
        } else if (status === 'Doctor Clarification') {
          run((s) => H.requestClarification(s, reviewId, 'Please review the flagged prescription'));
        }
      },

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
      addDocument: (input: Parameters<typeof H.addDocument>[1]) => run((s) => H.addDocument(s, input)),

      // Settings
      updateSettings: (patch: Partial<H.HospitalSettings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      updateHospitalProfile: (patch: Partial<H.HospitalProfile>) =>
        update((s) => H.withAudit({ ...s, hospitalProfile: { ...s.hospitalProfile, ...patch } }, 'Updated hospital profile')),

      // Reads that must see the very latest state (used inside event handlers)
      getAvailableSlots: (doctorId: string, dateISO: string) => H.getAvailableSlots(stateRef.current, doctorId, dateISO),
      checkDrugsForPatient: (patientId: string, drugs: string[]) => H.checkDrugsForPatient(stateRef.current, patientId, drugs),
      findDuplicatePatients: (phone: string, name?: string) => H.findDuplicatePatients(stateRef.current, phone, name),
      askCopilot: (query: string, patientId?: string) => answerStaffQuery(query, stateRef.current, patientId),
    };
  }, [run, update, showToast]);

  const derived = useMemo(() => {
    const todayStats = H.todayStatsFor(state);
    return {
      selectedPatient: H.findPatient(state, state.selectedPatientId) ?? null,
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
      getRevenue: (period: RevenuePeriod) => revenueForPeriod(REVENUE_BY_PERIOD, period, todayStats.todayCollection),
      getCopilotStats: (doctorName: string) => H.copilotStats(state, doctorName),
      getWardBedMap: (wardId: string) => {
        const ward = state.wardInfo.find((w) => w.id === wardId);
        return ward ? H.wardBedMap(state, ward) : null;
      },
    };
  }, [state]);

  const value = useMemo<AppContextType>(
    () => ({ ...state, ...derived, ...actions, aiTyping, patientAiTyping }),
    [state, derived, actions, aiTyping, patientAiTyping]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
