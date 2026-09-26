import type { HospitalProtocol, Invoice, Patient } from '../data/mockData';
import { HOSPITAL_LOCATIONS, REVENUE_BY_PERIOD } from '../data/mockData';
import { clockToMinutes, formatDayMonth, isoDaysFromToday, relativeDayLabel, todayISO } from '../utils/dates';
import { paymentModeSplit, pendingInvoices, revenueForPeriod } from './billing';
import {
  explainForPatient,
  formatParamValue,
  labTrends,
  latestVitals,
  parameterFlag,
  patientSummaryLines,
  resultsForPatient,
  vitalsFlags,
} from './clinical';
import {
  type AiActionCard,
  type AiCitation,
  bedSummary,
  buildDischargeSummary,
  checkDrugsForPatient,
  findProfile,
  type HospitalState,
  labPipelineCounts,
  todayStatsFor,
} from './hospital';

/**
 * MediOS AI (simulated). Answers are computed from live hospital state — no
 * canned numbers — and every answer cites the records it used. Intent routing
 * scores whole words so "prescribed" never matches "bed" and "Rahul's drug
 * interactions" goes to medication safety, not to Rahul's receipt.
 */

export interface AiAnswer {
  text: string;
  citations: AiCitation[];
  actionCard?: AiActionCard;
  followUps?: string[];
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// -------------------------------------------------------------
// Parsing
// -------------------------------------------------------------
const tokenize = (q: string) =>
  q
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/'s\b/g, '')
    .replace(/[^a-z0-9₹%.,\s-]/g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean);

type Weights = Array<[string, number]>;

const score = (tokens: string[], weights: Weights) =>
  weights.reduce((sum, [word, w]) => {
    const hit = word.endsWith('*') ? tokens.some((t) => t.startsWith(word.slice(0, -1))) : tokens.includes(word);
    return hit ? sum + w : sum;
  }, 0);

/** Patients mentioned by first name or full name ("Rahul", "vikram k"). */
export const findMentionedPatients = (query: string, patients: Patient[]): Patient[] => {
  const q = ` ${query.toLowerCase().replace(/'s\b/g, '').replace(/[^a-z\s]/g, ' ')} `;
  const byFull = patients.filter((p) => q.includes(` ${p.name.toLowerCase()} `));
  if (byFull.length) return byFull;
  return patients.filter((p) => {
    const first = p.name.toLowerCase().split(' ')[0];
    return first.length > 2 && q.includes(` ${first} `);
  });
};

/** Rupee threshold in the query: "₹10,000", "10000", "10k", "1 lakh". */
export const parseAmount = (query: string): number | null => {
  const q = query.toLowerCase().replace(/,/g, '');
  const lakh = /(\d+(?:\.\d+)?)\s*(lakh|lac|l)\b/.exec(q);
  if (lakh) return Number(lakh[1]) * 100000;
  const k = /(\d+(?:\.\d+)?)\s*k\b/.exec(q);
  if (k) return Number(k[1]) * 1000;
  const plain = /₹?\s?(\d{3,})/.exec(q);
  return plain ? Number(plain[1]) : null;
};

const parseDay = (tokens: string[]): string | null => {
  if (tokens.includes('yesterday')) return isoDaysFromToday(-1);
  if (tokens.includes('tomorrow')) return isoDaysFromToday(1);
  if (tokens.includes('today') || tokens.includes('todays')) return todayISO();
  return null;
};

const findDoctor = (query: string, s: HospitalState) => {
  const q = query.toLowerCase();
  return s.doctors.find((d) => {
    const parts = d.name.toLowerCase().replace('dr. ', '').split(' ');
    return q.includes(d.name.toLowerCase()) || (q.includes('dr') && parts.some((p) => p.length > 3 && q.includes(p)));
  });
};

// -------------------------------------------------------------
// Staff assistant
// -------------------------------------------------------------
type Intent =
  | 'pendingBills'
  | 'collection'
  | 'beds'
  | 'appointments'
  | 'discharge'
  | 'receipt'
  | 'protocol'
  | 'safety'
  | 'labs'
  | 'summary'
  | 'meds'
  | 'vitals'
  | 'admitted'
  | 'followups'
  | 'alerts'
  | 'help';

const STAFF_INTENTS: Record<Intent, Weights> = {
  pendingBills: [['pending', 3], ['bill*', 2], ['dues', 3], ['due', 1], ['outstanding', 3], ['unpaid', 3], ['balance', 1]],
  collection: [['collection*', 3], ['revenue', 3], ['earning*', 2], ['income', 2], ['cash', 1], ['upi', 1], ['financial', 1]],
  beds: [['bed', 3], ['beds', 3], ['icu', 2], ['occupancy', 3], ['ward', 1], ['wards', 1], ['vacant', 2]],
  appointments: [['appointment*', 3], ['schedule*', 2], ['queue', 2], ['booked', 1], ['token*', 1], ['consultations', 1]],
  discharge: [['discharge*', 3], ['summary', 1.5]],
  receipt: [['receipt*', 3], ['payment', 2], ['paid', 2], ['invoice', 2]],
  protocol: [['protocol*', 3], ['sop', 3], ['sops', 3], ['guideline*', 3], ['policy', 2], ['bundle', 1], ['management', 1]],
  safety: [['interaction*', 4], ['allerg*', 4], ['contraindicat*', 3], ['safety', 2], ['safe', 1]],
  labs: [['lab', 2], ['labs', 2], ['sample*', 2], ['abnormal', 3], ['result*', 2], ['hba1c', 2], ['critical', 1], ['tests', 1], ['pipeline', 2], ['report', 1]],
  summary: [['summar*', 3], ['history', 3], ['overview', 2], ['about', 1], ['brief', 2]],
  meds: [['medication*', 3], ['medicine*', 3], ['prescri*', 2], ['drugs', 1]],
  vitals: [['vital*', 3], ['bp', 2], ['spo2', 2], ['pulse', 2], ['temperature', 2], ['fever', 1]],
  admitted: [['admitted', 3], ['inpatient*', 3], ['ipd', 2]],
  followups: [['follow', 3], ['follow-up*', 3], ['followup*', 3], ['missed', 2]],
  alerts: [['alert*', 3], ['risk*', 2], ['flag*', 2], ['attention', 2]],
  help: [['help', 3], ['capabilit*', 3], ['features', 2]],
};

const pickIntent = (tokens: string[], hasPatient: boolean): Intent | null => {
  let best: Intent | null = null;
  let bestScore = 0;
  (Object.keys(STAFF_INTENTS) as Intent[]).forEach((intent) => {
    let sc = score(tokens, STAFF_INTENTS[intent]);
    // Patient-scoped intents only make sense with a patient.
    if (hasPatient && (intent === 'summary' || intent === 'meds' || intent === 'vitals')) sc += 0.5;
    if (!hasPatient && intent === 'summary') sc -= 2;
    // "report" alone is ambiguous — only counts for collections next to money words.
    if (intent === 'collection' && tokens.includes('report') && sc > 0) sc += 1;
    if (sc > bestScore) {
      best = intent;
      bestScore = sc;
    }
  });
  return bestScore >= 2 ? best : null;
};

const citeInvoices = (invoices: Invoice[]): AiCitation => ({
  label: `Billing ledger • ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`,
  detail: invoices.slice(0, 3).map((i) => i.invoiceNo).join(', '),
});

const searchProtocols = (query: string, protocols: HospitalProtocol[]) => {
  const tokens = tokenize(query);
  return protocols
    .map((p) => {
      const hay = `${p.title} ${p.description} ${(p.keywords ?? []).join(' ')} ${p.category}`.toLowerCase();
      const sc = tokens.filter((t) => t.length > 2 && hay.includes(t)).length + (p.keywords ?? []).filter((k) => query.toLowerCase().includes(k)).length * 2;
      return { p, sc };
    })
    .filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .map((x) => x.p);
};

const patientCard = (p: Patient, tab?: string): AiActionCard => ({
  type: 'patient',
  title: `${p.name} • ${p.uhid}`,
  description: `${p.age}y ${p.gender} • ${p.status}${p.room ? ` • ${p.room}` : ''}`,
  actionLabel: 'Open in Copilot',
  route: '/doctor-copilot',
  params: tab ? { patientId: p.id, tab } : { patientId: p.id },
});

export const answerStaffQuery = (query: string, s: HospitalState, focusPatientId?: string): AiAnswer => {
  const tokens = tokenize(query);
  const mentioned = findMentionedPatients(query, s.patients);
  const patient = mentioned[0] ?? (focusPatientId ? s.patients.find((p) => p.id === focusPatientId) : undefined);
  const day = parseDay(tokens);

  // Custom cohort query: "diabetic patients with abnormal HbA1c"
  if ((tokens.some((t) => t.startsWith('diabet')) || tokens.includes('hba1c')) && tokens.some((t) => t.startsWith('patient'))) {
    return diabeticCohort(s);
  }
  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(query.trim())) {
    return {
      text: `Hello! I can pull live answers from CareSync — pending bills, today's collection, bed availability, lab alerts, drug safety, protocols, or a full patient summary. What do you need?`,
      citations: [],
      followUps: ["Show today's appointments", 'Any critical lab results?', 'ICU bed availability'],
    };
  }

