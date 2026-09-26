import type { DischargeSummary, LabSample, Patient, PatientDocument } from '../../data/mockData';
import type { HospitalProfile } from '../../logic/hospital';
import { formatParamValue, parameterFlag, referenceText } from '../../logic/clinical';
import type { DocumentSection, DocumentSpec, HospitalHeader } from '../../utils/pdfGenerator';
import { formatDisplayDate } from '../../utils/dates';
import { formatCurrency } from '../../utils/formatters';
import { colors } from '../../constants/theme';
import type { IconName } from './OpsUI';

export type DocType = PatientDocument['type'];

export const DOC_TYPES: DocType[] = ['Consent', 'ID Proof', 'Insurance', 'Lab Report', 'Discharge', 'Imaging'];

export const DOC_TYPE_META: Record<DocType, { icon: IconName; color: string; bg: string; description: string }> = {
  Consent: { icon: 'create-outline', color: colors.purple, bg: colors.purpleLight, description: 'Signed treatment / procedure consent' },
  'ID Proof': { icon: 'id-card-outline', color: colors.primary, bg: colors.primaryLight, description: 'Aadhaar, PAN, passport' },
  Insurance: { icon: 'shield-checkmark-outline', color: colors.teal, bg: colors.tealLight, description: 'Policy card, pre-authorisation' },
  'Lab Report': { icon: 'flask-outline', color: colors.rose, bg: colors.roseLight, description: 'Pathology & biochemistry' },
  Discharge: { icon: 'exit-outline', color: colors.orange, bg: colors.orangeLight, description: 'Discharge summary' },
  Imaging: { icon: 'scan-outline', color: colors.info, bg: colors.infoLight, description: 'X-ray, CT, MRI, ultrasound' },
};

export const TITLE_SUGGESTIONS: Record<DocType, string[]> = {
  Consent: ['General Consent', 'Surgical Consent', 'Anaesthesia Consent', 'Blood Transfusion Consent'],
  'ID Proof': ['Aadhaar Card', 'PAN Card', 'Passport', 'Voter ID'],
  Insurance: ['Insurance Card', 'Pre-authorization', 'Claim Form', 'TPA Approval Letter'],
  'Lab Report': ['CBC Report', 'LFT Report', 'HbA1c Report', 'Outside Lab Report'],
  Discharge: ['Discharge Summary', 'Referral Letter'],
  Imaging: ['Chest X-Ray Report', 'CT Scan Report', 'MRI Report', 'Ultrasound Report'],
};

const SIZE_RANGE_KB: Record<DocType, [number, number]> = {
  Consent: [280, 620],
  'ID Proof': [380, 900],
  Insurance: [700, 1600],
  'Lab Report': [140, 420],
  Discharge: [240, 380],
  Imaging: [1600, 3800],
};

/** Plausible file size for a scanned document of this type ("420 KB", "2.4 MB"). */
export const estimateSize = (type: DocType | null) => {
  const [lo, hi] = SIZE_RANGE_KB[type ?? 'Consent'];
  const kb = Math.round(lo + Math.random() * (hi - lo));
  return kb >= 1000 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
};

const LAB_KEYWORDS: Array<[RegExp, RegExp]> = [
  [/cbc|blood count|ha?emogram/i, /cbc|blood count/i],
  [/lft|liver/i, /lft|liver/i],
  [/kft|kidney|renal/i, /kft|kidney/i],
  [/hba1c|glyc/i, /hba1c/i],
  [/lipid/i, /lipid/i],
  [/thyroid|tsh/i, /thyroid/i],
];

/** Results the document most likely refers to (by test name in the title), else the latest two. */
export const labResultsForDocument = (doc: PatientDocument, results: LabSample[]) => {
  for (const [titleRe, testRe] of LAB_KEYWORDS) {
    if (!titleRe.test(doc.title)) continue;
    const matched = results.filter((r) => testRe.test(r.testName));
    if (matched.length) return matched.slice(0, 2);
  }
  return results.slice(0, 2);
};

