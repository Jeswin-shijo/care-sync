import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { AiActionCard, AiChatMessage } from '../logic/hospital';
import type { AiAnswer } from '../logic/aiEngine';
import type { AiAlert } from '../logic/clinical';
import type { HospitalProtocol } from '../data/mockData';
import { ROLE_LABEL } from '../logic/access';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { PatientPicker } from '../components/common/PatientPicker';
import { EmptyState } from '../components/common/EmptyState';
import { FadeInView } from '../components/common/Motion';
import { formScrollProps, KeyboardAwareContainer, useKeyboardHeight } from '../components/common/KeyboardAware';
import { formatClock, formatDayMonth, greetingForNow, todayISO, weekdayShort } from '../utils/dates';
import { openRoute } from '../utils/navigation';
import {
  analysisLabel,
  buildInsights,
  buildSoapDraft,
  CopilotTab,
  dictationFor,
  EMPTY_SOAP,
  Insight,
  parseCopilotTab,
  PatientContext,
  relevantProtocolIds,
  soapIsEmpty,
  soapToText,
  testShort,
  TodayPatientRow,
  todaysPatientsFor,
} from '../components/ai/copilotEngine';
import { CopilotActionGrid } from '../components/ai/CopilotActionGrid';
import { ChatBubble, TypingBubble } from '../components/ai/ChatBubble';
import { FollowUpChips } from '../components/ai/FollowUpChips';
import { AssistantBadge } from '../components/ai/RobotAvatar';
import { VoiceDictationSheet } from '../components/ai/VoiceDictationSheet';
import { markStreamed, shouldStream } from '../components/ai/useTypewriter';
import { CopilotStats, CopilotStatTile } from '../components/ai/copilot/CopilotStats';
import { TodayPatients } from '../components/ai/copilot/TodayPatients';
import { PatientSummaryCard } from '../components/ai/copilot/PatientSummaryCard';
import { PanelShell } from '../components/ai/copilot/PanelShell';
import { SummaryPanel } from '../components/ai/copilot/SummaryPanel';
import { ExplainState, ReportsPanel } from '../components/ai/copilot/ReportsPanel';
import { DraftEntry, NotesPanel } from '../components/ai/copilot/NotesPanel';
import { NoteApprovalSheet } from '../components/ai/copilot/NoteApprovalSheet';
import { MedReviewPanel } from '../components/ai/copilot/MedReviewPanel';
import { InsightMark, InsightsPanel } from '../components/ai/copilot/InsightsPanel';
import { ProtocolsPanel } from '../components/ai/copilot/ProtocolsPanel';
import { AiAlertsSheet } from '../components/ai/copilot/AiAlertsSheet';
import { ArchitectureSheet } from '../components/ai/copilot/ArchitectureSheet';
import { AuditSheet } from '../components/ai/copilot/AuditSheet';
import { GuardrailsBanner } from '../components/ai/copilot/GuardrailsBanner';
import { AskBar, AskBarHandle } from '../components/ai/copilot/AskBar';

const DOCTOR = 'Dr. Priya Menon';

const PANEL_META: Record<CopilotTab, { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; subtitle: string }> = {
  Summarize: { icon: 'document-text', color: colors.primary, title: 'Patient History Summary', subtitle: 'Complete medical timeline in seconds' },
  Reports: { icon: 'bar-chart', color: '#0EA5E9', title: 'Lab & Radiology Analysis', subtitle: 'Explain and compare with previous' },
  'Draft Notes': { icon: 'create', color: '#6366F1', title: 'Draft Clinical Notes (SOAP)', subtitle: 'Voice / text → structured note, approved by you' },
  'Med Review': { icon: 'medkit', color: colors.danger, title: 'Medication Review', subtitle: 'Interactions, allergies, dosing & duplication' },
  Insights: { icon: 'bulb', color: colors.purple, title: 'Clinical Decision Support', subtitle: 'Evidence-based suggestions — not a final diagnosis' },
  Protocols: { icon: 'book', color: '#7C3AED', title: 'Hospital Protocol Search', subtitle: 'SOPs, guidelines & policies' },
};

interface ThreadItem {
  id: string;
  query: string;
  askedAt: string;
  answer?: AiAnswer;
  answeredAt?: string;
  createdAt?: number;
}

type Anchor = 'today' | 'summary' | 'panel' | 'thread';

const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) || undefined;