  const intent = pickIntent(tokens, !!patient) ?? (patient ? 'summary' : null);
  switch (intent) {
    case 'pendingBills':
      return pendingBillsAnswer(s, parseAmount(query) ?? 0, patient);
    case 'collection':
      return collectionAnswer(s);
    case 'beds':
      return bedsAnswer(s, tokens.includes('icu'));
    case 'appointments':
      return appointmentsAnswer(s, day ?? todayISO(), findDoctor(query, s)?.name, patient);
    case 'discharge':
      return dischargeAnswer(s, patient);
    case 'receipt':
      return receiptAnswer(s, patient, day);
    case 'protocol':
      return protocolAnswer(s, query);
    case 'safety':
      return safetyAnswer(s, patient);
    case 'labs':
      return patient ? patientLabsAnswer(s, patient) : labsAnswer(s);
    case 'summary':
      return patient ? summaryAnswer(s, patient) : notFound("Which patient? Try \"Summarize Meera Krishnan's history\".");
    case 'meds':
      return patient ? medsAnswer(s, patient) : safetyAnswer(s);
    case 'vitals':
      return patient ? vitalsAnswer(s, patient) : admittedAnswer(s, true);
    case 'admitted':
      return admittedAnswer(s, false);
    case 'followups':
      return followUpsAnswer(s);
    case 'alerts':
      return labsAnswer(s);
    case 'help':
      return helpAnswer();
    default:
      return notFound(
        `I couldn't match "${query.trim()}" to anything in hospital records. I only answer from CareSync data, so I won't guess.`
      );
  }
};

const notFound = (text: string): AiAnswer => ({
  text,
  citations: [],
  followUps: ['Find all patients with pending bills above ₹10,000', "Show today's appointments", 'Any critical lab results?'],
});

