/** "₹4,82,500" — Indian digit grouping; pass decimals: 2 for "₹500.00". Negatives render as "-₹500". */
export const formatCurrency = (amount: number, opts: { decimals?: number } = {}): string => {
  const decimals = opts.decimals ?? 0;
  const safe = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(safe).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals === 0 ? 2 : decimals,
  });
  return `${safe < 0 ? '-' : ''}₹${abs}`;
};

/** Compact rupees for tiles: ₹4.8L, ₹48.3L, ₹1.2Cr, ₹950. */
export const formatCompactCurrency = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2).replace(/\.?0+$/, '')}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${sign}₹${Math.round(abs)}`;
};

export const formatDate = (dateString?: string | Date): string => {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (timeString?: string | Date): string => {
  if (!timeString) return '';
  const date = typeof timeString === 'string' ? new Date(timeString) : timeString;
  if (isNaN(date.getTime())) return String(timeString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const numToWordsLessThanThousand = (num: number): string => {
  let str = '';
  if (num >= 100) {
    str += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    str += ones[num] + ' ';
  }
  return str.trim();
};

const integerToWords = (num: number): string => {
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  let result = '';
  if (crore > 0) result += numToWordsLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) result += numToWordsLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += numToWordsLessThanThousand(thousand) + ' Thousand ';
  if (hundred > 0) result += numToWordsLessThanThousand(hundred) + ' ';
  return result.trim();
};

/** "One Thousand Two Hundred Thirty Four Rupees and Fifty Paise Only" */
export const numberToWords = (num: number): string => {
  if (!Number.isFinite(num)) return 'Zero Rupees Only';
  const negative = num < 0;
  const abs = Math.abs(num);
  let rupees = Math.floor(abs);
  let paise = Math.round((abs - rupees) * 100);
  if (paise === 100) {
    rupees += 1;
    paise = 0;
  }
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';
  const parts: string[] = [];
  if (rupees > 0) parts.push(`${integerToWords(rupees)} Rupees`);
  if (paise > 0) parts.push(`${integerToWords(paise)} Paise`);
  return `${negative ? 'Minus ' : ''}${parts.join(' and ')} Only`;
};

export const generateUHID = (): string => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `CC${year}${randomNum}`;
};

/** @deprecated invoice numbers are sequential now — see nextInvoiceNumber in src/logic/billing.ts */
export const generateReceiptNo = (prefix: string = 'REG'): string => {
  const year = new Date().getFullYear();
  const randomNum = String(Math.floor(100 + Math.random() * 900)).padStart(5, '0');
  return `${prefix}-${year}-${randomNum}`;
};
