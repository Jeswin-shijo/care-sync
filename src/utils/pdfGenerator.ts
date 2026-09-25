import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { HOSPITAL_CONFIG } from '../constants/config';
import { numberToWords } from './formatters';

export interface ReceiptPrintData {
  receiptNo: string;
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
}

export const generateReceiptHtml = (data: ReceiptPrintData): string => {
  const itemsHtml = data.items && data.items.length > 0
    ? `
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="border-bottom: 2px solid #E2E8F0; text-align: left; font-size: 13px; color: #64748B;">
            <th style="padding: 8px 4px;">Particulars</th>
            ${data.items.some(i => i.qty) ? '<th style="padding: 8px 4px; text-align: center;">Qty</th>' : ''}
            ${data.items.some(i => i.rate) ? '<th style="padding: 8px 4px; text-align: right;">Rate</th>' : ''}
            <th style="padding: 8px 4px; text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr style="border-bottom: 1px solid #F1F5F9; font-size: 13px;">
              <td style="padding: 8px 4px; color: #1E293B;">${item.description}</td>
              ${data.items?.some(i => i.qty) ? `<td style="padding: 8px 4px; text-align: center; color: #64748B;">${item.qty ?? 1}</td>` : ''}
              ${data.items?.some(i => i.rate) ? `<td style="padding: 8px 4px; text-align: right; color: #64748B;">₹${(item.rate ?? item.amount).toLocaleString('en-IN')}</td>` : ''}
              <td style="padding: 8px 4px; text-align: right; font-weight: 600; color: #0F172A;">₹${item.amount.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @page { size: auto; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            background-color: #FFFFFF;
            padding: 24px;
            margin: 0;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
          }
          .receipt-box {
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #CBD5E1;
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
          .cross-icon {
            display: inline-block;
            background-color: #1E6BFF;
            color: white;
            font-weight: bold;
            font-size: 20px;
            width: 36px;
            height: 36px;
            line-height: 36px;
            border-radius: 8px;
            margin-bottom: 8px;
          }
          .hospital-name {
            font-size: 18px;
            font-weight: bold;
            color: #1E293B;
            margin: 0 0 4px 0;
          }
          .hospital-sub {
            font-size: 11px;
            color: #64748B;
            margin: 0;
            line-height: 1.4;
          }
          .receipt-title {
            text-align: center;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 1px;
            color: #1E6BFF;
            background: #EFF6FF;
            padding: 6px 12px;
            border-radius: 6px;
            display: inline-block;
            margin: 8px auto 16px auto;
          }
          .grid-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 16px;
            font-size: 13px;
          }
          .info-col {
            flex: 1;
          }
          .info-row {
            margin-bottom: 6px;
          }
          .label {
            color: #64748B;
            font-size: 12px;
          }
          .value {
            font-weight: 600;
            color: #1E293B;
          }
          .amount-box {
            background-color: #F8FAFC;
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .amount-paid {
            font-size: 20px;
            font-weight: 700;
            color: #1E6BFF;
          }
          .amount-words {
            font-size: 11px;
            font-style: italic;
            color: #64748B;
            margin-top: 8px;
          }
          .footer {
            margin-top: 32px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .signature-box {
            text-align: center;
            width: 140px;
          }
          .sign-line {
            border-top: 1px solid #94A3B8;
            margin-top: 30px;
            font-size: 11px;
            color: #64748B;
            padding-top: 4px;
          }
          .qr-placeholder {
            font-size: 11px;
            color: #94A3B8;
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <div class="cross-icon">+</div>
            <div class="hospital-name">${HOSPITAL_CONFIG.name}</div>
            <div class="hospital-sub">${HOSPITAL_CONFIG.address}</div>
            <div class="hospital-sub">GSTIN: ${HOSPITAL_CONFIG.gstin} | Phone: ${HOSPITAL_CONFIG.phone}</div>
          </div>

          <div style="text-align: center;">
            <div class="receipt-title">${data.receiptType.toUpperCase()}</div>
          </div>

          <div class="grid-info">
            <div class="info-col">
              <div class="info-row"><span class="label">Receipt No: </span><span class="value">${data.receiptNo}</span></div>
              <div class="info-row"><span class="label">Patient Name: </span><span class="value">${data.patientName}</span></div>
              <div class="info-row"><span class="label">UHID: </span><span class="value">${data.uhid}</span></div>
              ${data.doctorName ? `<div class="info-row"><span class="label">Doctor: </span><span class="value">${data.doctorName}</span></div>` : ''}
            </div>
            <div class="info-col" style="text-align: right;">
              <div class="info-row"><span class="label">Date: </span><span class="value">${data.date}</span></div>
              ${data.time ? `<div class="info-row"><span class="label">Time: </span><span class="value">${data.time}</span></div>` : ''}
              <div class="info-row"><span class="label">Payment Mode: </span><span class="value">${data.paymentMode}</span></div>
              ${data.department ? `<div class="info-row"><span class="label">Department: </span><span class="value">${data.department}</span></div>` : ''}
            </div>
          </div>

          ${itemsHtml}

          <div class="amount-box">
            <div>
              <div class="label">Total Amount Paid</div>
              <div class="amount-words">${numberToWords(data.amount)}</div>
            </div>
            <div class="amount-paid">₹${data.amount.toLocaleString('en-IN')}</div>
          </div>

          <div class="footer">
            <div class="qr-placeholder">
              CareSync SaaS • Electronic Verification Valid
            </div>
            <div class="signature-box">
              <div style="font-family: 'Brush Script MT', cursive; font-size: 16px; color: #1E293B;">Dr. Priya M.</div>
              <div class="sign-line">Authorized Signatory</div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 16px; font-size: 11px; color: #94A3B8;">
            Thank you for choosing ${HOSPITAL_CONFIG.name}
          </div>
        </div>
      </body>
    </html>
  `;
};

export const printOrShareReceipt = async (data: ReceiptPrintData, action: 'print' | 'share' | 'download' = 'download') => {
  try {
    const html = generateReceiptHtml(data);
    if (action === 'print') {
      await Print.printAsync({ html });
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${data.receiptNo}.pdf`,
        });
      } else {
        Alert.alert('PDF Generated', `Receipt saved to: ${uri}`);
      }
    }
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to process document');
  }
};
