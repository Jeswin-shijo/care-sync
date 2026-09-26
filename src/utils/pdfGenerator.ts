import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { HOSPITAL_CONFIG } from '../constants/config';
import { formatCurrency, numberToWords } from './formatters';

/** A4 in PostScript points (expo-print defaults to US Letter). */
const A4 = { width: 595, height: 842 };

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export interface HospitalHeader {
  name: string;
  address: string;
  phone: string;
  email?: string;
  gstin: string;
  regNo?: string;
}

const defaultHospital: HospitalHeader = {
  name: HOSPITAL_CONFIG.name,
  address: HOSPITAL_CONFIG.address,
  phone: HOSPITAL_CONFIG.phone,
  email: HOSPITAL_CONFIG.email,
  gstin: HOSPITAL_CONFIG.gstin,
  regNo: HOSPITAL_CONFIG.regNo,
};

export interface ReceiptPrintData {
  receiptNo: string;
  /** Heading printed on the document, e.g. "Registration Receipt". */
  receiptType: string;
  date: string;
  time?: string;
  patientName: string;
  uhid: string;
  paymentMode: string;
  amount: number;
  items?: Array<{ description: string; qty?: number; rate?: number; amount: number }>;
  doctorName?: string;
  department?: string;
  room?: string;
  /** Pending invoices print as a bill with "Amount Due", never as a paid receipt. */
  status?: 'Paid' | 'Pending';
  insuranceCovered?: number;
  signatory?: string;
  footer?: string;
  hospital?: HospitalHeader;
}

