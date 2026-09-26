import type { LabSample, Patient, RadiologyOrder } from '../../data/mockData';
import type { HospitalProfile } from '../../logic/hospital';
import { explainForPatient, parameterFlag } from '../../logic/clinical';
import type { DocumentSpec, HospitalHeader } from '../../utils/pdfGenerator';
import { formatDisplayDate, todayISO } from '../../utils/dates';
import { displayRef, displayValue } from './ParamTable';

/** PDF letterhead from the editable hospital profile. */
export const letterhead = (h: HospitalProfile): HospitalHeader => ({
  name: h.name,
  address: h.address,
  phone: h.phone,
  email: h.email,
  gstin: h.gstin,
  regNo: h.regNo,
});

/** Signed laboratory report for a completed / abnormal sample. */
export const labReportSpec = (
  sample: LabSample,
  hospital: HospitalProfile,
  opts: { patient?: Patient; forPatient?: boolean } = {}
): DocumentSpec => {
  const params = sample.parameters ?? [];
  const abnormal = sample.status === 'Abnormal';
  const sections: DocumentSpec['sections'] = [];
  if (params.length) {
    sections.push({
      heading: 'Results',
      table: {
        columns: ['Parameter', 'Result', 'Reference', 'Flag'],
        rows: params.map((p) => {
          const f = parameterFlag(p);
          return [p.name, `${displayValue(p)}${f === 'H' ? ' ↑' : f === 'L' ? ' ↓' : ''}`, displayRef(p), f === 'H' ? '↑ High' : f === 'L' ? '↓ Low' : 'Normal'];
        }),
      },
    });
  } else if (sample.resultValue) {
    sections.push({ heading: 'Results', paragraphs: [sample.resultValue] });
  }
  if (sample.flag) sections.push({ heading: 'Remarks', paragraphs: [sample.flag] });
  if (opts.forPatient) sections.push({ heading: 'What this means', paragraphs: [explainForPatient(sample)] });
  const p = opts.patient;
  return {
    title: 'Laboratory Report',
    subtitle: sample.testName,
    meta: [
      ['Patient', sample.patientName],
      ['UHID', sample.uhid],
      ...(p ? ([['Age / Gender', `${p.age} yrs / ${p.gender}`]] as Array<[string, string]>) : []),
      ['Sample ID', sample.sampleCode],
      ['Collected', `${formatDisplayDate(sample.date ?? todayISO())}${sample.collectedAt && sample.collectedAt !== '—' ? ` • ${sample.collectedAt}` : ''}`],
      ['Referred by', sample.orderedBy ?? '—'],
      ['Status', abnormal ? 'Abnormal — clinical correlation required' : 'Verified — within reference range'],
    ],
    sections,
    signatory: 'Vishnu Prasad',
    signatoryRole: 'Lab Technician • Verified & released',
    footer: 'Results relate only to the sample tested • Computer-generated report • CareSync LIS',
    hospital: letterhead(hospital),
  };
};

export const radiologyReportSpec = (order: RadiologyOrder, hospital: HospitalProfile, patient?: Patient): DocumentSpec => ({
  title: 'Radiology Report',
  subtitle: order.scanName,
  meta: [
    ['Patient', order.patientName],
    ...(patient ? ([['UHID', patient.uhid], ['Age / Gender', `${patient.age} yrs / ${patient.gender}`]] as Array<[string, string]>) : []),
    ['Modality', order.category],
    ['Study date', `${formatDisplayDate(order.date)} • ${order.time}`],
    ['Referred by', order.orderedBy],
  ],
  sections: [
    { heading: 'Findings', paragraphs: [order.findings ?? 'Report awaited.'] },
    { heading: 'Impression', paragraphs: [order.impression ?? '—'] },
  ],
  signatory: 'Department of Radiology',
  signatoryRole: 'Reporting Radiologist',
  hospital: letterhead(hospital),
});
