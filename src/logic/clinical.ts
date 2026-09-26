import type {
  Appointment,
  ClinicalProfile,
  LabParameter,
  LabSample,
  Patient,
  PrescriptionReviewItem,
  VitalsRecord,
  Visit,
} from '../data/mockData';
import { daysFromToday, formatDayMonth, todayISO } from '../utils/dates';

// -------------------------------------------------------------
// Vitals
// -------------------------------------------------------------
export interface VitalFlag {
  field: 'bp' | 'pulse' | 'spo2' | 'temp' | 'respRate' | 'sugar';
  label: string;
  severity: 'critical' | 'warning';
}

export const parseBp = (bp: string): { sys: number; dia: number } | null => {
  const m = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(bp.trim());
  return m ? { sys: Number(m[1]), dia: Number(m[2]) } : null;
};

/** Out-of-range vitals, using adult ward early-warning thresholds. */
export const vitalsFlags = (v: Pick<VitalsRecord, 'bp' | 'pulse' | 'spo2' | 'temp' | 'respRate' | 'sugar'>): VitalFlag[] => {
  const flags: VitalFlag[] = [];
  const bp = parseBp(v.bp);
  if (bp) {
    if (bp.sys >= 180 || bp.dia >= 110) flags.push({ field: 'bp', label: `BP ${v.bp} (hypertensive urgency)`, severity: 'critical' });
    else if (bp.sys >= 140 || bp.dia >= 90) flags.push({ field: 'bp', label: `BP ${v.bp} (high)`, severity: 'warning' });
    else if (bp.sys < 90) flags.push({ field: 'bp', label: `BP ${v.bp} (hypotension)`, severity: 'critical' });
  }
  if (v.pulse >= 130 || v.pulse < 45) flags.push({ field: 'pulse', label: `Pulse ${v.pulse} bpm`, severity: 'critical' });
  else if (v.pulse > 100 || v.pulse < 55) flags.push({ field: 'pulse', label: `Pulse ${v.pulse} bpm`, severity: 'warning' });
  if (v.spo2 < 90) flags.push({ field: 'spo2', label: `SpO₂ ${v.spo2}%`, severity: 'critical' });
  else if (v.spo2 < 95) flags.push({ field: 'spo2', label: `SpO₂ ${v.spo2}%`, severity: 'warning' });
  if (v.temp >= 103 || v.temp < 95) flags.push({ field: 'temp', label: `Temp ${v.temp}°F`, severity: 'critical' });
  else if (v.temp >= 100.4) flags.push({ field: 'temp', label: `Temp ${v.temp}°F (fever)`, severity: 'warning' });
  if (typeof v.respRate === 'number') {
    if (v.respRate >= 30 || v.respRate < 8) flags.push({ field: 'respRate', label: `RR ${v.respRate}/min`, severity: 'critical' });
    else if (v.respRate > 20) flags.push({ field: 'respRate', label: `RR ${v.respRate}/min`, severity: 'warning' });
  }
  if (typeof v.sugar === 'number') {
    if (v.sugar >= 300 || v.sugar < 60) flags.push({ field: 'sugar', label: `Glucose ${v.sugar} mg/dL`, severity: 'critical' });
    else if (v.sugar >= 180) flags.push({ field: 'sugar', label: `Glucose ${v.sugar} mg/dL`, severity: 'warning' });
  }
  return flags;
};

export const latestVitals = (vitals: VitalsRecord[], patientId: string): VitalsRecord | undefined =>
  vitals
    .filter((v) => v.patientId === patientId)
    .sort((a, b) => (a.date === b.date ? toMinutes(b.time) - toMinutes(a.time) : a.date < b.date ? 1 : -1))[0];

const toMinutes = (clock: string) => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock.trim());
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
};

// -------------------------------------------------------------
// Labs
// -------------------------------------------------------------
export type ParamFlag = 'H' | 'L' | null;

export const parameterFlag = (p: LabParameter): ParamFlag => {
  if (typeof p.high === 'number' && p.value > p.high) return 'H';
  if (typeof p.low === 'number' && p.value < p.low) return 'L';
  return null;
};

export const isAbnormal = (params: LabParameter[]) => params.some((p) => parameterFlag(p) !== null);

export const formatParamValue = (p: LabParameter) => {
  if (p.unit === '/mcL' && p.value >= 100000) return `${(p.value / 100000).toFixed(2)} L`;
  if (p.value >= 1000) return p.value.toLocaleString('en-IN');
  return String(p.value);
};

export const referenceText = (p: LabParameter) => {
  if (typeof p.low === 'number' && typeof p.high === 'number') return `${p.low}–${p.high}`;
  if (typeof p.high === 'number') return `< ${p.high}`;
  if (typeof p.low === 'number') return `> ${p.low}`;
  return '—';
};

