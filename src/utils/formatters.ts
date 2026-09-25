export const formatCurrency = (amount: number): string => {
  return '₹' + amount.toLocaleString('en-IN');
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

export const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero Rupees Only';
  num = Math.floor(Math.abs(num));

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

  return result.trim() + ' Rupees Only';
};

export const generateUHID = (): string => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `CC${year}${randomNum}`;
};

export const generateReceiptNo = (prefix: string = 'REG'): string => {
  const year = new Date().getFullYear();
  const randomNum = String(Math.floor(100 + Math.random() * 900)).padStart(5, '0');
  return `${prefix}-${year}-${randomNum}`;
};