const helpAnswer = (): AiAnswer => ({
  text:
    'I answer from live CareSync records and cite my sources:\n\n• Billing — pending bills, receipts, today\'s collection\n• Operations — bed & ICU availability, admitted patients\n• Clinical — patient summaries, lab results & trends, vitals, medication safety\n• Knowledge — hospital protocols & SOPs\n\nI never make final clinical decisions — a clinician approves anything I draft.',
  citations: [{ label: 'MediOS AI guardrails', detail: 'Read-only answers • Human approval required' }],
  followUps: ["Summarize Meera Krishnan's history", 'Check Rahul\'s drug interactions', 'Dengue protocol'],
});

const pendingBillsAnswer = (s: HospitalState, min: number, patient?: Patient): AiAnswer => {
  const list = pendingInvoices(s.invoices, min).filter((i) => !patient || i.patientId === patient.id);
  const total = list.reduce((n, i) => n + i.amount, 0);
  if (!list.length) {
    const all = pendingInvoices(s.invoices);
    return {
      text: `No pending bills${min ? ` above ${inr(min)}` : ''}${patient ? ` for ${patient.name}` : ''} right now.${all.length ? `\n\nTotal outstanding across the hospital: ${inr(all.reduce((n, i) => n + i.amount, 0))} in ${all.length} invoice${all.length > 1 ? 's' : ''}.` : ''}`,
      citations: [citeInvoices(all)],
      actionCard: { type: 'invoice', title: 'Billing & Invoices', description: 'Review all invoices and collections.', actionLabel: 'View Billing', route: '/billing' },
    };
  }
  return {
    text: `Found ${list.length} pending bill${list.length > 1 ? 's' : ''}${min ? ` above ${inr(min)}` : ''} totaling ${inr(total)}:\n\n${list
      .map((i) => `• ${i.patientName} (${i.uhid}) — ${i.title}: ${inr(i.amount)}`)
      .join('\n')}`,
    citations: [citeInvoices(list)],
    actionCard: {
      type: 'invoice',
      title: 'Pending Invoices Review',
      description: `${list.length} invoice${list.length > 1 ? 's' : ''} need collection${list.some((i) => s.patients.find((p) => p.id === i.patientId)?.status === 'Admitted') ? ' before discharge' : ''}.`,
      actionLabel: list.length === 1 ? 'Open Invoice' : 'View Billing',
      route: list.length === 1 ? '/receipt/[id]' : '/billing',
      params: list.length === 1 ? { id: list[0].id } : undefined,
    },
    followUps: ['Generate today\'s OPD collection report', 'Which patients are admitted?'],
  };
};

const collectionAnswer = (s: HospitalState): AiAnswer => {
  const stats = todayStatsFor(s);
  const rev = revenueForPeriod(REVENUE_BY_PERIOD, 'today', stats.todayCollection);
  const t = todayISO();
  const todays = s.invoices.filter((i) => i.status === 'Paid' && i.dateISO === t);
  const split = paymentModeSplit(s.invoices, t);
  const counted = Object.values(split).reduce((a, b) => a + b, 0) || 1;
  const pct = (n: number) => `${Math.round((n / counted) * 100)}%`;
  return {
    text: `Today's collection so far: ${inr(stats.todayCollection)} (${rev.growthPct >= 0 ? '+' : ''}${rev.growthPct}% ${rev.comparedTo})\n\n• OPD consultations: ${inr(rev.opd.amount)} (${stats.opdToday} patients)\n• IPD & room charges: ${inr(rev.ipd.amount)}\n• Pharmacy: ${inr(rev.pharmacy.amount)}\n• Lab & Radiology: ${inr(rev.diagnostics.amount)}\n• Procedures & other: ${inr(rev.other.amount)}\n\nReceipts issued in CareSync today: ${todays.length} — UPI ${pct(split.UPI)} • Cash ${pct(split.Cash)} • Card ${pct(split.Card)} • Net Banking ${pct(split['Net Banking'])}\nPending to collect: ${inr(stats.pendingAmount)} (${stats.pendingCount} invoices)`,
    citations: [citeInvoices(todays), { label: 'Revenue MIS • today', detail: 'Hospital-wide counters' }],
    actionCard: { type: 'report', title: 'Financial Daily Breakdown', description: 'Category and payment-mode split for today.', actionLabel: 'Financial Summary', route: '/financial-management' },
    followUps: ['Find all patients with pending bills above ₹10,000', 'Open the daily collection report'],
  };
};

const bedsAnswer = (s: HospitalState, icuOnly: boolean): AiAnswer => {
  const sum = bedSummary(s);
  const wards = icuOnly ? s.wardInfo.filter((w) => w.type === 'ICU') : s.wardInfo;
  return {
    text: `${icuOnly ? 'ICU status' : 'Current bed status'}:\n\n${wards
      .map((w) => `• ${w.name}: ${w.available} available of ${w.totalBeds} (${Math.round((w.occupied / w.totalBeds) * 100)}% occupied)`)
      .join('\n')}\n\nHospital occupancy: ${sum.pct}% (${sum.occupied}/${sum.total} beds).${sum.icuAvailable <= 2 ? `\n⚠️ Only ${sum.icuAvailable} ICU bed${sum.icuAvailable === 1 ? '' : 's'} left — consider step-down transfers.` : ''}`,
    citations: [{ label: `Bed management • ${s.wardInfo.length} wards`, detail: 'Live census' }],
    actionCard: { type: 'report', title: 'Bed Management', description: 'Ward-wise beds and allocations.', actionLabel: 'Open Beds', route: '/bed-management' },
    followUps: ['Which patients are admitted?', 'Pending discharges today'],
  };
};