/** One-line result summary from structured parameters. */
export const resultSummary = (params: LabParameter[]) =>
  params
    .map((p) => {
      const f = parameterFlag(p);
      return `${p.name}: ${formatParamValue(p)} ${p.unit}${f === 'H' ? ' (High)' : f === 'L' ? ' (Low)' : ''}`;
    })
    .join(' • ');

/** Completed/abnormal results for a patient, newest first. */
export const resultsForPatient = (samples: LabSample[], patientId: string) =>
  samples
    .filter((s) => s.patientId === patientId && (s.status === 'Completed' || s.status === 'Abnormal') && s.parameters?.length)
    .sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1));

const testKey = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('cbc') || n.includes('blood count')) return 'cbc';
  if (n.includes('lft') || n.includes('liver')) return 'lft';
  if (n.includes('kft') || n.includes('kidney')) return 'kft';
  if (n.includes('hba1c')) return 'hba1c';
  if (n.includes('lipid')) return 'lipid';
  if (n.includes('thyroid')) return 'thyroid';
  return n;
};

export interface LabTrend {
  test: string;
  parameter: string;
  unit: string;
  points: Array<{ date: string; value: number; flag: ParamFlag }>;
  /** Latest minus previous. */
  delta: number | null;
  direction: 'up' | 'down' | 'flat' | null;
  /** True when the change moves further out of range. */
  worsening: boolean;
}

/** Per-parameter trends across all of a patient's results for the same test. */
export const labTrends = (samples: LabSample[], patientId: string): LabTrend[] => {
  const results = resultsForPatient(samples, patientId).slice().reverse(); // oldest → newest
  const byTest = new Map<string, LabSample[]>();
  results.forEach((s) => {
    const k = testKey(s.testName);
    byTest.set(k, [...(byTest.get(k) ?? []), s]);
  });
  const trends: LabTrend[] = [];
  byTest.forEach((list) => {
    const paramNames = list[list.length - 1].parameters!.map((p) => p.name);
    paramNames.forEach((name) => {
      const points = list
        .map((s) => {
          const p = s.parameters!.find((x) => x.name === name);
          return p ? { date: s.date ?? '', value: p.value, flag: parameterFlag(p), ref: p } : null;
        })
        .filter(Boolean) as Array<{ date: string; value: number; flag: ParamFlag; ref: LabParameter }>;
      if (!points.length) return;
      const last = points[points.length - 1];
      const prev = points.length > 1 ? points[points.length - 2] : null;
      const delta = prev ? Math.round((last.value - prev.value) * 100) / 100 : null;
      const direction = delta === null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
      const worsening =
        delta !== null &&
        ((last.flag === 'H' && delta > 0) || (last.flag === 'L' && delta < 0));
      trends.push({
        test: list[list.length - 1].testName,
        parameter: name,
        unit: last.ref.unit,
        points: points.map(({ date, value, flag }) => ({ date, value, flag })),
        delta,
        direction,
        worsening,
      });
    });
  });
  return trends;
};

// -------------------------------------------------------------
// AI alerts & copilot stats
// -------------------------------------------------------------
export interface AiAlert {
  id: string;
  patientId: string;
  patientName: string;
  severity: 'critical' | 'warning' | 'info';
  kind: 'Abnormal lab' | 'Prescription safety' | 'Follow-up due' | 'Vitals' | 'Risk flag';
  title: string;
  detail: string;
  source: string;
  route: string;
  params?: Record<string, string>;
}

interface AlertInputs {
  patients: Patient[];
  labSamples: LabSample[];
  prescriptionReviews: PrescriptionReviewItem[];
  vitals: VitalsRecord[];
  appointments: Appointment[];
  visits: Visit[];
}