const baseStyles = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; margin: 0; padding: 28px; }
  .sheet { max-width: 560px; margin: 0 auto; }
  .brand { text-align: center; border-bottom: 2px dashed #CBD5E1; padding-bottom: 14px; margin-bottom: 16px; }
  .logo { display: inline-block; width: 38px; height: 38px; border-radius: 10px; background: #1E6BFF; color: #fff; font-size: 26px; line-height: 38px; font-weight: 700; }
  .brand h1 { font-size: 19px; margin: 8px 0 2px; }
  .muted { color: #64748B; font-size: 11px; margin: 1px 0; }
  .title { text-align: center; margin: 6px 0 16px; }
  .title span { display: inline-block; background: #EFF6FF; color: #1E6BFF; border-radius: 6px; padding: 5px 14px; font-weight: 700; letter-spacing: 1.2px; font-size: 12px; text-transform: uppercase; }
  .stamp { display: inline-block; margin-left: 8px; border: 2px solid; border-radius: 6px; padding: 2px 8px; font-weight: 800; font-size: 11px; letter-spacing: 1px; }
  .paid { color: #059669; border-color: #059669; }
  .due { color: #DC2626; border-color: #DC2626; }
  table.meta { width: 100%; font-size: 12.5px; border-collapse: collapse; }
  table.meta td { padding: 4px 0; }
  table.meta td:last-child { text-align: right; font-weight: 600; }
  table.items { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12.5px; }
  table.items th { text-align: left; color: #64748B; font-weight: 600; border-bottom: 2px solid #E2E8F0; padding: 7px 4px; }
  table.items td { border-bottom: 1px solid #F1F5F9; padding: 7px 4px; }
  .num { text-align: right; }
  .center { text-align: center; }
  .total { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; margin-top: 8px; }
  .total .row { display: flex; justify-content: space-between; font-size: 13px; margin: 3px 0; }
  .total .grand { font-size: 17px; font-weight: 800; color: #1E6BFF; }
  .words { font-size: 11px; color: #64748B; font-style: italic; margin-top: 6px; }
  .sign { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 34px; font-size: 11px; color: #64748B; }
  .sign .who { text-align: center; }
  .sign .who b { display: block; color: #1E3A8A; font-size: 14px; font-style: italic; border-bottom: 1px solid #94A3B8; padding-bottom: 3px; margin-bottom: 3px; }
  .foot { text-align: center; font-size: 10px; color: #94A3B8; margin-top: 22px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px; color: #1E6BFF; margin: 18px 0 6px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
  p { font-size: 12.5px; line-height: 1.55; margin: 4px 0; }
  ul { margin: 4px 0; padding-left: 18px; font-size: 12.5px; line-height: 1.55; }
  .flag { color: #DC2626; font-weight: 700; }
`;

const brandHtml = (h: HospitalHeader) => `
  <div class="brand">
    <div class="logo">+</div>
    <h1>${escapeHtml(h.name)}</h1>
    <p class="muted">${escapeHtml(h.address)} • ${escapeHtml(h.phone)}</p>
    <p class="muted">GSTIN: ${escapeHtml(h.gstin)}${h.regNo ? ` • Reg. No: ${escapeHtml(h.regNo)}` : ''}</p>
  </div>`;

export const generateReceiptHtml = (data: ReceiptPrintData): string => {
  const h = data.hospital ?? defaultHospital;
  const paid = (data.status ?? 'Paid') === 'Paid';
  const items = data.items?.length ? data.items : [{ description: data.receiptType, qty: 1, amount: data.amount }];
  const showRate = items.some((i) => typeof i.rate === 'number');
  const gross = items.filter((i) => i.amount > 0).reduce((n, i) => n + i.amount, 0);
  const meta: Array<[string, string | undefined]> = [
    [paid ? 'Receipt No' : 'Bill No', data.receiptNo],
    ['Date & Time', `${data.date}${data.time ? ` • ${data.time}` : ''}`],
    ['Patient Name', data.patientName],
    ['UHID', data.uhid],
    ['Consultant', data.doctorName],
    ['Department', data.department],
    ['Room / Bed', data.room],
    [paid ? 'Payment Mode' : 'Status', paid ? data.paymentMode : 'Payment pending'],
  ];
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${baseStyles}</style></head><body><div class="sheet">
    ${brandHtml(h)}
    <div class="title"><span>${escapeHtml(data.receiptType)}</span><span class="stamp ${paid ? 'paid' : 'due'}">${paid ? 'PAID' : 'DUE'}</span></div>
    <table class="meta">${meta
      .filter(([, v]) => v)
      .map(([k, v]) => `<tr><td class="muted">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
      .join('')}</table>
    <table class="items">
      <thead><tr><th>Particulars</th><th class="center">Qty</th>${showRate ? '<th class="num">Rate</th>' : ''}<th class="num">Amount</th></tr></thead>
      <tbody>${items
        .map(
          (i) =>
            `<tr><td>${escapeHtml(i.description)}</td><td class="center">${i.qty ?? 1}</td>${
              showRate ? `<td class="num">${typeof i.rate === 'number' ? formatCurrency(i.rate, { decimals: 2 }) : '—'}</td>` : ''
            }<td class="num">${formatCurrency(i.amount, { decimals: 2 })}</td></tr>`
        )
        .join('')}</tbody>
    </table>
    <div class="total">
      ${data.insuranceCovered ? `<div class="row"><span>Gross charges</span><span>${formatCurrency(gross, { decimals: 2 })}</span></div><div class="row"><span>Insurance approved</span><span>- ${formatCurrency(data.insuranceCovered, { decimals: 2 })}</span></div>` : ''}
      <div class="row grand"><span>${paid ? 'Amount Paid' : 'Amount Due'}</span><span>${formatCurrency(data.amount, { decimals: 2 })}</span></div>
      <div class="words">${escapeHtml(numberToWords(data.amount))}</div>
    </div>
    <div class="sign">
      <div>For ${escapeHtml(h.name)}</div>
      <div class="who"><b>${escapeHtml(data.signatory ?? 'Billing Desk')}</b>Authorized Signatory</div>
    </div>
    <div class="foot">${escapeHtml(data.footer ?? `Thank you for choosing ${h.name}`)} • Computer-generated document</div>
  </div></body></html>`;
};

// -------------------------------------------------------------
// Generic clinical / report documents
// -------------------------------------------------------------
export interface DocumentSection {
  heading: string;
  rows?: Array<[string, string]>;
  paragraphs?: string[];
  bullets?: string[];
  table?: { columns: string[]; rows: string[][]; alignRight?: number[] };
}

export interface DocumentSpec {
  title: string;
  subtitle?: string;
  meta?: Array<[string, string]>;
  sections: DocumentSection[];
  signatory?: string;
  signatoryRole?: string;
  footer?: string;
  hospital?: HospitalHeader;
}

export const generateDocumentHtml = (doc: DocumentSpec): string => {
  const h = doc.hospital ?? defaultHospital;
  const section = (s: DocumentSection) => `
    <h2>${escapeHtml(s.heading)}</h2>
    ${s.rows ? `<table class="meta">${s.rows.map(([k, v]) => `<tr><td class="muted">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}</table>` : ''}
    ${(s.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
    ${s.bullets?.length ? `<ul>${s.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
    ${
      s.table
        ? `<table class="items"><thead><tr>${s.table.columns
            .map((c, i) => `<th class="${s.table!.alignRight?.includes(i) ? 'num' : ''}">${escapeHtml(c)}</th>`)
            .join('')}</tr></thead><tbody>${s.table.rows
            .map(
              (r) =>
                `<tr>${r
                  .map((cell, i) => {
                    const flagged = /\((High|Low)\)|↑|↓|abnormal/i.test(cell);
                    return `<td class="${s.table!.alignRight?.includes(i) ? 'num' : ''} ${flagged ? 'flag' : ''}">${escapeHtml(cell)}</td>`;
                  })
                  .join('')}</tr>`
            )
            .join('')}</tbody></table>`
        : ''
    }`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${baseStyles}</style></head><body><div class="sheet">
    ${brandHtml(h)}
    <div class="title"><span>${escapeHtml(doc.title)}</span></div>
    ${doc.subtitle ? `<p class="muted" style="text-align:center">${escapeHtml(doc.subtitle)}</p>` : ''}
    ${doc.meta ? `<table class="meta">${doc.meta.map(([k, v]) => `<tr><td class="muted">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}</table>` : ''}
    ${doc.sections.map(section).join('')}
    ${doc.signatory ? `<div class="sign"><div>For ${escapeHtml(h.name)}</div><div class="who"><b>${escapeHtml(doc.signatory)}</b>${escapeHtml(doc.signatoryRole ?? 'Authorized Signatory')}</div></div>` : ''}
    <div class="foot">${escapeHtml(doc.footer ?? 'Computer-generated document • CareSync Hospital Management System')}</div>
  </div></body></html>`;
};

export type ExportAction = 'print' | 'share' | 'download';

/**
 * Prints, or renders to an A4 PDF and opens the share sheet (Save to Files /
 * Drive / WhatsApp / Email). Returns true when the system dialog opened.
 */
export const exportHtml = async (html: string, fileTitle: string, action: ExportAction): Promise<boolean> => {
  try {
    if (action === 'print') {
      await Print.printAsync({ html, ...A4 });
      return true;
    }
    const { uri } = await Print.printToFileAsync({ html, ...A4 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: action === 'download' ? `Save ${fileTitle}` : `Share ${fileTitle}`,
      });
      return true;
    }
    Alert.alert('PDF ready', 'Sharing is not available on this device.');
    return false;
  } catch (error: any) {
    // iOS rejects printAsync when the user closes the print sheet — that's a cancel, not an error.
    if (action === 'print' && Platform.OS === 'ios') return false;
    Alert.alert('Could not create document', error?.message || 'Please try again.');
    return false;
  }
};

export const printOrShareReceipt = (data: ReceiptPrintData, action: ExportAction = 'download') =>
  exportHtml(generateReceiptHtml(data), `${data.receiptNo}.pdf`, action);

export const exportDocument = (doc: DocumentSpec, fileTitle: string, action: ExportAction = 'share') =>
  exportHtml(generateDocumentHtml(doc), fileTitle, action);