const appointmentsAnswer = (s: HospitalState, date: string, doctorName?: string, patient?: Patient): AiAnswer => {
  const list = s.appointments
    .filter((a) => a.date === date && a.status !== 'Cancelled')
    .filter((a) => !doctorName || a.doctorName === doctorName)
    .filter((a) => !patient || a.patientId === patient.id)
    .sort((a, b) => clockToMinutes(a.time) - clockToMinutes(b.time));
  const label = relativeDayLabel(date).toLowerCase();
  if (!list.length) {
    return {
      text: `No appointments ${label === 'today' || label === 'tomorrow' || label === 'yesterday' ? label : `on ${formatDayMonth(date)}`}${doctorName ? ` for ${doctorName}` : ''}${patient ? ` for ${patient.name}` : ''}.`,
      citations: [{ label: 'Appointments register' }],
      actionCard: { type: 'appointment', title: 'Book Appointment', description: 'Pick a doctor and an open slot.', actionLabel: 'Book Now', route: '/book-appointment' },
    };
  }
  const waiting = list.filter((a) => a.status === 'Waiting').length;
  return {
    text: `${list.length} appointment${list.length > 1 ? 's' : ''} ${label === 'today' ? 'today' : label === 'tomorrow' ? 'tomorrow' : `on ${formatDayMonth(date)}`}${doctorName ? ` for ${doctorName}` : ''}${waiting ? ` • ${waiting} waiting now` : ''}:\n\n${list
      .map((a) => `• ${a.time} — ${a.patientName} (${a.department}, ${a.type}) • ${a.status}`)
      .join('\n')}`,
    citations: [{ label: `Appointments register • ${list.length} bookings`, detail: formatDayMonth(date) }],
    actionCard: { type: 'appointment', title: "Today's Schedule", description: `${list.length} patients lined up.`, actionLabel: 'View Schedule', route: '/appointments' },
    followUps: ['Who is waiting now?', 'Show bed availability in ICU'],
  };
};

const dischargeAnswer = (s: HospitalState, patient?: Patient): AiAnswer => {
  const target =
    patient ??
    s.patients.find((p) => p.status === 'Admitted' && s.dischargeSummaries.some((d) => d.patientId === p.id && d.status === 'Draft')) ??
    s.patients.find((p) => p.status === 'Discharged');
  if (!target) return notFound('No admitted or recently discharged patients found.');
  const summary = buildDischargeSummary(s, target.id);
  if (!summary) {
    return {
      text: `${target.name} has no admission on record, so there's no discharge summary to prepare.`,
      citations: [{ label: `EMR • ${target.uhid}` }],
      actionCard: patientCard(target),
    };
  }
  return {
    text: `Discharge summary ${summary.status === 'Draft' ? 'draft ready' : 'on file'} for ${target.name} (UHID: ${target.uhid}):\n\n• Diagnosis: ${summary.diagnosis}\n• Stay: ${summary.stayDuration} (${summary.admissionDate} → ${summary.dischargeDate}) • ${summary.room}\n• Treating doctor: ${summary.doctorName}\n• Follow-up: ${summary.advice.find((a) => /follow/i.test(a)) ?? 'as advised'}${summary.status === 'Draft' ? '\n\nNeeds doctor approval before the patient is discharged.' : ''}`,
    citations: [{ label: `EMR • ${target.uhid}`, detail: `${summary.department} • ${summary.doctorName}` }],
    actionCard: {
      type: 'patient',
      title: `Discharge Summary — ${target.name}`,
      description: summary.status === 'Draft' ? 'Review, approve and discharge.' : 'Clinical notes and prescription ready for PDF export.',
      actionLabel: 'Open Summary',
      route: '/discharge-summary',
      params: { patientId: target.id },
    },
  };
};

const receiptAnswer = (s: HospitalState, patient: Patient | undefined, day: string | null): AiAnswer => {
  const list = s.invoices
    .filter((i) => !patient || i.patientId === patient.id)
    .filter((i) => !day || i.dateISO === day)
    .sort((a, b) => ((a.dateISO ?? '') < (b.dateISO ?? '') ? 1 : -1));
  const inv = list[0];
  if (!inv) {
    return notFound(`No receipts found${patient ? ` for ${patient.name}` : ''}${day ? ` ${relativeDayLabel(day).toLowerCase()}` : ''}.`);
  }
  return {
    text: `Found ${inv.status === 'Paid' ? 'receipt' : 'invoice'} for ${inv.patientName}:\n\n• Receipt No: ${inv.invoiceNo}\n• Amount: ${inr(inv.amount)} (${inv.status === 'Paid' ? `Paid via ${inv.paymentMode}` : 'Pending'})\n• Service: ${inv.title}${inv.doctorName ? ` — ${inv.doctorName}` : ''}\n• Date: ${inv.date} ${inv.time}${list.length > 1 ? `\n\n${list.length - 1} more invoice${list.length > 2 ? 's' : ''} on file.` : ''}`,
    citations: [citeInvoices([inv])],
    actionCard: { type: 'invoice', title: `Receipt #${inv.invoiceNo}`, description: `${inv.title} • ${inr(inv.amount)}`, actionLabel: 'View Receipt', route: '/receipt/[id]', params: { id: inv.id } },
  };
};

