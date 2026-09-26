import type { ClinicalProfile, LabSample, VitalsRecord } from '../../data/mockData';
import { formatParamValue, parameterFlag, vitalsFlags } from '../../logic/clinical';
import { daysFromToday, formatDayMonth } from '../../utils/dates';
import { friendlyDate, shortTestName } from './format';

export interface AiDraft {
  symptoms?: string;
  diagnosis?: string;
  sources: string[];
}

/** Draft notes from the record: complaint + latest vitals, and a diagnosis line to review. */
export const buildAiDraft = (profile: ClinicalProfile | undefined, vitals: VitalsRecord | undefined, results: LabSample[]): AiDraft | null => {
  const sources: string[] = [];
  const complaint = profile?.chiefComplaint && !/^New registration/i.test(profile.chiefComplaint) ? profile.chiefComplaint.trim() : '';
  if (complaint) sources.push('Clinical profile');

  let vitalsLine = '';
  let vitalFlags: string[] = [];
  if (vitals) {
    vitalFlags = vitalsFlags(vitals).map((f) => f.label);
    const stale = daysFromToday(vitals.date) < -7;
    vitalsLine = `${stale ? 'Last recorded vitals' : 'Vitals'} (${friendlyDate(vitals.date)}, ${vitals.time}${stale ? ' — recheck today' : ''}): BP ${vitals.bp} mmHg, pulse ${vitals.pulse}/min, SpO₂ ${vitals.spo2}%, temp ${vitals.temp}°F${
      typeof vitals.respRate === 'number' ? `, RR ${vitals.respRate}/min` : ''
    }${vitalFlags.length ? ` — ${vitalFlags.join(', ')}` : ''}.`;
    sources.push(`Nursing chart • ${vitals.time}`);
  }

  // Latest result of each test; keep the ones that are out of range.
  const seen = new Set<string>();
  let abnormal: LabSample | undefined;
  for (const s of results) {
    const key = shortTestName(s.testName).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!abnormal && (s.parameters ?? []).some((p) => parameterFlag(p))) abnormal = s;
  }
  let labText = '';
  if (abnormal) {
    const flagged = abnormal.parameters!.filter((p) => parameterFlag(p));
    const values = flagged.map((p) => `${p.name} ${formatParamValue(p)} ${p.unit} (${parameterFlag(p) === 'H' ? 'High' : 'Low'})`).join(', ');
    const test = shortTestName(abnormal.testName);
    // "HbA1c 10.2 % (High)" rather than "HbA1c Glycated Hemoglobin: HbA1c 10.2 %".
    labText = test.toLowerCase().startsWith(flagged[0].name.toLowerCase()) ? values : `${test}: ${values}`;
  }
  if (abnormal) sources.push(`LIS ${abnormal.sampleCode} • ${formatDayMonth(abnormal.date ?? '')}`);

  const condition = profile?.conditions[0];
  let diagnosis = '';
  if (condition && labText) diagnosis = `${condition} — ${labText}`;
  else if (condition) diagnosis = vitalFlags.length ? `${condition}; ${vitalFlags[0]}` : condition;
  else if (labText) diagnosis = `${labText} — evaluate cause`;

  const symptoms = [complaint, vitalsLine].filter(Boolean).join('\n');
  if (!symptoms && !diagnosis) return null;
  return { symptoms: symptoms || undefined, diagnosis: diagnosis || undefined, sources };
};
