import type {
  ClinicalProfile,
  DischargeSummary,
  Invoice,
  LabSample,
  Patient,
  Visit,
  VitalsRecord,
} from '../../data/mockData';
import type { HospitalProfile } from '../../logic/hospital';
import { formatParamValue, parameterFlag, referenceText, vitalsFlags } from '../../logic/clinical';
import type { DocumentSection, DocumentSpec, HospitalHeader } from '../../utils/pdfGenerator';
import { formatClock, formatDayMonth, formatDisplayDate } from '../../utils/dates';
import { formatCurrency } from '../../utils/formatters';
import { shortTestName } from './format';

export const hospitalHeaderFrom = (h: HospitalProfile): HospitalHeader => ({
  name: h.name,
  address: h.address,
  phone: h.phone,
  email: h.email,
  gstin: h.gstin,
  regNo: h.regNo,
});

const listOr = (items: string[] | undefined, empty: string): Pick<DocumentSection, 'bullets' | 'paragraphs'> =>
  items && items.length ? { bullets: items } : { paragraphs: [empty] };

const flagSuffix = (flag: 'H' | 'L' | null) => (flag === 'H' ? ' (High)' : flag === 'L' ? ' (Low)' : '');

interface PatientSummaryInput {
  patient: Patient;
  profile?: ClinicalProfile;
  vitals?: VitalsRecord;
  labResults: LabSample[];
  visits: Visit[];
  pendingBills: Invoice[];
  hospital: HospitalProfile;
  preparedBy: string;
}

/** One-page clinical summary shared from the patient record. */
export const buildPatientSummaryDoc = ({
  patient,
  profile,
  vitals,
  labResults,
  visits,
  pendingBills,
  hospital,
  preparedBy,
}: PatientSummaryInput): DocumentSpec => {
  const sections: DocumentSection[] = [
    {
      heading: 'Allergies',
      ...(profile ? listOr(profile.allergies, 'No known drug allergies (NKDA).') : { paragraphs: ['Allergy status not recorded.'] }),
    },
    { heading: 'Active Problems', ...listOr(profile?.conditions, 'No chronic conditions recorded.') },
    { heading: 'Current Medication', ...listOr(profile?.currentMedications, 'None.') },
  ];
  if (profile?.chiefComplaint) sections.push({ heading: 'Latest Complaint', paragraphs: [profile.chiefComplaint] });
  if (vitals) {
    const flags = vitalsFlags(vitals);
    const rows: Array<[string, string]> = [
      ['Recorded', `${formatDisplayDate(vitals.date)} • ${vitals.time} • ${vitals.recordedBy}`],
      ['Blood pressure', `${vitals.bp} mmHg`],
      ['Pulse', `${vitals.pulse} bpm`],
      ['SpO₂', `${vitals.spo2}%`],
      ['Temperature', `${vitals.temp} °F`],
    ];
    if (typeof vitals.respRate === 'number') rows.push(['Respiratory rate', `${vitals.respRate} /min`]);
    if (typeof vitals.sugar === 'number') rows.push(['Blood glucose', `${vitals.sugar} mg/dL`]);
    sections.push({
      heading: 'Latest Vitals',
      rows,
      paragraphs: flags.length ? [`Out of range: ${flags.map((f) => f.label).join('; ')}`] : undefined,
    });
  }
  const labRows = labResults
    .slice(0, 4)
    .flatMap((s) =>
      (s.parameters ?? []).map((p) => [
        formatDayMonth(s.date ?? ''),
        shortTestName(s.testName),
        p.name,
        `${formatParamValue(p)} ${p.unit}${flagSuffix(parameterFlag(p))}`,
        referenceText(p),
      ])
    );
  if (labRows.length) {
    sections.push({ heading: 'Recent Laboratory Results', table: { columns: ['Date', 'Test', 'Parameter', 'Result', 'Reference'], rows: labRows } });
  }
  if (visits.length) {
    sections.push({
      heading: 'Recent Encounters',
      table: {
        columns: ['Date', 'Type', 'Doctor', 'Diagnosis'],
        rows: visits.slice(0, 5).map((v) => [formatDisplayDate(v.date), v.type, v.doctorName, v.diagnosis || '—']),
      },
    });
  }
  if (pendingBills.length) {
    sections.push({
      heading: 'Outstanding Bills',
      table: {
        columns: ['Bill No', 'Description', 'Amount'],
        rows: pendingBills.map((i) => [i.invoiceNo, i.title, formatCurrency(i.amount)]),
        alignRight: [2],
      },
    });
  }
  return {
    title: 'Patient Clinical Summary',
    subtitle: `Generated on ${formatDisplayDate(new Date())} at ${formatClock()}`,
    meta: [
      ['Patient', patient.name],
      ['UHID', patient.uhid],
      ['Age / Gender', `${patient.age} yrs / ${patient.gender}`],
      ['Date of birth', patient.dob],
      ['Blood group', patient.bloodGroup],
      ['Phone', patient.phone],
      ['Insurance', patient.insurance],
      ['Status', patient.status === 'Admitted' ? `Admitted — ${patient.room ?? 'ward'}` : patient.status],
    ],
    sections,
    signatory: preparedBy,
    signatoryRole: 'Attending Physician',
    footer: 'Confidential medical record • Shared with patient consent (DPDP Act, 2023) • CareSync HMS',
    hospital: hospitalHeaderFrom(hospital),
  };
};