export const toHospitalHeader = (h: HospitalProfile): HospitalHeader => ({
  name: h.name,
  address: h.address,
  phone: h.phone,
  email: h.email,
  gstin: h.gstin,
  regNo: h.regNo,
});

export const flaggedValue = (p: NonNullable<LabSample['parameters']>[number]) => {
  const f = parameterFlag(p);
  return `${formatParamValue(p)} ${p.unit}${f === 'H' ? ' (High)' : f === 'L' ? ' (Low)' : ''}`;
};

interface SpecInput {
  doc: PatientDocument;
  patient?: Patient;
  summary?: DischargeSummary | null;
  labResults?: LabSample[];
  hospital: HospitalHeader;
}

/** Printable copy of a vault document: metadata + the clinical content CareSync holds for it. */
export const buildDocumentSpec = ({ doc, patient, summary, labResults, hospital }: SpecInput): DocumentSpec => {
  const meta: Array<[string, string]> = [
    ['Patient', doc.patientName],
    ['UHID', patient?.uhid ?? '—'],
    ['Document type', doc.type],
    ['Document date', formatDisplayDate(doc.date)],
    ['Uploaded by', doc.uploadedBy],
    ['File size', doc.size],
    ['Reference', doc.id.toUpperCase()],
  ];
  const sections: DocumentSection[] = [];

  if (doc.type === 'Discharge' && summary) {
    sections.push({
      heading: 'Admission',
      rows: [
        ['Admitted', summary.admissionDate],
        ['Discharged', summary.dischargeDate],
        ['Length of stay', summary.stayDuration],
        ['Room', summary.room],
        ['Consultant', `${summary.doctorName} (${summary.department})`],
        ['Summary status', summary.status ?? 'Final'],
      ],
    });
    sections.push({ heading: 'Diagnosis', paragraphs: [summary.diagnosis] });
    sections.push({ heading: 'Treatment given', paragraphs: [summary.treatmentGiven] });
    if (summary.prescriptions.length) {
      sections.push({
        heading: 'Discharge medication',
        table: { columns: ['Medicine', 'Dosage', 'Duration'], rows: summary.prescriptions.map((p) => [p.name, p.dosage, p.duration]) },
      });
    }
    if (summary.advice.length) sections.push({ heading: 'Advice on discharge', bullets: summary.advice });
    sections.push({
      heading: 'Billing',
      rows: [
        ['Total charges', formatCurrency(summary.totalAmount)],
        ['Insurance approved', formatCurrency(summary.insuranceApproved)],
        ['Paid by patient', formatCurrency(summary.patientPaid)],
      ],
    });
  } else if (doc.type === 'Lab Report' && labResults?.length) {
    labResults.forEach((r) =>
      sections.push({
        heading: `${r.testName} • ${r.date ? formatDisplayDate(r.date) : r.collectedAt}`,
        table: {
          columns: ['Parameter', 'Result', 'Reference'],
          rows: (r.parameters ?? []).map((p) => [p.name, flaggedValue(p), `${referenceText(p)} ${p.unit}`]),
          alignRight: [1],
        },
        paragraphs: r.flag ? [r.flag] : undefined,
      })
    );
  } else {
    sections.push({
      heading: 'Document record',
      paragraphs: [
        `${doc.title} is held in the CareSync document vault for ${doc.patientName}.`,
        `Filed as ${doc.type} on ${formatDisplayDate(doc.date)} by ${doc.uploadedBy}. The original is available at the Medical Records desk.`,
      ],
    });
  }

  const discharge = doc.type === 'Discharge' && !!summary;
  return {
    title: doc.title,
    subtitle: `${doc.type} • ${doc.patientName}`,
    meta,
    sections,
    signatory: discharge ? summary!.doctorName : 'Medical Records Officer',
    signatoryRole: discharge ? 'Treating Consultant' : 'Authorized Signatory',
    footer: 'Computer-generated copy from the CareSync document vault',
    hospital,
  };
};

export const exportFileName = (doc: PatientDocument) =>
  `${doc.title} - ${doc.patientName}`.replace(/[^\w\- ]+/g, '').replace(/\s+/g, ' ').trim() + '.pdf';