const protocolAnswer = (s: HospitalState, query: string): AiAnswer => {
  const [best, ...rest] = searchProtocols(query, s.hospitalProtocols);
  if (!best) {
    return {
      text: `No hospital protocol matches that. Available SOPs:\n\n${s.hospitalProtocols.map((p) => `• ${p.title}`).join('\n')}`,
      citations: [{ label: `SOP library • ${s.hospitalProtocols.length} protocols` }],
    };
  }
  return {
    text: `${best.title}\n${best.description}\n\n${best.keySteps.join('\n')}${rest.length ? `\n\nRelated: ${rest.slice(0, 2).map((p) => p.title).join('; ')}` : ''}`,
    citations: [{ label: `Hospital SOP ${best.id}`, detail: `${best.category} • updated ${best.lastUpdated}` }],
    actionCard: { type: 'report', title: best.title, description: 'Verified by the Clinical Governance Committee.', actionLabel: 'Open Protocols', route: '/doctor-copilot', params: { tab: 'Protocols' } },
  };
};

const safetyAnswer = (s: HospitalState, patient?: Patient): AiAnswer => {
  if (patient) {
    const profile = findProfile(s, patient.id);
    const pending = s.prescriptionReviews.filter((r) => r.patientId === patient.id && r.status !== 'Dispensed');
    const alerts = checkDrugsForPatient(s, patient.id, profile?.currentMedications ?? []);
    const lines = [
      `Allergies: ${profile?.allergies.length ? profile.allergies.join(', ') : 'none recorded (NKDA)'}`,
      `Current medication: ${profile?.currentMedications.length ? profile.currentMedications.join(', ') : 'none'}`,
    ];
    alerts.forEach((a) => lines.push(`${a.severity === 'critical' ? '🔴' : '🟠'} ${a.title} — ${a.detail}${a.suggestion ? ` Suggest: ${a.suggestion}` : ''}`));
    pending.forEach((r) => lines.push(`Pending pharmacy review ${r.prescriptionCode}: ${r.safetyStatus}`));
    if (!alerts.length && !pending.length) lines.push('✅ No interactions or allergy conflicts in the current regimen.');
    return {
      text: `Medication safety — ${patient.name}:\n\n${lines.join('\n')}`,
      citations: [
        { label: `Clinical rules engine`, detail: alerts.map((a) => a.rule).join(', ') || 'No rules triggered' },
        { label: `EMR • ${patient.uhid}` },
      ],
      actionCard: pending.length
        ? { type: 'invoice', title: 'Prescription Safety Review', description: `${pending.length} prescription${pending.length > 1 ? 's' : ''} awaiting pharmacist review.`, actionLabel: 'Review Safety', route: '/pharmacy-review' }
        : patientCard(patient, 'Med Review'),
    };
  }
  const flagged = s.prescriptionReviews.filter((r) => r.status !== 'Dispensed' && r.safetyStatus !== 'Safe');
  if (!flagged.length) {
    return { text: '✅ No prescriptions are currently flagged by the safety engine.', citations: [{ label: 'Pharmacy review queue' }] };
  }
  return {
    text: `DRUG SAFETY — ${flagged.length} prescription${flagged.length > 1 ? 's' : ''} flagged:\n\n${flagged
      .map((r) => `• ${r.prescriptionCode} ${r.patientName}: ${r.safetyStatus} — ${(r.interactionAlert ?? r.allergyAlert ?? '').split('.')[0]}.${r.alternativeSuggestion ? `\n  Suggest: ${r.alternativeSuggestion}` : ''}`)
      .join('\n')}`,
    citations: [{ label: `Pharmacy review queue • ${flagged.length} flagged`, detail: flagged.map((r) => r.prescriptionCode).join(', ') }],
    actionCard: { type: 'invoice', title: 'Prescription Safety Review', description: `${flagged.length} high-risk prescription${flagged.length > 1 ? 's' : ''} pending.`, actionLabel: 'Review Safety', route: '/pharmacy-review' },
  };
};

const labsAnswer = (s: HospitalState): AiAnswer => {
  const t = todayISO();
  const abnormal = s.labSamples.filter((x) => x.date === t && x.status === 'Abnormal');
  const counts = labPipelineCounts(s);
  return {
    text: `${abnormal.length ? `${abnormal.length} abnormal result${abnormal.length > 1 ? 's' : ''} today:` : 'No abnormal results today.'}\n\n${abnormal
      .map((x) => `• ${x.patientName} (${x.testName.split('(')[0].trim()}): ${x.flag ?? x.resultValue}`)
      .join('\n')}\n\nPipeline: ${counts.New} New • ${counts.Processing} Processing • ${counts.Completed} Completed • ${counts.Abnormal} Abnormal`,
    citations: [{ label: `LIS • ${abnormal.length} flagged samples`, detail: abnormal.map((x) => x.sampleCode).join(', ') }],
    actionCard: { type: 'report', title: 'Abnormal Lab Samples Flagged', description: 'Critical values are notified to the ordering doctor.', actionLabel: 'View Lab Portal', route: '/lab-portal' },
    followUps: abnormal[0] ? [`Explain ${abnormal[0].patientName}'s lab report`, 'Show all diabetic patients with abnormal HbA1c'] : undefined,
  };
};

