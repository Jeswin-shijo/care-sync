import type {
  Appointment,
  ClinicalProfile,
  HospitalProtocol,
  LabParameter,
  LabSample,
  Patient,
  PrescriptionReviewItem,
  RadiologyOrder,
  Visit,
  VitalsRecord,
} from '../../data/mockData';
import type { AiCitation } from '../../logic/hospital';
import { formatParamValue, parameterFlag, vitalsFlags, type LabTrend } from '../../logic/clinical';
import { clockToMinutes, daysFromToday, formatDayMonth, relativeDayLabel, todayISO } from '../../utils/dates';

/**
 * Doctor Copilot "reasoning" (simulated, deterministic). Everything here is a
 * pure function of the selected patient's records, so every tab shows that
 * patient's real data — never another patient's — and every suggestion can
 * cite the record or hospital SOP it came from.
 */

// -------------------------------------------------------------
// Tabs
// -------------------------------------------------------------
export type CopilotTab = 'Summarize' | 'Reports' | 'Draft Notes' | 'Med Review' | 'Insights' | 'Protocols';

export const COPILOT_TABS: CopilotTab[] = ['Summarize', 'Reports', 'Draft Notes', 'Med Review', 'Insights', 'Protocols'];

const TAB_ALIASES: Record<string, CopilotTab> = {
  summarize: 'Summarize',
  summary: 'Summarize',
  history: 'Summarize',
  'summarize history': 'Summarize',
  reports: 'Reports',
  report: 'Reports',
  labs: 'Reports',
  lab: 'Reports',
  'analyze reports': 'Reports',
  'draft notes': 'Draft Notes',
  notes: 'Draft Notes',
  note: 'Draft Notes',
  soap: 'Draft Notes',
  'med review': 'Med Review',
  'medication review': 'Med Review',
  medication: 'Med Review',
  meds: 'Med Review',
  insights: 'Insights',
  'clinical insights': 'Insights',
  cdss: 'Insights',
  protocols: 'Protocols',
  protocol: 'Protocols',
  'hospital protocols': 'Protocols',
  sop: 'Protocols',
};

/** Accepts the route contract's tab names plus a few forgiving aliases. */
export const parseCopilotTab = (raw?: string | string[] | null): CopilotTab | null => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return TAB_ALIASES[value.trim().toLowerCase()] ?? null;
};

// -------------------------------------------------------------
// Small formatting helpers
// -------------------------------------------------------------
/** "Complete Blood Count (CBC)" → "CBC", "HbA1c Glycated Hemoglobin" → "HbA1c". */
export const testShort = (name: string) => {
  const abbr = /\(([A-Z0-9]{2,5})\)/.exec(name)?.[1];
  if (abbr) return abbr;
  if (/^hba1c/i.test(name)) return 'HbA1c';
  return name.split('(')[0].trim();
};