interface DischargeDocInput {
  summary: DischargeSummary;
  patient?: Patient;
  outstanding: number;
  hospital: HospitalProfile;
}

/** Printable discharge summary (clinical + prescription + bill). */
export const buildDischargeSummaryDoc = ({ summary, patient, outstanding, hospital }: DischargeDocInput): DocumentSpec => {
  const draft = summary.status === 'Draft';
  const meta: Array<[string, string]> = [
    ['Patient', summary.patientName],
    ['UHID', summary.uhid],
  ];
  if (patient) meta.push(['Age / Gender', `${patient.age} yrs / ${patient.gender}`]);
  meta.push(
    ['Room / Ward', summary.room],
    ['Admission date', summary.admissionDate],
    [draft ? 'Planned discharge' : 'Discharge date', summary.dischargeDate],
    ['Length of stay', summary.stayDuration],
    ['Consultant', summary.doctorName],
    ['Department', summary.department]
  );
  return {
    title: draft ? 'Discharge Summary (Draft)' : 'Discharge Summary',
    subtitle: draft ? 'Draft — pending consultant approval. Not valid for insurance claims.' : undefined,
    meta,
    sections: [
      { heading: 'Final Diagnosis', paragraphs: [summary.diagnosis] },
      { heading: 'Course in Hospital & Treatment Given', paragraphs: [summary.treatmentGiven] },
      { heading: 'Discharge Advice', ...listOr(summary.advice, 'As advised by the consultant.') },
      summary.prescriptions.length
        ? {
            heading: 'Discharge Prescription',
            table: {
              columns: ['Medicine', 'Dosage & frequency', 'Duration'],
              rows: summary.prescriptions.map((rx) => [rx.name, rx.dosage, rx.duration]),
            },
          }
        : { heading: 'Discharge Prescription', paragraphs: ['No medicines prescribed at discharge.'] },
      {
        heading: 'Bill Summary',
        rows: [
          ['Total charges', formatCurrency(summary.totalAmount)],
          ['Insurance approved', formatCurrency(summary.insuranceApproved)],
          ['Paid by patient', formatCurrency(summary.patientPaid)],
          ['Outstanding', outstanding > 0 ? formatCurrency(outstanding) : 'Nil'],
        ],
      },
    ],
    signatory: summary.doctorName,
    signatoryRole: `Consultant — ${summary.department}`,
    footer: `Bring this summary to your follow-up visit • Hospital helpline: ${hospital.phone} (24 x 7)`,
    hospital: hospitalHeaderFrom(hospital),
  };
};