const patientLabsAnswer = (s: HospitalState, patient: Patient): AiAnswer => {
  const results = resultsForPatient(s.labSamples, patient.id);
  if (!results.length) {
    const pending = s.labSamples.filter((x) => x.patientId === patient.id && (x.status === 'New' || x.status === 'Processing'));
    return {
      text: pending.length
        ? `${patient.name} has ${pending.length} test${pending.length > 1 ? 's' : ''} in progress (${pending.map((x) => x.testName.split('(')[0].trim()).join(', ')}). No finalised results yet.`
        : `No lab results on record for ${patient.name}.`,
      citations: [{ label: `LIS • ${patient.uhid}` }],
      actionCard: patientCard(patient, 'Reports'),
    };
  }
  const latest = results[0];
  const trends = labTrends(s.labSamples, patient.id).filter((tr) => tr.points.length > 1 && tr.test === latest.testName);
  const lines = latest.parameters!.map((p) => {
    const f = parameterFlag(p);
    return `• ${p.name}: ${formatParamValue(p)} ${p.unit}${f ? (f === 'H' ? ' ↑ High' : ' ↓ Low') : ' (normal)'}`;
  });
  const trendText = trends
    .map((tr) => `• ${tr.parameter}: ${tr.points.map((pt) => formatParamValue({ name: '', value: pt.value, unit: tr.unit })).join(' → ')} ${tr.unit}${tr.worsening ? ' — worsening' : ''}`)
    .join('\n');
  return {
    text: `${latest.testName} — ${patient.name} (${relativeDayLabel(latest.date ?? todayISO())}):\n\n${lines.join('\n')}${trendText ? `\n\nCompared with previous:\n${trendText}` : ''}\n\nInterpretation: ${latest.flag ?? 'Within reference ranges.'}`,
    citations: [{ label: `LIS ${latest.sampleCode}`, detail: `${latest.collectedAt} • ordered by ${latest.orderedBy ?? '—'}` }],
    actionCard: patientCard(patient, 'Reports'),
  };
};

const diabeticCohort = (s: HospitalState): AiAnswer => {
  const rows = s.patients
    .map((p) => {
      const hba1c = resultsForPatient(s.labSamples, p.id)
        .flatMap((x) => (x.parameters ?? []).map((prm) => ({ prm, date: x.date, code: x.sampleCode })))
        .find((x) => x.prm.name === 'HbA1c');
      const diabetic = findProfile(s, p.id)?.conditions.some((c) => /diabet/i.test(c));
      return { p, hba1c, diabetic };
    })
    .filter((r) => r.diabetic || (r.hba1c && r.hba1c.prm.value >= 6.5));
  const abnormal = rows.filter((r) => r.hba1c && r.hba1c.prm.value >= 6.5);
  return {
    text: `${rows.length} diabetic patient${rows.length === 1 ? '' : 's'} on record; ${abnormal.length} with abnormal HbA1c (≥ 6.5%):\n\n${rows
      .map((r) => `• ${r.p.name} (${r.p.uhid}) — ${r.hba1c ? `HbA1c ${r.hba1c.prm.value}% on ${formatDayMonth(r.hba1c.date ?? '')}` : 'no HbA1c on file'}${r.p.status === 'Admitted' ? ` • ${r.p.room}` : ''}`)
      .join('\n')}`,
    citations: [
      { label: 'Custom query • EMR problem list + LIS', detail: abnormal.map((r) => r.hba1c!.code).join(', ') },
      { label: 'Hospital SOP proto-3', detail: 'Type 2 Diabetes Glycemic Management' },
    ],
    actionCard: abnormal[0] ? patientCard(abnormal[0].p, 'Reports') : undefined,
  };
};

const encounterCount = (s: HospitalState, patientId: string) => {
  const n = s.visits.filter((x) => x.patientId === patientId).length;
  return `${n} encounter${n === 1 ? '' : 's'}`;
};

const summaryAnswer = (s: HospitalState, patient: Patient): AiAnswer => {
  const lines = patientSummaryLines(patient, findProfile(s, patient.id), s.visits, s.labSamples);
  const v = latestVitals(s.vitals, patient.id);
  return {
    text: `${patient.name}, ${patient.age}y ${patient.gender} • ${patient.uhid} • ${patient.status}${patient.room ? ` (${patient.room})` : ''}\n\n${lines
      .map((l) => `• ${l.label}: ${l.text}`)
      .join('\n')}${v ? `\n• Latest vitals (${v.time}): BP ${v.bp}, Pulse ${v.pulse}, SpO₂ ${v.spo2}%, Temp ${v.temp}°F` : ''}`,
    citations: [
      { label: `EMR • ${encounterCount(s, patient.id)}`, detail: patient.uhid },
      { label: 'LIS + nursing chart' },
    ],
    actionCard: patientCard(patient),
    followUps: [`Check ${patient.name.split(' ')[0]}'s drug interactions`, `Explain ${patient.name.split(' ')[0]}'s lab report`],
  };
};

const medsAnswer = (s: HospitalState, patient: Patient): AiAnswer => safetyAnswer(s, patient);

const vitalsAnswer = (s: HospitalState, patient: Patient): AiAnswer => {
  const v = latestVitals(s.vitals, patient.id);
  if (!v) return { text: `No vitals recorded yet for ${patient.name}.`, citations: [{ label: 'Nursing chart' }], actionCard: patientCard(patient) };
  const flags = vitalsFlags(v);
  return {
    text: `Latest vitals — ${patient.name} (${relativeDayLabel(v.date)}, ${v.time}, by ${v.recordedBy}):\n\n• BP ${v.bp} mmHg\n• Pulse ${v.pulse} bpm\n• SpO₂ ${v.spo2}%\n• Temp ${v.temp}°F${v.respRate ? `\n• Resp. rate ${v.respRate}/min` : ''}${flags.length ? `\n\n⚠️ Out of range: ${flags.map((f) => f.label).join(', ')}` : '\n\n✅ All within normal limits.'}`,
    citations: [{ label: 'Nursing chart', detail: `${v.recordedBy} • ${v.time}` }],
    actionCard: patientCard(patient),
  };
};