/** Compact chart label: 14200 → "14.2k", 240000 → "2.4L". */
export const compactValue = (v: number) => {
  if (v >= 100000) return `${(v / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(v);
};

const trendValue = (unit: string, value: number) => formatParamValue({ name: '', value, unit });

/** "2h ago" / "yesterday, 09:20 AM" / "28 Jun, 10:10 AM" for a charted record. */
export const recordedAgo = (date: string, time: string, now: Date = new Date()): string => {
  const d = daysFromToday(date);
  if (d === 0) {
    const mins = now.getHours() * 60 + now.getMinutes() - clockToMinutes(time);
    if (mins < 0) return `today, ${time}`;
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }
  if (d === -1) return `yesterday, ${time}`;
  return `${formatDayMonth(date)}, ${time}`;
};

const stripStep = (step: string) => step.replace(/^\d+\.\s*/, '');

/** "today" / "yesterday" / "26 Jun" — for use mid-sentence. */
const dayWord = (iso: string) => {
  const rel = relativeDayLabel(iso);
  return rel === 'Today' || rel === 'Yesterday' || rel === 'Tomorrow' ? rel.toLowerCase() : formatDayMonth(iso);
};

// -------------------------------------------------------------
// Patient context
// -------------------------------------------------------------
export interface PatientContext {
  patient: Patient;
  profile?: ClinicalProfile;
  /** Newest first. */
  vitalsHistory: VitalsRecord[];
  vitals?: VitalsRecord;
  /** Newest first. */
  visits: Visit[];
  /** Completed / abnormal results with parameters, newest first. */
  labResults: LabSample[];
  /** Every sample for the patient, newest first. */
  labOrders: LabSample[];
  trends: LabTrend[];
  /** Newest first. */
  radiology: RadiologyOrder[];
  /** Newest first. */
  appointments: Appointment[];
  prescriptions: PrescriptionReviewItem[];
  protocols: HospitalProtocol[];
}

export const pendingLabOrders = (ctx: PatientContext) => ctx.labOrders.filter((s) => s.status === 'New' || s.status === 'Processing');
export const pendingScans = (ctx: PatientContext) => ctx.radiology.filter((o) => o.status !== 'Reported');

/** Newest result parameter whose name starts with `name` (case-insensitive). */
export const latestParam = (ctx: PatientContext, name: string): { param: LabParameter; sample: LabSample } | undefined => {
  for (const sample of ctx.labResults) {
    const param = sample.parameters?.find((p) => p.name.toLowerCase().startsWith(name.toLowerCase()));
    if (param) return { param, sample };
  }
  return undefined;
};

const trendFor = (ctx: PatientContext, parameter: string) =>
  ctx.trends.find((t) => t.parameter.toLowerCase().startsWith(parameter.toLowerCase()) && t.points.length > 1);

const textOf = (ctx: PatientContext) =>
  [
    ...(ctx.profile?.conditions ?? []),
    ctx.profile?.chiefComplaint ?? '',
    ...(ctx.profile?.riskFlags ?? []),
    ...(ctx.profile?.currentMedications ?? []),
  ]
    .join(' ')
    .toLowerCase();

const hasPendingTest = (ctx: PatientContext, pattern: RegExp) => pendingLabOrders(ctx).some((s) => pattern.test(s.testName));

/** Short label for how much record the engine is reading, e.g. "Analyzing 3 encounters…". */
export const analysisLabel = (tab: CopilotTab, ctx: PatientContext) => {
  const n = ctx.visits.length;
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  switch (tab) {
    case 'Reports':
      return `Analyzing ${plural(ctx.labOrders.length + ctx.radiology.length, 'report')}…`;
    case 'Draft Notes':
      return `Drafting from ${plural(n, 'encounter')} & latest vitals…`;
    case 'Med Review':
      return `Checking ${plural(ctx.profile?.currentMedications.length ?? 0, 'medication')} against safety rules…`;
    case 'Insights':
      return `Analyzing ${plural(n, 'encounter')} against hospital protocols…`;
    case 'Protocols':
      return `Searching ${plural(ctx.protocols.length, 'hospital SOP')}…`;
    default:
      return `Analyzing ${plural(n, 'encounter')}…`;
  }
};

// -------------------------------------------------------------
// Today's patient list (design: Review / Reports / Follow-up / Waiting)
// -------------------------------------------------------------
export type PatientChip = 'Review' | 'Reports' | 'Follow-up' | 'Waiting' | 'Seen' | 'In consult' | 'Not arrived';

export interface TodayPatientRow {
  patient: Patient;
  chip: PatientChip;
  /** "Ward A • Bed 14 • Day 4" or "09:00 AM • OPD • Token 1". */
  meta: string;
  /** Why the patient is on the list today. */
  reason: string;
  /** Tab to open when the row is tapped. */
  defaultTab: CopilotTab;
  sortKey: number;
}

export const todaysPatientsFor = (
  doctorName: string,
  data: { patients: Patient[]; appointments: Appointment[]; labSamples: LabSample[]; radiologyOrders: RadiologyOrder[] }
): TodayPatientRow[] => {
  const t = todayISO();
  const rows = new Map<string, TodayPatientRow>();

  const reportsReason = (pid: string): string | null => {
    const abnormal = data.labSamples.find((s) => s.patientId === pid && s.status === 'Abnormal' && s.date === t);
    if (abnormal) return `${testShort(abnormal.testName)} abnormal today`;
    const processing = data.labSamples.find((s) => s.patientId === pid && s.status === 'Processing');
    if (processing) return `${testShort(processing.testName)} result due`;
    const scan = data.radiologyOrders.find((o) => o.patientId === pid && o.status === 'Reported' && o.date === t);
    if (scan) return `${scan.scanName.split('(')[0].trim()} reported today`;
    return null;
  };

  data.patients
    .filter((p) => p.status === 'Admitted' && p.attendingDoctor === doctorName)
    .forEach((p) => {
      const day = p.admittedOn ? Math.max(1, 1 - daysFromToday(p.admittedOn)) : null;
      rows.set(p.id, {
        patient: p,
        chip: 'Review',
        meta: [p.room, day ? `Day ${day}` : null].filter(Boolean).join(' • '),
        reason: reportsReason(p.id) ?? 'Ward round',
        defaultTab: 'Summarize',
        sortKey: -1,
      });
    });

  data.appointments
    .filter((a) => a.date === t && a.doctorName === doctorName && a.status !== 'Cancelled')
    .sort((a, b) => clockToMinutes(a.time) - clockToMinutes(b.time))
    .forEach((a) => {
      if (rows.has(a.patientId)) return;
      const p = data.patients.find((x) => x.id === a.patientId);
      if (!p) return;
      const reports = reportsReason(p.id);
      let chip: PatientChip;
      if (a.status === 'Completed') chip = 'Seen';
      else if (a.status === 'In Consultation') chip = 'In consult';
      else if (reports) chip = 'Reports';
      else if (a.type === 'Follow Up') chip = 'Follow-up';
      else if (a.status === 'Not Arrived') chip = 'Not arrived';
      else chip = 'Waiting';
      rows.set(p.id, {
        patient: p,
        chip,
        meta: `${a.time} • ${a.type === 'Follow Up' ? 'Follow-up' : a.type} • Token ${a.tokenNo}`,
        reason: reports ?? a.reason ?? a.department,
        defaultTab: chip === 'Reports' ? 'Reports' : 'Summarize',
        sortKey: clockToMinutes(a.time),
      });
    });

  return [...rows.values()].sort((a, b) => a.sortKey - b.sortKey || a.patient.name.localeCompare(b.patient.name));
};

// -------------------------------------------------------------
// SOAP draft (restates documented facts only — new clinical actions
// come from Clinical Insights and need explicit acceptance)
// -------------------------------------------------------------
export interface SoapNote {
  S: string;
  O: string;
  A: string;
  P: string;
}

export const SOAP_KEYS: Array<keyof SoapNote> = ['S', 'O', 'A', 'P'];

export const EMPTY_SOAP: SoapNote = { S: '', O: '', A: '', P: '' };

export const soapIsEmpty = (n: SoapNote) => SOAP_KEYS.every((k) => !n[k].trim());

export const soapToText = (n: SoapNote) =>
  SOAP_KEYS.filter((k) => n[k].trim())
    .map((k) => `${k}: ${n[k].trim()}`)
    .join('\n');

const STOP_WORDS = new Set(['stage', 'grade', 'right', 'lower', 'upper', 'acute', 'chronic', 'severe', 'recent', 'known', 'score', 'admitted', 'suspected']);

const keyWords = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOP_WORDS.has(w))
    .slice(0, 4);

const sameProblem = (a: string, b: string) => {
  const wa = keyWords(a);
  return keyWords(b).some((w) => wa.includes(w));
};

const allergyPrecaution = (allergies: string[]) => {
  const text = allergies.join(' ').toLowerCase();
  if (/penicillin|beta-lactam|amoxicillin/.test(text)) return 'avoid penicillin / beta-lactam antibiotics';
  if (/nsaid|ibuprofen|diclofenac|aspirin/.test(text)) return 'avoid NSAIDs — use paracetamol for analgesia';
  if (/sulfa|sulph/.test(text)) return 'avoid sulfonamides (e.g. cotrimoxazole)';
  if (/contrast/.test(text)) return 'non-contrast imaging only, or premedicate per radiology SOP';
  return 'avoid documented allergens';
};

export const buildSoapDraft = (ctx: PatientContext): SoapNote => {
  const { patient, profile, vitals, visits, labResults, radiology, appointments } = ctx;

  const s: string[] = [profile?.chiefComplaint ?? visits[0]?.symptoms ?? 'Presenting complaint to be documented.'];
  if (profile?.conditions.length) s.push(`Background: ${profile.conditions.join('; ')}.`);
  s.push(`Current medication: ${profile?.currentMedications.length ? profile.currentMedications.join(', ') : 'none'}.`);
  s.push(`Allergies: ${profile?.allergies.length ? profile.allergies.join(', ') : 'NKDA'}.`);

  const o: string[] = [];
  if (vitals) {
    const when = daysFromToday(vitals.date) === 0 ? vitals.time : `${formatDayMonth(vitals.date)}, ${vitals.time}`;
    o.push(
      `Vitals (${when}): BP ${vitals.bp} mmHg, pulse ${vitals.pulse} bpm, SpO₂ ${vitals.spo2}%, temp ${vitals.temp}°F${
        vitals.respRate ? `, RR ${vitals.respRate}/min` : ''
      }${vitals.sugar ? `, RBS ${vitals.sugar} mg/dL` : ''}.`
    );
    const flags = vitalsFlags(vitals);
    if (flags.length) o.push(`Out of range: ${flags.map((f) => f.label).join(', ')}.`);
  } else {
    o.push('Vitals: not recorded yet.');
  }
  const seen = new Set<string>();
  labResults.forEach((r) => {
    const key = testShort(r.testName);
    if (seen.has(key) || seen.size >= 3) return;
    seen.add(key);
    const abnormal = (r.parameters ?? []).filter((p) => parameterFlag(p));
    o.push(
      `${key} (${dayWord(r.date ?? todayISO())}): ${
        abnormal.length
          ? abnormal.map((p) => `${p.name} ${formatParamValue(p)} ${p.unit} (${parameterFlag(p)})`).join(', ')
          : 'within reference range'
      }.`
    );
  });
  radiology
    .filter((x) => x.status === 'Reported' && x.impression)
    .slice(0, 2)
    .forEach((x) => o.push(`${x.scanName} (${formatDayMonth(x.date)}): ${x.impression}`));

  const problems: string[] = [];
  const recent = visits[0];
  if (recent && daysFromToday(recent.date) >= -30) problems.push(recent.diagnosis);
  (profile?.conditions ?? []).forEach((c) => {
    if (!problems.some((p) => sameProblem(p, c))) problems.push(c);
  });
  const a = problems.slice(0, 3).map((p, i) => `${i + 1}. ${p}`);
  if (!a.length) a.push('1. Assessment pending clinical examination.');
  const worsening = ctx.trends.filter((t) => t.worsening && t.points.length > 1);
  if (worsening.length) {
    a.push(
      `Worsening: ${worsening
        .map((t) => `${t.parameter} ${t.points.map((pt) => trendValue(t.unit, pt.value)).join(' → ')} ${t.unit}`)
        .join('; ')}.`
    );
  }
  if (profile?.riskFlags.length) a.push(`Risk: ${profile.riskFlags[0]}.`);

  const p: string[] = [];
  if (profile?.currentMedications.length) {
    p.push(patient.status === 'Admitted' ? 'Continue current medication; reconcile before discharge.' : 'Continue current medication.');
  }
  const pendingNames = [
    ...pendingLabOrders(ctx).map((x) => `${testShort(x.testName)} (${x.status === 'New' ? 'awaiting sample' : 'processing'})`),
    ...pendingScans(ctx).map((x) => `${x.scanName} (${x.status.toLowerCase()})`),
  ];
  if (pendingNames.length) p.push(`Follow up pending ${pendingNames.join(', ')}.`);
  if (profile?.allergies.length) p.push(`Allergy precaution: ${allergyPrecaution(profile.allergies)}.`);
  if (patient.status === 'Admitted') p.push('Continue in-patient monitoring; reassess on evening round.');
  const next = appointments
    .filter((x) => x.date > todayISO() && x.status !== 'Cancelled' && x.status !== 'Completed')
    .sort((x, y) => (x.date === y.date ? clockToMinutes(x.time) - clockToMinutes(y.time) : x.date < y.date ? -1 : 1))[0];
  if (next) p.push(`Next review: ${relativeDayLabel(next.date)}, ${next.time} with ${next.doctorName}.`);
  if (!p.length) p.push('Plan to be decided after examination.');

  return { S: s.join(' '), O: o.join('\n'), A: a.join('\n'), P: p.map((line) => `• ${line}`).join('\n') };
};

/** A realistic doctor's dictation for "Voice-to-notes", matched to the case. */
export const dictationFor = (ctx: PatientContext): string => {
  const t = textOf(ctx);
  if (/ventilat|copd/.test(t)) return 'Seen on rounds. More awake this morning, tolerating pressure support, secretions reduced. Family updated about the weaning plan.';
  if (/nstemi|chest pain at rest|troponin/.test(t)) return 'No further chest pain since last night. Mild bruising at the injection site. Anxious about the angiogram, counselled.';
  if (/pneumonia/.test(t)) return 'Cough is less but still bringing up yellow sputum. Breathless walking to the washroom. Slept better on oxygen last night.';
  if (/diabet/.test(t)) return 'Increased thirst and passing urine more often at night for two weeks. Missing some evening doses of glimepiride. No blurring of vision.';
  if (/angina|exertional|dyslipid/.test(t)) return 'Chest tightness comes on climbing two flights of stairs and settles with rest in about five minutes. Cough improving.';
  if (/kidney|ckd|hypertens/.test(t)) return 'Headache is better since yesterday. Mild dizziness on standing. No chest pain, passing urine normally.';
  if (/cholecyst|post-op|lap\./.test(t)) return 'Mild pain at the port sites, passing flatus, tolerating soft diet. Walked in the corridor twice today.';
  if (/knee|osteoarthritis|liver/.test(t)) return 'Right knee pain better with rest, stiff in the morning. No abdominal pain or yellowing of eyes. Has stopped alcohol since admission.';
  if (/dengue/.test(t)) return 'Feeling much better, appetite is back, no fever for five days. No bleeding spots or gum bleeding.';
  if (/rash|dermatitis|itch/.test(t)) return 'Itching is worse at night and the rash has spread to both elbows. Using the emollient twice a day.';
  if (/fever/.test(t)) return 'Fever came back yesterday evening, around 100 degrees, with body ache. No rash or bleeding gums. Eating less but drinking fluids well.';
  return 'Feeling better since the last visit. No new complaints. Taking medicines regularly.';
};

// -------------------------------------------------------------
// Clinical insights (decision support — not a diagnosis)
// -------------------------------------------------------------
export type InsightAction =
  | { kind: 'order-lab'; testIds: string[]; label: string }
  | { kind: 'order-scan'; scanId: string; label: string }
  | { kind: 'add-plan'; label: string }
  | { kind: 'safer-alternative'; reviewId: string; label: string }
  | { kind: 'call'; phone: string; label: string }
  | { kind: 'open'; route: string; params?: Record<string, string>; label: string };

export interface Insight {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  evidence: string;
  steps: string[];
  citations: AiCitation[];
  action: InsightAction;
  /** Line added to the draft note's Plan when accepted. */
  planLine: string;
}

const ADD_TO_PLAN: InsightAction = { kind: 'add-plan', label: 'Add to plan' };

export const buildInsights = (ctx: PatientContext): Insight[] => {
  const out: Insight[] = [];
  const { patient, profile, vitals } = ctx;
  const text = textOf(ctx);
  const meds = profile?.currentMedications ?? [];
  const onMed = (re: RegExp) => meds.some((m) => re.test(m.toLowerCase()));
  const proto = (id: string) => ctx.protocols.find((p) => p.id === id);
  const sop = (id: string): AiCitation[] => {
    const p = proto(id);
    return p ? [{ label: `SOP ${id}`, detail: p.title }] : [];
  };
  const steps = (id: string, pick?: number[]) => {
    const all = proto(id)?.keySteps ?? [];
    return (pick ? pick.map((i) => all[i]).filter(Boolean) : all).map(stripStep);
  };
  const lis = (sample: LabSample): AiCitation => ({ label: `LIS ${sample.sampleCode}`, detail: `${testShort(sample.testName)} • ${relativeDayLabel(sample.date ?? todayISO())}` });
  const chart = vitals ? [{ label: 'Nursing chart', detail: `${vitals.recordedBy} • ${recordedAgo(vitals.date, vitals.time)}` }] : [];

  // 1. Flagged prescriptions awaiting review
  ctx.prescriptions
    .filter((rx) => rx.safetyStatus !== 'Safe' && rx.status !== 'Dispensed')
    .forEach((rx) => {
      out.push({
        id: `rx-${rx.id}`,
        severity: 'critical',
        category: 'Medication safety',
        title: `${rx.safetyStatus === 'Allergy Warning' ? 'Allergy conflict' : 'Drug interaction'} in ${rx.prescriptionCode}`,
        evidence: `${rx.allergyAlert ?? rx.interactionAlert ?? 'Flagged by the safety engine.'} Prescribed by ${rx.doctorName}: ${rx.drugs.join(', ')}.`,
        steps: rx.alternativeSuggestion ? [rx.alternativeSuggestion] : ['Review the prescription with the pharmacist.'],
        citations: [{ label: `Safety engine • ${rx.prescriptionCode}`, detail: rx.safetyStatus }, { label: 'Pharmacy review queue', detail: rx.status }],
        action: rx.alternativeSuggestion ? { kind: 'safer-alternative', reviewId: rx.id, label: 'Apply safer alternative' } : ADD_TO_PLAN,
        planLine: `Medication change (${rx.prescriptionCode}): ${rx.alternativeSuggestion ?? 'flagged prescription reviewed with pharmacy'}.`,
      });
    });

  // 2. Glycaemic control (SOP proto-3)
  const hba1c = latestParam(ctx, 'HbA1c');
  if (hba1c && hba1c.param.value >= 9) {
    const tr = trendFor(ctx, 'HbA1c');
    const prev = tr ? tr.points[tr.points.length - 2] : undefined;
    out.push({
      id: 'hba1c',
      severity: hba1c.param.value >= 10 ? 'critical' : 'warning',
      category: 'Glycaemic control',
      title: `Glycaemic control inadequate — HbA1c ${hba1c.param.value}%`,
      evidence: `Latest HbA1c ${hba1c.param.value}% (${dayWord(hba1c.sample.date ?? todayISO())}; target < 7%)${
        prev ? `, up from ${prev.value}% on ${formatDayMonth(prev.date)}` : ''
      }. ${meds.length ? `On ${meds.filter((m) => /metformin|glimepiride|insulin|sitagliptin|gliclazide/i.test(m)).join(', ') || 'no glucose-lowering drugs'}.` : ''}`.trim(),
      steps: steps('proto-3'),
      citations: [...sop('proto-3'), lis(hba1c.sample)],
      action: ADD_TO_PLAN,
      planLine: 'Intensify glycaemic therapy per SOP proto-3 (review Metformin/Glimepiride, consider basal insulin); dietitian referral; repeat HbA1c in 3 months.',
    });
  }

  // 3. Diabetic on metformin without renal function on file
  if (/diabet/.test(text) && onMed(/metformin/) && !latestParam(ctx, 'eGFR')) {
    const pending = hasPendingTest(ctx, /kft|kidney/i);
    out.push({
      id: 'renal-before-metformin',
      severity: 'info',
      category: 'Renal safety',
      title: 'Renal function not on file',
      evidence: 'On Metformin with no eGFR or creatinine in CareSync. SOP proto-3 stops Metformin when eGFR < 30.',
      steps: steps('proto-3', [1]),
      citations: [...sop('proto-3'), { label: 'Clinical rules engine', detail: 'RENAL-DOSE' }],
      action: pending ? ADD_TO_PLAN : { kind: 'order-lab', testIds: ['lab-3'], label: 'Order KFT' },
      planLine: 'Check KFT (eGFR) before Metformin titration.',
    });
  }
  if (/diabet/.test(text) && !latestParam(ctx, 'LDL') && !latestParam(ctx, 'Total Cholesterol')) {
    const pending = hasPendingTest(ctx, /lipid/i);
    out.push({
      id: 'lipids-diabetic',
      severity: 'info',
      category: 'Cardiovascular risk',
      title: 'Lipid profile due',
      evidence: 'Type 2 diabetes with no lipid profile on record — cardiovascular risk assessment is incomplete.',
      steps: ['Fasting lipid profile', 'Start or intensify statin if LDL is above target'],
      citations: [{ label: 'CDSS • diabetes care bundle' }, { label: `EMR • ${patient.uhid}`, detail: 'Problem list + LIS' }],
      action: pending ? ADD_TO_PLAN : { kind: 'order-lab', testIds: ['lab-6'], label: 'Order lipid profile' },
      planLine: 'Fasting lipid profile for cardiovascular risk assessment.',
    });
  }

  // 4. Rising leukocytosis on antibiotics (SOP proto-2)
  const tlc = trendFor(ctx, 'TLC');
  const antibiotics = meds.filter((m) => /ceftriaxone|azithro|piperacillin|amoxi|cipro|clarithro|meropenem|clindamycin/i.test(m));
  if (tlc && tlc.direction === 'up' && tlc.points[tlc.points.length - 1].flag === 'H' && (antibiotics.length || /pneumonia|infect|sepsis/.test(text))) {
    const latest = latestParam(ctx, 'TLC');
    const day = patient.admittedOn ? 1 - daysFromToday(patient.admittedOn) : null;
    out.push({
      id: 'tlc-rising',
      severity: 'warning',
      category: 'Antibiotic stewardship',
      title: 'Leukocytosis rising on antibiotics',
      evidence: `TLC ${tlc.points.map((pt) => trendValue(tlc.unit, pt.value)).join(' → ')} /mcL${day ? ` by day ${day}` : ''}${
        antibiotics.length ? ` on ${antibiotics.map((a) => a.replace(/^Inj\.\s*/i, '')).join(' + ')}` : ''
      }.`,
      steps: steps('proto-2'),
      citations: [...sop('proto-2'), ...(latest ? [lis(latest.sample)] : [])],
      action: hasPendingTest(ctx, /culture/i) ? ADD_TO_PLAN : { kind: 'order-lab', testIds: ['lab-9'], label: 'Order blood culture' },
      planLine: 'Blood culture & sensitivity before escalating antibiotics; de-escalation review at 48 h (SOP proto-2).',
    });
  }

  // 5. Hypoxaemia in pneumonia → repeat chest X-ray
  if (vitals && vitals.spo2 < 95 && /pneumonia/.test(text)) {
    const lastCxr = ctx.radiology.find((o) => /chest/i.test(o.scanName) && o.status === 'Reported');
    const pendingCxr = pendingScans(ctx).some((o) => /chest/i.test(o.scanName));
    out.push({
      id: 'cxr-repeat',
      severity: 'warning',
      category: 'Respiratory',
      title: `SpO₂ ${vitals.spo2}% on current support`,
      evidence: `SpO₂ ${vitals.spo2}%${vitals.respRate ? `, RR ${vitals.respRate}/min` : ''} (${recordedAgo(vitals.date, vitals.time)}).${
        lastCxr ? ` Last chest X-ray ${formatDayMonth(lastCxr.date)}: ${lastCxr.impression}` : ''
      }`,
      steps: ['Repeat chest X-ray to assess progression', 'Titrate O₂ to SpO₂ ≥ 94%', 'qSOFA sepsis screen if RR ≥ 22 or SBP ≤ 100'],
      citations: [...chart, ...(lastCxr ? [{ label: 'RIS • chest X-ray', detail: formatDayMonth(lastCxr.date) }] : []), ...sop('proto-1')],
      action: pendingCxr ? ADD_TO_PLAN : { kind: 'order-scan', scanId: 'rad-1', label: 'Order chest X-ray' },
      planLine: 'Repeat chest X-ray today; titrate O₂ to SpO₂ ≥ 94%; qSOFA screen each shift.',
    });
  }

  // 6. Acute coronary syndrome bundle (SOP proto-4)
  if (/\bn?stemi\b|acute coronary|myocardial/.test(text)) {
    const tick = (ok: boolean) => (ok ? '✓' : '✗');
    const tropPending = hasPendingTest(ctx, /troponin/i);
    out.push({
      id: 'acs-bundle',
      severity: 'warning',
      category: 'Cardiology',
      title: 'NSTEMI — ACS bundle check',
      evidence: `Aspirin ${tick(onMed(/aspirin/))} • P2Y12 ${tick(onMed(/clopidogrel|ticagrelor|prasugrel/))} • High-intensity statin ${tick(
        onMed(/atorvastatin (40|80)|rosuvastatin (20|40)/)
      )} • Anticoagulation ${tick(onMed(/enoxaparin|heparin|fondaparinux/))}.${tropPending ? ' Repeat Troponin I is being processed.' : ''}${
        profile?.riskFlags.find((f) => /bleed/i.test(f)) ? ` ${profile.riskFlags.find((f) => /bleed/i.test(f))}.` : ''
      }`,
      steps: steps('proto-4'),
      citations: [...sop('proto-4'), { label: `EMR • ${ctx.visits.length} encounters`, detail: ctx.visits[0]?.diagnosis }],
      action: tropPending ? ADD_TO_PLAN : { kind: 'order-lab', testIds: ['lab-11'], label: 'Order repeat Troponin' },
      planLine: 'Trend Troponin I at 6 h; continue DAPT + high-intensity statin; plan coronary angiography; monitor for bleeding on DAPT + LMWH (SOP proto-4).',
    });
  }

  // 7. COPD / ventilator weaning (SOP proto-6)
  if (/copd|ventilator/.test(text)) {
    const ventDay = /ventilator day (\d+)/i.exec(`${profile?.chiefComplaint ?? ''} ${(profile?.riskFlags ?? []).join(' ')}`)?.[1];
    out.push({
      id: 'copd-weaning',
      severity: 'warning',
      category: 'Respiratory',
      title: ventDay ? `Ventilator day ${ventDay} — daily SAT/SBT due` : 'COPD exacerbation bundle',
      evidence: `${vitals ? `SpO₂ ${vitals.spo2}% (target 88–92%)` : 'No recent SpO₂'}${
        onMed(/methylprednisolone|prednisolone|hydrocortisone/) ? '; on systemic steroids' : ''
      }${(profile?.allergies ?? []).some((a) => /contrast/i.test(a)) ? '; iodinated contrast allergy — non-contrast imaging only' : ''}.`,
      steps: steps('proto-6'),
      citations: [...sop('proto-6'), ...chart],
      action: ADD_TO_PLAN,
      planLine: 'Daily SAT/SBT; titrate O₂ to SpO₂ 88–92%; ABG 1 h after changes; systemic steroids × 5 days (SOP proto-6).',
    });
  }

  // 8. Dengue follow-up (SOP proto-5)
  if (/dengue/.test(text)) {
    const plt = latestParam(ctx, 'Platelets');
    const pendingCbc = hasPendingTest(ctx, /cbc|blood count/i);
    out.push({
      id: 'dengue-platelets',
      severity: plt && plt.param.value < 100000 ? 'critical' : 'info',
      category: 'Infection',
      title: 'Post-dengue platelet recovery check',
      evidence: `${
        plt
          ? `Platelets ${formatParamValue(plt.param)} (${dayWord(plt.sample.date ?? todayISO())}; normal ≥ 1.5 L).`
          : 'No platelet count on record since the dengue episode.'
      }${pendingCbc ? ' Repeat CBC ordered — awaiting sample.' : ''}`,
      steps: steps('proto-5', [2, 3]),
      citations: [...sop('proto-5'), ...(plt ? [lis(plt.sample)] : [])],
      action: pendingCbc ? ADD_TO_PLAN : { kind: 'order-lab', testIds: ['lab-1'], label: 'Order CBC' },
      planLine: 'Repeat CBC for platelet recovery; warning-sign counselling; avoid NSAIDs & IM injections (SOP proto-5).',
    });
  }

  // 9. Fever without a dengue work-up
  const recentNs1 = ctx.labOrders.some((s) => /dengue/i.test(s.testName) && daysFromToday(s.date ?? '') >= -7);
  if (vitals && vitals.temp >= 100.4 && !/dengue|pneumonia/.test(text) && /fever/.test(text)) {
    out.push({
      id: 'fever-workup',
      severity: 'warning',
      category: 'Infection',
      title: 'Recurrent fever — rule out dengue & malaria',
      evidence: `Temp ${vitals.temp}°F (${recordedAgo(vitals.date, vitals.time)}). ${profile?.riskFlags[0] ? `${profile.riskFlags[0]}.` : ''}`.trim(),
      steps: steps('proto-5', [0, 3]),
      citations: [...sop('proto-5'), ...chart],
      action: recentNs1 ? ADD_TO_PLAN : { kind: 'order-lab', testIds: ['lab-8', 'lab-10'], label: 'Order NS1 + smear' },
      planLine: 'Dengue NS1 antigen + peripheral smear; paracetamol for fever, avoid NSAIDs (SOP proto-5).',
    });
  }

  // 10. Renal dosing
  const egfr = latestParam(ctx, 'eGFR');
  if (egfr && egfr.param.value < 60) {
    const tr = trendFor(ctx, 'eGFR');
    const prev = tr ? tr.points[tr.points.length - 2] : undefined;
    const cr = latestParam(ctx, 'Creatinine');
    out.push({
      id: 'renal-dosing',
      severity: egfr.param.value < 30 ? 'critical' : 'warning',
      category: 'Renal dosing',
      title: `Renal dose adjustment — eGFR ${egfr.param.value}`,
      evidence: `eGFR ${egfr.param.value} mL/min${prev ? ` (↓ from ${prev.value} on ${formatDayMonth(prev.date)})` : ''}${
        cr ? `; creatinine ${cr.param.value} mg/dL` : ''
      }.`,
      steps: ['Avoid NSAIDs and other nephrotoxins', 'Dose-adjust renally cleared drugs (Metformin, Ciprofloxacin)', 'Potassium within 72 h on ARB / ACE-inhibitor', 'Repeat KFT in 48–72 h'],
      citations: [{ label: 'Clinical rules engine', detail: 'RENAL-DOSE • DDI-052' }, lis(egfr.sample)],
      action: ADD_TO_PLAN,
      planLine: `Renal dosing review (eGFR ${egfr.param.value}); avoid NSAIDs; potassium in 72 h; repeat KFT in 48–72 h.`,
    });
  }

  // 11. Hepatic caution
  const alt = latestParam(ctx, 'ALT');
  if (alt && parameterFlag(alt.param) === 'H') {
    const tr = trendFor(ctx, 'ALT');
    const prev = tr ? tr.points[tr.points.length - 2] : undefined;
    const ast = latestParam(ctx, 'AST');
    out.push({
      id: 'hepatic',
      severity: 'warning',
      category: 'Hepatic safety',
      title: `Transaminitis — ALT ${alt.param.value} U/L`,
      evidence: `ALT ${alt.param.value} U/L${prev ? ` (↑ from ${prev.value} on ${formatDayMonth(prev.date)})` : ''}${
        ast ? `, AST ${ast.param.value} U/L` : ''
      }.${/fatty liver/.test(text) ? ' Known NAFLD.' : ''}`,
      steps: ['Avoid hepatotoxic drugs (isoniazid, methotrexate, ketoconazole, valproate)', 'Cap paracetamol at 2 g/day', 'Repeat LFT in 1 week; hepatology opinion if rising'],
      citations: [{ label: 'Clinical rules engine', detail: 'HEP-CAUTION' }, lis(alt.sample)],
      action: ADD_TO_PLAN,
      planLine: `Hepatic precautions (ALT ${alt.param.value}): avoid hepatotoxic drugs, paracetamol ≤ 2 g/day; repeat LFT in 1 week.`,
    });
  }

  // 12. Blood pressure above target
  const bpFlag = vitals ? vitalsFlags(vitals).find((f) => f.field === 'bp') : undefined;
  if (vitals && bpFlag) {
    const earlier = ctx.vitalsHistory.find((v) => v.id !== vitals.id);
    out.push({
      id: 'bp-control',
      severity: bpFlag.severity,
      category: 'Blood pressure',
      title: `BP ${vitals.bp} — above target`,
      evidence: `BP ${vitals.bp} mmHg (${recordedAgo(vitals.date, vitals.time)})${
        earlier ? `, from ${earlier.bp} on ${formatDayMonth(earlier.date)}` : ''
      }${meds.length ? `; on ${meds.filter((m) => /amlodipine|telmisartan|losartan|ramipril|enalapril|metoprolol/i.test(m)).join(', ') || 'no antihypertensives'}` : ''}.`,
      steps: ['Uptitrate antihypertensive therapy', 'Target < 130/80 mmHg with CKD or diabetes', 'Recheck BP 4-hourly; home BP log at discharge'],
      citations: [...chart, { label: 'CDSS • hypertension guideline' }],
      action: ADD_TO_PLAN,
      planLine: `BP above target (${vitals.bp}): uptitrate antihypertensives; 4-hourly BP; target < 130/80.`,
    });
  }

  // 13. Missed follow-up today
  const missed = ctx.appointments.find((a) => a.date === todayISO() && a.type === 'Follow Up' && a.status === 'Not Arrived');
  if (missed) {
    out.push({
      id: 'missed-followup',
      severity: 'warning',
      category: 'Follow-up',
      title: 'Follow-up missed today',
      evidence: `${missed.reason ?? missed.department} • ${missed.time} with ${missed.doctorName} — patient has not arrived.`,
      steps: ['Call the patient and reschedule', 'Keep pending orders active'],
      citations: [{ label: `Appointments • Token ${missed.tokenNo}`, detail: missed.time }],
      action: { kind: 'call', phone: patient.phone, label: 'Call patient' },
      planLine: 'Did not attend follow-up — contacted to reschedule.',
    });
  }

  // 14. Post-operative discharge (SOP proto-7)
  if (/cholecystectomy|post-op|post-operative|laparoscopic/.test(text) && /discharge/.test(text)) {
    const billFlag = profile?.riskFlags.find((f) => /pending|balance|bill/i.test(f));
    out.push({
      id: 'postop-discharge',
      severity: 'info',
      category: 'Discharge',
      title: 'Post-op discharge checklist',
      evidence: `${profile?.chiefComplaint ?? 'Post-operative recovery.'}${billFlag ? ` ${billFlag}.` : ''}`,
      steps: steps('proto-7'),
      citations: [...sop('proto-7'), { label: `EMR • ${patient.uhid}`, detail: ctx.visits[0]?.diagnosis }],
      action: { kind: 'open', route: '/discharge-summary', params: { patientId: patient.id }, label: 'Open discharge summary' },
      planLine: 'Post-op discharge per SOP proto-7: afebrile > 24 h, wound documented, pharmacist reconciliation, final bill / TPA cleared before gate pass.',
    });
  }

  const order = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
};

// -------------------------------------------------------------
// Protocol relevance
// -------------------------------------------------------------
const PROTOCOL_HINTS: Array<[RegExp, string]> = [
  [/sepsis|septic|qsofa/, 'proto-1'],
  [/pneumonia|infect|cellulitis|ceftriaxone|piperacillin|antibiotic/, 'proto-2'],
  [/diabet|hba1c|metformin|insulin/, 'proto-3'],
  [/\bn?stemi\b|acute coronary|angina|chest pain|troponin/, 'proto-4'],
  [/dengue|\bplatelets?\b|thrombocytopenia/, 'proto-5'],
  [/copd|ventilat|respiratory failure|bipap/, 'proto-6'],
  [/cholecystectomy|post-op|post-operative|surgical|laparoscopic/, 'proto-7'],
];

/** Protocol keywords too generic to imply relevance on their own ("discharged 4 days ago" isn't post-op). */
const GENERIC_KEYWORDS = new Set(['discharge', 'checklist', 'surgery', 'cardiac', 'management', 'shock', 'mi']);

/** Protocol ids that match the patient's problem list, complaint, risk flags or medication. */
export const relevantProtocolIds = (ctx: PatientContext): string[] => {
  const text = textOf(ctx);
  const ids = new Set<string>();
  PROTOCOL_HINTS.forEach(([re, id]) => {
    if (re.test(text)) ids.add(id);
  });
  // Undifferentiated fever → the dengue / febrile-illness SOP (not once pneumonia or sepsis explains it).
  if (/fever/.test(text) && !/pneumonia|sepsis|infect|copd/.test(text)) ids.add('proto-5');
  ctx.protocols.forEach((p) => {
    if ((p.keywords ?? []).some((k) => k.length > 3 && !GENERIC_KEYWORDS.has(k) && new RegExp(`\\b${k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`).test(text))) ids.add(p.id);
  });
  return ctx.protocols.filter((p) => ids.has(p.id)).map((p) => p.id);
};

/** Every word of the query must appear in the protocol's title, description, keywords or category. */
export const protocolMatches = (p: HospitalProtocol, query: string) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${p.title} ${p.description} ${(p.keywords ?? []).join(' ')} ${p.category} ${p.keySteps.join(' ')}`.toLowerCase();
  return words.every((w) => hay.includes(w));
};