export const buildAiAlerts = ({ patients, labSamples, prescriptionReviews, vitals, appointments }: AlertInputs): AiAlert[] => {
  const alerts: AiAlert[] = [];
  const today = todayISO();
  const nameOf = (id?: string) => patients.find((p) => p.id === id)?.name ?? 'Unknown patient';

  labSamples
    .filter((s) => s.status === 'Abnormal' && s.date === today)
    .forEach((s) => {
      alerts.push({
        id: `al-lab-${s.id}`,
        patientId: s.patientId ?? '',
        patientName: s.patientName,
        severity: /critical|> ?10|declining|rising/i.test(s.flag ?? '') ? 'critical' : 'warning',
        kind: 'Abnormal lab',
        title: `${s.testName.split('(')[0].trim()} abnormal`,
        detail: s.flag ?? s.resultValue ?? 'Out of reference range',
        source: `LIS ${s.sampleCode} • ${s.collectedAt}`,
        route: '/doctor-copilot',
        params: { patientId: s.patientId ?? '', tab: 'Reports' },
      });
    });

  prescriptionReviews
    .filter((rx) => rx.status === 'Pending Review' && rx.safetyStatus !== 'Safe')
    .forEach((rx) => {
      alerts.push({
        id: `al-rx-${rx.id}`,
        patientId: rx.patientId ?? '',
        patientName: rx.patientName,
        severity: 'critical',
        kind: 'Prescription safety',
        title: rx.safetyStatus,
        detail: rx.interactionAlert ?? rx.allergyAlert ?? 'Safety review pending',
        source: `Safety engine • ${rx.prescriptionCode}`,
        route: '/pharmacy-review',
      });
    });

  patients
    .filter((p) => p.status === 'Admitted')
    .forEach((p) => {
      const v = latestVitals(vitals, p.id);
      if (!v) return;
      const flags = vitalsFlags(v);
      if (flags.length) {
        alerts.push({
          id: `al-vit-${v.id}`,
          patientId: p.id,
          patientName: p.name,
          severity: flags.some((f) => f.severity === 'critical') ? 'critical' : 'warning',
          kind: 'Vitals',
          title: 'Vitals out of range',
          detail: flags.map((f) => f.label).join(' • '),
          source: `Nursing chart • ${v.time} • ${v.recordedBy}`,
          route: '/doctor-copilot',
          params: { patientId: p.id, tab: 'Summarize' },
        });
      }
    });

  appointments
    .filter((a) => a.type === 'Follow Up' && (a.status === 'Not Arrived' || (daysFromToday(a.date) >= 0 && daysFromToday(a.date) <= 1)))
    .forEach((a) => {
      alerts.push({
        id: `al-fu-${a.id}`,
        patientId: a.patientId,
        patientName: nameOf(a.patientId),
        severity: a.status === 'Not Arrived' ? 'warning' : 'info',
        kind: 'Follow-up due',
        title: a.status === 'Not Arrived' ? 'Follow-up missed today' : `Follow-up ${daysFromToday(a.date) === 0 ? 'today' : 'tomorrow'}`,
        detail: `${a.reason ?? a.department} • ${a.time}${daysFromToday(a.date) ? ` • ${formatDayMonth(a.date)}` : ''}`,
        source: `Appointments • Token ${a.tokenNo}`,
        route: '/appointments',
      });
    });

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
};

// -------------------------------------------------------------
// Narrative helpers used by the copilot & AI engine
// -------------------------------------------------------------
export const patientSummaryLines = (
  patient: Patient,
  profile: ClinicalProfile | undefined,
  visits: Visit[],
  samples: LabSample[]
): Array<{ label: string; text: string }> => {
  const own = visits.filter((v) => v.patientId === patient.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastVisit = own[0];
  const admissions = own.filter((v) => v.type === 'IPD');
  const latestAbnormal = resultsForPatient(samples, patient.id).find((s) => s.status === 'Abnormal');
  return [
    { label: 'Chief Complaint', text: profile?.chiefComplaint ?? 'Not recorded.' },
    {
      label: 'Problem List',
      text: profile?.conditions.length ? profile.conditions.join('; ') : 'No chronic conditions recorded.',
    },
    {
      label: 'Allergies',
      text: profile?.allergies.length ? profile.allergies.join(', ') : 'No known drug allergies (NKDA).',
    },
    {
      label: 'Current Medication',
      text: profile?.currentMedications.length ? profile.currentMedications.join(', ') : 'None.',
    },
    {
      label: 'Previous Encounters',
      text: lastVisit
        ? `${own.length} encounter${own.length > 1 ? 's' : ''}; last ${lastVisit.type} on ${formatDayMonth(lastVisit.date)} — ${lastVisit.diagnosis}.${admissions.length ? ` ${admissions.length} admission${admissions.length > 1 ? 's' : ''} on record.` : ''}`
        : 'First encounter at City Care.',
    },
    {
      label: 'Latest Abnormal Result',
      text: latestAbnormal ? `${latestAbnormal.testName} (${formatDayMonth(latestAbnormal.date ?? '')}): ${latestAbnormal.flag ?? latestAbnormal.resultValue}` : 'None on record.',
    },
  ];
};

/** Plain-language explanation of a result for the patient app. */
export const explainForPatient = (sample: LabSample): string => {
  if (!sample.parameters?.length) return 'Your report is being processed. We will notify you when it is ready.';
  const abnormal = sample.parameters.filter((p) => parameterFlag(p));
  if (!abnormal.length) {
    return `All values in your ${sample.testName.split('(')[0].trim()} are within the normal range. No action is needed unless your doctor advises otherwise.`;
  }
  const parts = abnormal.map((p) => `${p.name} is ${parameterFlag(p) === 'H' ? 'higher' : 'lower'} than normal (${formatParamValue(p)} ${p.unit}; normal ${referenceText(p)})`);
  return `${parts.join('; ')}. This does not mean something is seriously wrong — your doctor (${sample.orderedBy ?? 'your consultant'}) will explain what it means for you and whether treatment should change.`;
};