const admittedAnswer = (s: HospitalState, withVitals: boolean): AiAnswer => {
  const admitted = s.patients.filter((p) => p.status === 'Admitted');
  const sum = bedSummary(s);
  return {
    text: `${admitted.length} patients admitted under CareSync records (hospital census ${sum.occupied}/${sum.total}):\n\n${admitted
      .map((p) => {
        const v = withVitals ? latestVitals(s.vitals, p.id) : undefined;
        const flags = v ? vitalsFlags(v) : [];
        return `• ${p.name} — ${p.room} • ${p.department ?? ''}${flags.length ? ` ⚠️ ${flags[0].label}` : ''}`;
      })
      .join('\n')}`,
    citations: [{ label: 'ADT census', detail: `${admitted.length} tracked in-patients` }],
    actionCard: { type: 'report', title: 'Nurse Ward Overview', description: 'Beds, tasks and vitals by ward.', actionLabel: 'Open Nurse Portal', route: '/nurse-portal' },
  };
};

const followUpsAnswer = (s: HospitalState): AiAnswer => {
  const t = todayISO();
  const list = s.appointments
    .filter((a) => a.type === 'Follow Up' && a.status !== 'Completed' && a.status !== 'Cancelled' && a.date >= isoDaysFromToday(-1) && a.date <= isoDaysFromToday(7))
    .sort((a, b) => (a.date === b.date ? clockToMinutes(a.time) - clockToMinutes(b.time) : a.date < b.date ? -1 : 1));
  return {
    text: list.length
      ? `Follow-ups in the next 7 days:\n\n${list.map((a) => `• ${relativeDayLabel(a.date)} ${a.time} — ${a.patientName} with ${a.doctorName}${a.status === 'Not Arrived' && a.date === t ? ' • NOT ARRIVED' : ''}`).join('\n')}`
      : 'No follow-ups due in the next 7 days.',
    citations: [{ label: 'Appointments register • follow-ups' }],
    actionCard: { type: 'appointment', title: 'Appointments', description: 'Reschedule or call patients.', actionLabel: 'View Schedule', route: '/appointments' },
  };
};

// -------------------------------------------------------------
// Patient assistant (Patient App)
// -------------------------------------------------------------
const PATIENT_INTENTS: Record<string, Weights> = {
  book: [['book', 3], ['appointment*', 2], ['consult*', 1], ['doctor', 1], ['slot*', 2]],
  next: [['next', 2], ['upcoming', 3], ['when', 1], ['visit', 1]],
  reports: [['report*', 3], ['result*', 3], ['lab', 2], ['test*', 1], ['explain', 2]],
  meds: [['medicine*', 3], ['reminder*', 3], ['tablet*', 2], ['dose', 2], ['medication*', 3]],
  navigate: [['where', 3], ['navigat*', 3], ['direction*', 3], ['find', 1], ['floor', 2], ['room', 1], ['way', 1]],
  bills: [['bill*', 3], ['payment*', 2], ['invoice*', 2], ['pay', 2], ['receipt*', 2], ['insurance', 1]],
  emergency: [['emergency', 4], ['sos', 4], ['ambulance', 4], ['urgent', 2]],
  symptoms: [['fever', 3], ['cough', 3], ['pain', 3], ['headache', 3], ['vomit*', 3], ['breath*', 3], ['dizzy', 3], ['rash', 3], ['feel*', 1], ['sick', 2], ['symptom*', 3]],
};

const RED_FLAGS = ['chest pain', 'breath', 'breathless', 'unconscious', 'seizure', 'bleeding', 'stroke', 'faint'];