export default function DoctorCopilotRoute() {
  const params = useLocalSearchParams<{ patientId?: string; tab?: string }>();
  const paramPid = one(params.patientId);
  const paramTab = one(params.tab);
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardHeight() > 0;
  const { showToast } = useToast();
  const {
    patients,
    appointments,
    labSamples,
    radiologyOrders,
    prescriptionReviews,
    hospitalProtocols,
    clinicalNotes,
    aiAlerts,
    auditLog,
    hospitalProfile,
    activeRole,
    selectedPatientId,
    setActiveRole,
    setSelectedPatientId,
    getPatient,
    getProfile,
    getVitals,
    getLatestVitals,
    getVisits,
    getLabResults,
    getLabOrders,
    getLabTrends,
    getRadiologyOrders,
    getAppointmentsForPatient,
    getClinicalNotes,
    getCopilotStats,
    checkDrugsForPatient,
    askCopilot,
    saveClinicalNote,
    orderLabTests,
    orderRadiologyScans,
    applySaferAlternative,
  } = useApp();

  const todays = useMemo(
    () => todaysPatientsFor(DOCTOR, { patients, appointments, labSamples, radiologyOrders }),
    [patients, appointments, labSamples, radiologyOrders]
  );

  // ---------------------------------------------------------------- selection
  const [pid, setPid] = useState<string | null>(() => {
    if (paramPid && getPatient(paramPid)) return paramPid;
    if (selectedPatientId && getPatient(selectedPatientId)) return selectedPatientId;
    return todays[0]?.patient.id ?? patients[0]?.id ?? null;
  });
  const [tab, setTab] = useState<CopilotTab>(() => parseCopilotTab(paramTab) ?? 'Summarize');
  const [linkMissing, setLinkMissing] = useState(() => !!paramPid && !getPatient(paramPid));

  // ------------------------------------------------------------------ sheets
  const [pickerOpen, setPickerOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<'notes' | 'ask' | null>(null);

  // ---------------------------------------------------- per-patient AI state
  const [drafts, setDrafts] = useState<Record<string, DraftEntry>>({});
  const [regeneratingPid, setRegeneratingPid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [insightMarks, setInsightMarks] = useState<Record<string, Record<string, InsightMark>>>({});
  const [busyInsight, setBusyInsight] = useState<string | null>(null);
  const [explains, setExplains] = useState<Record<string, ExplainState>>({});
  const [threads, setThreads] = useState<Record<string, ThreadItem[]>>({});
  const [askingPid, setAskingPid] = useState<string | null>(null);
  const [askFocused, setAskFocused] = useState(false);
  const [analyzing, setAnalyzing] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const askBarRef = useRef<AskBarHandle>(null);
  const anchors = useRef<Record<Anchor, number>>({ today: 0, summary: 0, panel: 0, thread: 0 });
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, ms);
    timers.current.push(id);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // The copilot is the doctor portal.
  // Re-asserted on every focus, so returning to this portal restores its role.
  useFocusEffect(
    useCallback(() => {
      setActiveRole('doctor');
    }, [setActiveRole])
  );

  // Keep the app-wide "current patient" in step with the copilot.
  useEffect(() => {
    if (pid && pid !== selectedPatientId) setSelectedPatientId(pid);
  }, [pid]);

  // New params on the same screen instance (alerts / notifications deep links).
  const paramsKey = `${paramPid ?? ''}|${paramTab ?? ''}`;
  const lastParamsKey = useRef(paramsKey);
  useEffect(() => {
    if (paramsKey === lastParamsKey.current) return;
    lastParamsKey.current = paramsKey;
    if (paramPid) {
      if (getPatient(paramPid)) {
        setPid(paramPid);
        setLinkMissing(false);
      } else {
        setLinkMissing(true);
      }
    }
    const t = parseCopilotTab(paramTab);
    if (t) setTab(t);
  }, [paramsKey]);

  // Every patient/tab switch re-reads the record ("Analyzing N encounters…").
  useEffect(() => {
    setAnalyzing(true);
    const t = setTimeout(() => setAnalyzing(false), 500);
    return () => clearTimeout(t);
  }, [pid, tab]);

  // ----------------------------------------------------------- patient data
  const patient = pid ? getPatient(pid) : undefined;
  const ctx = useMemo<PatientContext | null>(() => {
    if (!patient) return null;
    return {
      patient,
      profile: getProfile(patient.id),
      vitalsHistory: getVitals(patient.id),
      vitals: getLatestVitals(patient.id),
      visits: getVisits(patient.id),
      labResults: getLabResults(patient.id),
      labOrders: getLabOrders(patient.id),
      trends: getLabTrends(patient.id),
      radiology: getRadiologyOrders(patient.id),
      appointments: getAppointmentsForPatient(patient.id),
      prescriptions: prescriptionReviews.filter((r) => r.patientId === patient.id),
      protocols: hospitalProtocols,
    };
  }, [
    patient,
    getProfile,
    getVitals,
    getLatestVitals,
    getVisits,
    getLabResults,
    getLabOrders,
    getLabTrends,
    getRadiologyOrders,
    getAppointmentsForPatient,
    prescriptionReviews,
    hospitalProtocols,
  ]);

  const insights = useMemo(() => (ctx ? buildInsights(ctx) : []), [ctx]);
  const relevantIds = useMemo(() => (ctx ? relevantProtocolIds(ctx) : []), [ctx]);
  const defaultDraft = useMemo(() => (ctx ? buildSoapDraft(ctx) : EMPTY_SOAP), [ctx]);
  const marks = (pid && insightMarks[pid]) || {};
  const activeInsights = insights.filter((i) => !marks[i.id]).length;
  const medFlags = useMemo(() => {
    if (!ctx) return 0;
    const regimen = ctx.profile?.currentMedications ?? [];
    const alerts = regimen.length ? checkDrugsForPatient(ctx.patient.id, regimen).filter((a) => a.severity !== 'info').length : 0;
    return alerts + ctx.prescriptions.filter((r) => r.safetyStatus !== 'Safe' && r.status !== 'Dispensed').length;
  }, [ctx, checkDrugsForPatient]);

  const first = patient?.name.split(' ')[0] ?? '';
  const draft: DraftEntry = (pid && drafts[pid]) || { note: defaultDraft, origin: 'AI Draft', edited: false };
  const notes = pid ? getClinicalNotes(pid) : [];
  const thread = (pid && threads[pid]) || [];

  // ------------------------------------------------------------- navigation
  const scrollTo = useCallback(
    (anchor: Anchor, delay = 0) => later(() => scrollRef.current?.scrollTo({ y: Math.max(0, anchors.current[anchor] - spacing.sm), animated: true }), delay),
    [later]
  );

  const openPatient = useCallback(
    (id: string | undefined, nextTab?: CopilotTab, anchor: Anchor = 'summary') => {
      if (!id || !getPatient(id)) {
        showToast({ type: 'warning', message: 'That patient record could not be found.' });
        return;
      }
      setPid(id);
      setLinkMissing(false);
      if (nextTab) setTab(nextTab);
      scrollTo(anchor, anchor === 'panel' ? 320 : 80);
    },
    [getPatient, scrollTo, showToast]
  );

  const selectTab = useCallback(
    (next: CopilotTab, scroll = false) => {
      setTab(next);
      if (scroll) scrollTo('panel', 120);
    },
    [scrollTo]
  );

  /** Action cards & alerts: copilot links switch patient/tab in place; everything else navigates. */
  const handleRoute = useCallback(
    (route?: string, routeParams?: Record<string, any>) => {
      if (!route) return;
      if (route === '/doctor-copilot') {
        const nextPid = routeParams?.patientId as string | undefined;
        const nextTab = parseCopilotTab(routeParams?.tab) ?? undefined;
        if (nextPid && nextPid !== pid) openPatient(nextPid, nextTab, 'panel');
        else {
          if (nextTab) setTab(nextTab);
          scrollTo('panel', 150);
        }
        return;
      }
      openRoute(route, routeParams);
    },
    [pid, openPatient, scrollTo]
  );

  const openAlert = (a: AiAlert) => {
    setAlertsOpen(false);
    if (a.route === '/doctor-copilot') {
      later(() => openPatient(a.params?.patientId || a.patientId, parseCopilotTab(a.params?.tab) ?? 'Summarize', 'panel'), 260);
    } else {
      later(() => openRoute(a.route, a.params), 240);
    }
  };

  // --------------------------------------------------------------- stats
  const stats = getCopilotStats(DOCTOR);
  const today = todayISO();
  const notesDue = todays
    .filter((r) => (r.chip === 'Review' || r.chip === 'Seen') && !clinicalNotes.some((n) => n.patientId === r.patient.id && n.date === today))
    .map((r) => r.patient.id);
  const reportsDue = [
    ...new Set(
      labSamples
        .filter((x) => x.date === today && x.orderedBy === DOCTOR && (x.status === 'New' || x.status === 'Processing'))
        .map((x) => x.patientId)
        .filter((x): x is string => !!x)
    ),
  ];

  const reportsDueKey = reportsDue.join(',');
  const notesDueKey = notesDue.join(',');
  const tiles = useMemo<CopilotStatTile[]>(() => [
    {
      key: 'patients',
      label: "Today's Patients",
      value: stats.todaysPatients,
      icon: 'people',
      color: colors.primary,
      hint: 'Scrolls to your patient list',
      onPress: () => scrollTo('today'),
    },
    {
      key: 'reports',
      label: 'Pending Reports',
      value: stats.pendingReports,
      icon: 'flask',
      color: colors.warning,
      hint: 'Opens the next patient with a pending report',
      onPress: () => {
        const next = reportsDue.find((id) => id !== pid) ?? reportsDue[0];
        if (next) openPatient(next, 'Reports', 'panel');
        else showToast({ type: 'info', message: 'No reports pending for you today.' });
      },
    },
    {
      key: 'alerts',
      label: 'AI Alerts',
      value: aiAlerts.length,
      icon: 'sparkles',
      color: colors.danger,
      live: aiAlerts.some((a) => a.severity === 'critical'),
      hint: 'Lists every AI alert with its source',
      onPress: () => setAlertsOpen(true),
    },
    {
      key: 'notes',
      label: 'Notes Pending',
      value: stats.notesPending,
      icon: 'create',
      color: colors.purple,
      hint: 'Opens the next clinical note to write',
      onPress: () => {
        const next = notesDue.find((id) => id !== pid) ?? notesDue[0];
        if (next) openPatient(next, 'Draft Notes', 'panel');
        else showToast({ type: 'success', message: "All of today's notes are written." });
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [stats.todaysPatients, stats.pendingReports, stats.notesPending, aiAlerts, reportsDueKey, notesDueKey, pid, openPatient, scrollTo, showToast]);

  // ---------------------------------------------------------------- drafts
  const patchDraft = useCallback(
    (patch: (d: DraftEntry) => Partial<DraftEntry>) => {
      if (!pid) return;
      setDrafts((prev) => {
        const base: DraftEntry = prev[pid] ?? { note: defaultDraft, origin: 'AI Draft', edited: false };
        return { ...prev, [pid]: { ...base, ...patch(base) } };
      });
    },
    [pid, defaultDraft]
  );

  /** Adds a line to this patient's Plan (starting a fresh draft if the last one was already approved). */
  const appendPlan = useCallback(
    (line: string) =>
      patchDraft((d) => {
        const base: DraftEntry = d.savedNoteId ? { note: defaultDraft, origin: 'AI Draft', edited: false } : d;
        const plan = base.note.P.trim();
        if (plan.includes(line)) return { ...base, savedNoteId: undefined, savedAt: undefined };
        return {
          ...base,
          savedNoteId: undefined,
          savedAt: undefined,
          edited: true,
          note: { ...base.note, P: `${plan ? `${plan}\n` : ''}• ${line}` },
        };
      }),
    [patchDraft, defaultDraft]
  );

  const regenerate = () => {
    if (!ctx || !pid) return;
    const target = pid;
    const fresh = buildSoapDraft(ctx);
    const run = () => {
      setRegeneratingPid(target);
      later(() => {
        setDrafts((prev) => ({ ...prev, [target]: { note: fresh, origin: 'AI Draft', edited: false } }));
        setRegeneratingPid(null);
        showToast({ type: 'info', message: 'Draft regenerated from the latest record.' });
      }, 700);
    };
    if (draft.edited) {
      Alert.alert('Discard your edits?', 'Regenerating replaces the current draft with a fresh AI draft.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Regenerate', style: 'destructive', onPress: run },
      ]);
    } else {
      run();
    }
  };

  const clearDraft = () => {
    const run = () => patchDraft(() => ({ note: { ...EMPTY_SOAP }, origin: 'Text', edited: true, savedNoteId: undefined, savedAt: undefined }));
    if (draft.edited) {
      Alert.alert('Discard your edits?', 'Clearing removes the draft so you can write the note yourself.', [
        { text: 'Keep draft', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: run },
      ]);
    } else {
      run();
    }
  };

  const confirmApprove = () => {
    if (!pid || !patient || soapIsEmpty(draft.note) || saving) return;
    const target = pid;
    const content = soapToText(draft.note);
    const source = draft.origin;
    const name = patient.name;
    setSaving(true);
    later(() => {
      const note = saveClinicalNote(target, content, source, DOCTOR);
      setDrafts((prev) => ({
        ...prev,
        [target]: { ...(prev[target] ?? { note: draft.note, origin: source, edited: false }), savedNoteId: note.id, savedAt: `Today, ${note.time}` },
      }));
      setSaving(false);
      setApproveOpen(false);
      showToast({ type: 'success', title: 'Note saved to EMR', message: `${name} • approved by ${DOCTOR} at ${note.time}` });
    }, 450);
  };

  // -------------------------------------------------------------- insights
  const markInsight = (target: string, insight: Insight, status: InsightMark['status'], result?: string) =>
    setInsightMarks((prev) => ({
      ...prev,
      [target]: { ...(prev[target] ?? {}), [insight.id]: { status, title: insight.title, severity: insight.severity, result, at: formatClock() } },
    }));

  const openNoteAction = { label: 'Open note', onPress: () => selectTab('Draft Notes', true) };

  const applyAlternative = (reviewId: string, insight?: Insight) => {
    if (!pid) return;
    const updated = applySaferAlternative(reviewId);
    if (!updated) {
      showToast({ type: 'danger', message: 'That prescription is no longer in the review queue.' });
      return;
    }
    const line = insight?.planLine ?? `Medication change (${updated.prescriptionCode}): ${updated.drugs.join(', ')}.`;
    appendPlan(line);
    if (insight) markInsight(pid, insight, 'accepted', `${updated.prescriptionCode} re-screened: ${updated.safetyStatus}`);
    showToast({
      type: updated.safetyStatus === 'Safe' ? 'success' : 'warning',
      title: 'Safer alternative applied',
      message: `${updated.prescriptionCode}: ${updated.drugs.join(', ')} • ${updated.safetyStatus}`,
      action: { label: 'Pharmacy', onPress: () => openRoute('/pharmacy-review') },
    });
  };

  const acceptInsight = (insight: Insight) => {
    if (!pid || !patient) return;
    const target = pid;
    const a = insight.action;
    switch (a.kind) {
      case 'add-plan':
        appendPlan(insight.planLine);
        markInsight(target, insight, 'accepted', 'Added to draft plan');
        showToast({ type: 'success', title: 'Added to plan', message: insight.planLine, action: openNoteAction });
        break;
      case 'order-lab':
        setBusyInsight(insight.id);
        later(() => {
          const res = orderLabTests(target, a.testIds, { paymentMode: 'UPI', status: 'Pending', orderedBy: DOCTOR });
          setBusyInsight(null);
          if (!res) {
            showToast({ type: 'danger', message: 'Could not place the order — test not in the lab catalogue.' });
            return;
          }
          const names = res.samples.map((s) => testShort(s.testName)).join(' + ');
          const codes = res.samples.map((s) => s.sampleCode).join(', ');
          appendPlan(`Ordered ${names} (${codes}). ${insight.planLine}`);
          markInsight(target, insight, 'accepted', `Ordered ${names} • ${codes}`);
          showToast({
            type: 'success',
            title: `${names} ordered`,
            message: `${codes} • bill ${res.invoice.invoiceNo} pending (UPI)`,
            action: { label: 'Lab portal', onPress: () => openRoute('/lab-portal') },
          });
        }, 500);
        break;
      case 'order-scan':
        setBusyInsight(insight.id);
        later(() => {
          const res = orderRadiologyScans(target, [a.scanId], { paymentMode: 'UPI', status: 'Pending', orderedBy: DOCTOR });
          setBusyInsight(null);
          if (!res) {
            showToast({ type: 'danger', message: 'Could not book the scan — not in the radiology catalogue.' });
            return;
          }
          const names = res.orders.map((o) => o.scanName).join(' + ');
          appendPlan(`Ordered ${names}. ${insight.planLine}`);
          markInsight(target, insight, 'accepted', `Ordered ${names}`);
          showToast({
            type: 'success',
            title: 'Scan ordered',
            message: `${names} • bill ${res.invoice.invoiceNo} pending (UPI)`,
            action: { label: 'Radiology', onPress: () => openRoute('/radiology', { patientId: target }) },
          });
        }, 500);
        break;
      case 'safer-alternative':
        applyAlternative(a.reviewId, insight);
        break;
      case 'call':
        Linking.openURL(`tel:${a.phone.replace(/[^\d+]/g, '')}`)
          .then(() => markInsight(target, insight, 'accepted', 'Dialer opened'))
          .catch(() => Alert.alert('Unable to place call', `Please dial ${a.phone}.`));
        break;
      case 'open':
        markInsight(target, insight, 'accepted', 'Opened');
        handleRoute(a.route, a.params);
        break;
    }
  };

  const dismissInsight = (insight: Insight) => {
    if (!pid) return;
    const target = pid;
    markInsight(target, insight, 'dismissed');
    showToast({ type: 'info', message: 'Suggestion dismissed.', action: { label: 'Undo', onPress: () => restoreInsight(insight.id, target) } });
  };

  const restoreInsight = (insightId: string, target: string | null = pid) => {
    if (!target) return;
    setInsightMarks((prev) => {
      const forPatient = { ...(prev[target] ?? {}) };
      delete forPatient[insightId];
      return { ...prev, [target]: forPatient };
    });
  };

  const citeProtocol = (p: HospitalProtocol) => {
    appendPlan(`Managed per SOP ${p.id} — ${p.title}.`);
    showToast({ type: 'success', title: 'Protocol cited', message: `${p.title} added to today's plan.`, action: openNoteAction });
  };

  // --------------------------------------------------------------- explain
  const runExplain = () => {
    if (!pid || !patient) return;
    const target = pid;
    const name = patient.name.split(' ')[0];
    setExplains((prev) => ({ ...prev, [target]: { pending: true, askedAt: formatClock(), createdAt: Date.now() } }));
    later(() => {
      const answer = askCopilot(`explain ${name} lab report`, target);
      setExplains((prev) => ({ ...prev, [target]: { ...(prev[target] ?? { askedAt: formatClock() }), pending: false, answer, createdAt: Date.now() } }));
    }, 700);
  };

  // ------------------------------------------------------------ ask thread
  const quickAsks = first
    ? [`Summarize ${first}'s history`, `Explain ${first}'s lab report`, `Check ${first}'s drug interactions`, `Latest vitals for ${first}`]
    : [];

  const ask = useCallback((text: string) => {
    const q = text.trim();
    if (!q || !pid || askingPid) return;
    const target = pid;
    const item: ThreadItem = { id: `ask-${Date.now()}`, query: q, askedAt: formatClock() };
    setThreads((prev) => ({ ...prev, [target]: [...(prev[target] ?? []), item] }));
    setAskingPid(target);
    later(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    later(() => {
      const answer = askCopilot(q, target);
      setThreads((prev) => ({
        ...prev,
        [target]: (prev[target] ?? []).map((t) => (t.id === item.id ? { ...t, answer, answeredAt: formatClock(), createdAt: Date.now() } : t)),
      }));
      setAskingPid(null);
      later(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }, 700);
  }, [pid, askingPid, later, askCopilot]);

  const threadMessages = useMemo<AiChatMessage[]>(() => thread.flatMap((t) => [
    { id: `${t.id}-q`, sender: 'user' as const, text: t.query, timestamp: t.askedAt },
    ...(t.answer
      ? [
          {
            id: `${t.id}-a`,
            sender: 'assistant' as const,
            text: t.answer.text,
            timestamp: t.answeredAt ?? t.askedAt,
            citations: t.answer.citations,
            actionCard: t.answer.actionCard,
            followUps: t.answer.followUps,
            createdAt: t.createdAt,
          },
        ]
      : []),
  ]), [thread]);
  const lastThreadMsg = threadMessages[threadMessages.length - 1];

  // ---------------------------------------------------------------- render
  const renderPanel = (c: PatientContext) => {
    switch (tab) {
      case 'Summarize':
        return <SummaryPanel key={c.patient.id} ctx={c} doctorName={DOCTOR} hospital={hospitalProfile} />;
      case 'Reports':
        return (
          <ReportsPanel
            key={c.patient.id}
            ctx={c}
            explain={explains[c.patient.id]}
            onExplain={runExplain}
            onCloseExplain={() =>
              setExplains((prev) => {
                const next = { ...prev };
                delete next[c.patient.id];
                return next;
              })
            }
            onExplainStreamed={() => setExplains((prev) => (prev[c.patient.id] ? { ...prev, [c.patient.id]: { ...prev[c.patient.id], streamed: true } } : prev))}
            onActionPress={(card) => handleRoute(card.route, card.params)}
            onOrderTests={() => openRoute('/lab', { patientId: c.patient.id })}
          />
        );
      case 'Draft Notes':
        return (
          <NotesPanel
            key={c.patient.id}
            ctx={c}
            draft={draft}
            notes={notes}
            regenerating={regeneratingPid === c.patient.id}
            pendingInsights={activeInsights}
            onChange={(key, text) => patchDraft((d) => ({ note: { ...d.note, [key]: text }, edited: true }))}
            onRegenerate={regenerate}
            onClear={clearDraft}
            onVoice={() => {
              Keyboard.dismiss();
              setVoiceTarget('notes');
            }}
            onApprove={() => setApproveOpen(true)}
            onNewDraft={() => setDrafts((prev) => ({ ...prev, [c.patient.id]: { note: buildSoapDraft(c), origin: 'AI Draft', edited: false } }))}
            onOpenInsights={() => selectTab('Insights')}
          />
        );
      case 'Med Review':
        return (
          <MedReviewPanel
            key={c.patient.id}
            ctx={c}
            checkDrugs={(drugs) => checkDrugsForPatient(c.patient.id, drugs)}
            onOpenPharmacy={() => openRoute('/pharmacy-review')}
            onApplyAlternative={(id) => applyAlternative(id)}
          />
        );
      case 'Insights':
        return (
          <InsightsPanel
            key={c.patient.id}
            ctx={c}
            insights={insights}
            marks={marks}
            busyId={busyInsight}
            onAccept={acceptInsight}
            onDismiss={dismissInsight}
            onRestore={(id) => restoreInsight(id)}
          />
        );
      case 'Protocols':
        return <ProtocolsPanel key={c.patient.id} ctx={c} relevantIds={relevantIds} onAddToPlan={citeProtocol} />;
    }
  };

  const onCardPress = useCallback((card: AiActionCard) => handleRoute(card.route, card.params), [handleRoute]);
  const openPicker = useCallback(() => setPickerOpen(true), []);
  const openAudit = useCallback(() => setAuditOpen(true), []);
  const onSelectToday = useCallback((row: TodayPatientRow) => openPatient(row.patient.id, row.defaultTab, 'summary'), [openPatient]);
  const onSelectTab = useCallback((t: CopilotTab) => selectTab(t), [selectTab]);
  const openRecord = useCallback(() => {
    if (pid) router.push({ pathname: '/patient/[id]', params: { id: pid } });
  }, [pid]);
  const onAskMic = useCallback(() => {
    Keyboard.dismiss();
    setVoiceTarget('ask');
  }, []);
  const gridBadges = useMemo(
    () => ({ Insights: activeInsights || undefined, 'Med Review': medFlags || undefined }),
    [activeInsights, medFlags]
  );

  const meta = PANEL_META[tab];
  const now = new Date();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        titleComponent={
          <View>
            <Text style={styles.greeting} numberOfLines={1}>
              {greetingForNow()},
            </Text>
            <Text style={styles.doctor} numberOfLines={1}>
              {DOCTOR}
            </Text>
          </View>
        }
        rightAction={
          <Pressable
            onPress={() => setAboutOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.mediosBadge, pressed && { backgroundColor: '#DCE8FF' }]}
            accessibilityRole="button"
            accessibilityLabel="About MediOS AI"
          >
            <Ionicons name="sparkles" size={13} color={colors.primary} />
            <Text style={styles.mediosText}>MediOS AI</Text>
          </Pressable>
        }
      />

      <KeyboardAwareContainer>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} {...formScrollProps}>
          {linkMissing && (
            <FadeInView style={styles.missing}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.missingText}>
                The linked patient record wasn't found{patient ? ` — showing ${patient.name} instead` : ''}. Pick a patient below.
              </Text>
              <Pressable onPress={() => setLinkMissing(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
                <Ionicons name="close" size={18} color={colors.dangerText} />
              </Pressable>
            </FadeInView>
          )}

          <View style={styles.tagRow}>
            <Text style={styles.tagline} numberOfLines={1}>
              One screen. Complete patient intelligence.
            </Text>
            <Text style={styles.date}>
              {weekdayShort(now)}, {formatDayMonth(now)}
            </Text>
          </View>

          <CopilotStats tiles={tiles} />

          <View style={styles.block} onLayout={(e) => (anchors.current.today = e.nativeEvent.layout.y)}>
            <TodayPatients rows={todays} selectedId={pid} onSelect={onSelectToday} onSearchAll={openPicker} />
          </View>

          {ctx ? (
            <>
              <View style={styles.block} onLayout={(e) => (anchors.current.summary = e.nativeEvent.layout.y)}>
                <PatientSummaryCard ctx={ctx} onChangePatient={openPicker} onOpenRecord={openRecord} />
              </View>

              <View style={styles.block}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>AI Copilot</Text>
                  <Text style={styles.sectionMeta} numberOfLines={1}>
                    for {ctx.patient.name}
                  </Text>
                </View>
                <CopilotActionGrid active={tab} onSelect={onSelectTab} badges={gridBadges} />
              </View>

              <View style={styles.block} onLayout={(e) => (anchors.current.panel = e.nativeEvent.layout.y)}>
                <PanelShell
                  icon={meta.icon}
                  color={meta.color}
                  title={meta.title}
                  subtitle={meta.subtitle}
                  analyzing={analyzing}
                  analyzingLabel={analysisLabel(tab, ctx)}
                >
                  {renderPanel(ctx)}
                </PanelShell>
              </View>

              <View style={styles.block} onLayout={(e) => (anchors.current.thread = e.nativeEvent.layout.y)}>
                <View style={styles.threadCard}>
                  <View style={styles.threadHead}>
                    <AssistantBadge size={26} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.threadTitle}>Ask MediOS about {first}</Text>
                      <Text style={styles.threadSub}>Answers only from {first}'s records, with sources</Text>
                    </View>
                    {!!thread.length && !askingPid && (
                      <Pressable
                        onPress={() => setThreads((prev) => ({ ...prev, [ctx.patient.id]: [] }))}
                        hitSlop={8}
                        style={styles.clear}
                        accessibilityRole="button"
                        accessibilityLabel="Clear questions"
                      >
                        <Text style={styles.clearText}>Clear</Text>
                      </Pressable>
                    )}
                  </View>
                  {!thread.length ? (
                    <FollowUpChips items={quickAsks} onPress={ask} disabled={!!askingPid} label="Try asking" />
                  ) : (
                    threadMessages.map((m) => (
                      <ChatBubble
                        key={m.id}
                        message={m}
                        stream={m.id === lastThreadMsg?.id && m.sender === 'assistant' && shouldStream(m.id, m.createdAt)}
                        onStreamDone={markStreamed}
                        onActionPress={onCardPress}
                        onFollowUp={ask}
                        showFollowUps={m.id === lastThreadMsg?.id}
                        busy={!!askingPid}
                      />
                    ))
                  )}
                  {askingPid === ctx.patient.id && <TypingBubble label={`Reading ${first}'s record…`} />}
                </View>
              </View>
            </>
          ) : (
            <EmptyState
              icon="person-outline"
              title="Select a patient"
              description="Choose a patient to load their summary, reports and AI insights."
              actionTitle="Choose patient"
              onActionPress={() => setPickerOpen(true)}
            />
          )}

          <View style={styles.block}>
            <GuardrailsBanner auditCount={auditLog.length} roleLabel={ROLE_LABEL[activeRole]} onOpenAudit={openAudit} />
          </View>
        </ScrollView>

        {/* Hidden while another field (SOAP, drug check, SOP search) has the keyboard, to give it room. */}
        {ctx && (
          <AskBar
            ref={askBarRef}
            hidden={keyboardOpen && !askFocused}
            placeholder={`Ask anything about ${first}…`}
            busy={!!askingPid}
            onAsk={ask}
            onMic={onAskMic}
            onFocusChange={setAskFocused}
            bottomPadding={keyboardOpen ? 0 : Math.max(insets.bottom - spacing.xs, 0)}
          />
        )}
      </KeyboardAwareContainer>

      <PatientPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => openPatient(p.id, undefined, 'summary')}
        selectedId={pid}
        title="Open patient in Copilot"
      />
      <AiAlertsSheet
        visible={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        alerts={aiAlerts}
        onOpen={openAlert}
        myPatientIds={todays.map((r) => r.patient.id)}
      />
      <ArchitectureSheet visible={aboutOpen} onClose={() => setAboutOpen(false)} protocolCount={hospitalProtocols.length} auditCount={auditLog.length} />
      <AuditSheet visible={auditOpen} onClose={() => setAuditOpen(false)} entries={auditLog} />
      {patient && (
        <NoteApprovalSheet
          visible={approveOpen}
          onClose={() => setApproveOpen(false)}
          onConfirm={confirmApprove}
          saving={saving}
          patientName={patient.name}
          uhid={patient.uhid}
          content={soapToText(draft.note)}
          source={draft.origin}
          approver={DOCTOR}
        />
      )}
      <VoiceDictationSheet
        visible={voiceTarget !== null}
        onClose={() => setVoiceTarget(null)}
        title={voiceTarget === 'notes' ? 'Voice-to-notes' : 'Ask by voice'}
        subtitle={voiceTarget === 'notes' ? `Dictate for ${patient?.name ?? 'this patient'} — added to Subjective` : `Ask about ${first}`}
        hint={voiceTarget === 'ask' ? `Try: “${quickAsks[0] ?? 'Summarize history'}”` : 'Speak the history as you would to a colleague.'}
        getTranscript={() => (voiceTarget === 'notes' && ctx ? dictationFor(ctx) : quickAsks[Math.floor(Math.random() * quickAsks.length)] ?? '')}
        onTranscript={(text) => {
          if (voiceTarget === 'notes') {
            patchDraft((d) => ({
              note: { ...d.note, S: `${d.note.S.trim()}${d.note.S.trim() ? '\n' : ''}${text}` },
              origin: 'Voice',
              edited: true,
            }));
            showToast({ type: 'success', message: 'Dictation added to Subjective — review it before approving.' });
          } else {
            askBarRef.current?.fill(text);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  greeting: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  doctor: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  mediosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#D6E6FF',
  },
  mediosText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primary,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  missing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  missingText: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.dangerText,
    lineHeight: 17,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagline: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semiBold,
  },
  date: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  block: {
    marginTop: spacing.base,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sectionMeta: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  threadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.sm,
  },
  threadHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  threadTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  threadSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  clear: {
    height: 30,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.cardMuted,
    justifyContent: 'center',
  },
  clearText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
});