export const answerPatientQuery = (query: string, s: HospitalState, patientId: string): AiAnswer => {
  const patient = s.patients.find((p) => p.id === patientId);
  if (!patient) return { text: 'Please sign in to your CareSync patient account.', citations: [] };
  const tokens = tokenize(query);
  const lower = query.toLowerCase();
  let best = '';
  let bestScore = 0;
  Object.entries(PATIENT_INTENTS).forEach(([intent, weights]) => {
    const sc = score(tokens, weights);
    if (sc > bestScore) {
      best = intent;
      bestScore = sc;
    }
  });
  if (RED_FLAGS.some((f) => lower.includes(f))) best = 'emergency';
  const first = patient.name.split(' ')[0];

  switch (bestScore >= 2 || best === 'emergency' ? best : '') {
    case 'emergency':
      return {
        text: `${first}, if this is an emergency please use the red SOS button or call ${'108'} right away. Chest pain, severe breathlessness, fainting or heavy bleeding need immediate care — don't wait for an appointment.\n\nOur Emergency & Casualty is open 24 x 7 (Ground Floor, Emergency Block, east gate).`,
        citations: [{ label: 'Triage guidance • red-flag symptoms' }],
        actionCard: { type: 'appointment', title: 'Emergency & Casualty', description: 'Ground Floor • Emergency Block • 24 x 7', actionLabel: 'Directions', route: '/hospital-navigation', params: { focus: 'loc-6' } },
      };
    case 'symptoms': {
      const dept = /rash|itch|skin/.test(lower) ? 'Dermatology' : /ear|nose|throat|sinus/.test(lower) ? 'ENT' : /pain.*(knee|joint|back)|knee|joint/.test(lower) ? 'Orthopedics' : 'General Medicine';
      return {
        text: `Sorry you're not feeling well, ${first}. Based on what you've described, a ${dept} consultation is the right first step.\n\nWhile you wait:\n• Rest and drink plenty of fluids\n• Paracetamol only as previously prescribed\n• Seek emergency care for chest pain, breathlessness, confusion or fainting\n\nThis is guidance, not a diagnosis — a doctor will examine you.`,
        citations: [{ label: 'Triage support • symptom checker', detail: `Suggested: ${dept}` }],
        actionCard: { type: 'appointment', title: `Book ${dept}`, description: 'See the next available slots.', actionLabel: 'Book Now', route: '/book-appointment', params: { patientId: patient.id, specialty: dept } },
      };
    }
    case 'book':
      return {
        text: `Sure ${first} — pick a specialty and an open slot. The consultation fee is paid in the app and your token number is shown instantly.`,
        citations: [],
        actionCard: { type: 'appointment', title: 'Book an Appointment', description: 'Choose doctor, date and time.', actionLabel: 'Book Now', route: '/book-appointment', params: { patientId: patient.id } },
      };
    case 'next': {
      const next = s.appointments
        .filter((a) => a.patientId === patient.id && a.date >= todayISO() && a.status !== 'Completed' && a.status !== 'Cancelled')
        .sort((a, b) => (a.date === b.date ? clockToMinutes(a.time) - clockToMinutes(b.time) : a.date < b.date ? -1 : 1))[0];
      return next
        ? {
            text: `Your next appointment is ${relativeDayLabel(next.date)} at ${next.time} with ${next.doctorName} (${next.department}). Token #${next.tokenNo}.\n\nPlease arrive 15 minutes early at ${next.department === 'Cardiology' ? 'Room 305, 3rd floor' : 'the 2nd floor OPD, Main Block'}.`,
            citations: [{ label: 'Your appointments' }],
          }
        : { text: `You have no upcoming appointments, ${first}. Would you like to book one?`, citations: [], actionCard: { type: 'appointment', title: 'Book an Appointment', description: 'Choose doctor, date and time.', actionLabel: 'Book Now', route: '/book-appointment', params: { patientId: patient.id } } };
    }
    case 'reports': {
      const results = resultsForPatient(s.labSamples, patient.id);
      if (!results.length) return { text: 'You have no finalised lab reports yet. We will notify you as soon as a report is ready.', citations: [] };
      const latest = results[0];
      return {
        text: `Your latest report: ${latest.testName} (${relativeDayLabel(latest.date ?? todayISO())}).\n\n${explainForPatient(latest)}`,
        citations: [{ label: `Lab report ${latest.sampleCode}`, detail: `Verified by City Care Laboratory` }],
        actionCard: { type: 'report', title: 'My Reports', description: `${results.length} report${results.length > 1 ? 's' : ''} available`, actionLabel: 'Open Reports', route: '/patient-reports' },
      };
    }
    case 'meds': {
      const reminders = s.patientReminders.filter((r) => r.patientId === patient.id);
      return {
        text: reminders.length
          ? `Today's medicines:\n\n${reminders.map((r) => `${r.taken ? '✅' : '⏰'} ${r.time} — ${r.medicineName} (${r.dosage}) • ${r.instructions}`).join('\n')}`
          : 'You have no medicine reminders set up.',
        citations: [{ label: 'Your prescriptions & reminders' }],
      };
    }
    case 'navigate': {
      const loc =
        HOSPITAL_LOCATIONS.find((l) => l.name.toLowerCase().split(/[\s(&,]+/).some((w) => w.length > 3 && lower.includes(w))) ?? HOSPITAL_LOCATIONS[0];
      return {
        text: `${loc.name}\n📍 ${loc.floor}, ${loc.block}\n\n${loc.directions}\nAbout ${loc.walkMinutes} min walk from the main entrance.`,
        citations: [{ label: 'Hospital wayfinding map' }],
        actionCard: { type: 'report', title: 'Hospital Navigation', description: 'Floor-by-floor directions.', actionLabel: 'Open Map', route: '/hospital-navigation', params: { focus: loc.id } },
      };
    }
    case 'bills': {
      const mine = s.invoices.filter((i) => i.patientId === patient.id);
      const pending = mine.filter((i) => i.status === 'Pending');
      return {
        text: mine.length
          ? `You have ${mine.length} bill${mine.length > 1 ? 's' : ''} on file${pending.length ? `, ${pending.length} pending (${inr(pending.reduce((n, i) => n + i.amount, 0))})` : ', all paid'}.\n\n${mine.slice(0, 4).map((i) => `• ${i.invoiceNo} — ${i.title}: ${inr(i.amount)} (${i.status})`).join('\n')}`
          : 'You have no bills on file.',
        citations: [citeInvoices(mine)],
        actionCard: mine[0] ? { type: 'invoice', title: `Receipt #${mine[0].invoiceNo}`, description: mine[0].title, actionLabel: 'View Receipt', route: '/receipt/[id]', params: { id: mine[0].id } } : undefined,
      };
    }
    default:
      return {
        text: `I can help you book appointments, explain your reports, remind you about medicines, find your way around the hospital, or check your bills. What would you like to do, ${first}?`,
        citations: [],
        followUps: ['Book an appointment', 'Explain my latest report', 'Where is the laboratory?', 'My medicines today'],
      };
  }
};
