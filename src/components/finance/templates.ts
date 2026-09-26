import { RECEIPT_TEMPLATES } from '../../data/mockData';
import type { Invoice } from '../../data/mockData';
import type { IconName } from './invoiceUtils';

/**
 * Receipt / document templates. RECEIPT_TEMPLATES from the data layer plus the
 * "Final Hospital Bill" shown in the design's template preview row.
 */
export type TemplateKind = 'invoice' | 'admission' | 'final-bill' | 'discharge' | 'claim';

export interface FinanceTemplate {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  invoiceType: Invoice['type'];
  kind: TemplateKind;
  /** Title pre-filled on Create Invoice when this template is used. */
  createTitle?: string;
}

export const FINAL_BILL_TEMPLATE_ID = 'tpl-final';

const KIND_BY_ID: Record<string, TemplateKind> = {
  'tpl-3': 'admission',
  'tpl-8': 'discharge',
  'tpl-9': 'claim',
};

const CREATE_TITLE_BY_ID: Record<string, string> = {
  'tpl-3': 'IPD Admission Advance',
  'tpl-9': 'IPD Final Bill (Insurance Claim)',
  [FINAL_BILL_TEMPLATE_ID]: 'Final Hospital Bill',
};

const INVOICE_TYPES: Invoice['type'][] = ['REG', 'OPD', 'IPD', 'Pharmacy', 'Lab', 'Radiology', 'Surgery'];
const asInvoiceType = (t: string): Invoice['type'] => INVOICE_TYPES.find((x) => x === t) ?? 'OPD';

const fromData: FinanceTemplate[] = RECEIPT_TEMPLATES.map((t) => ({
  id: t.id,
  title: t.title,
  subtitle: t.subtitle,
  icon: t.icon as IconName,
  color: t.color,
  invoiceType: asInvoiceType(t.invoiceType),
  kind: KIND_BY_ID[t.id] ?? 'invoice',
  createTitle: CREATE_TITLE_BY_ID[t.id],
}));

const FINAL_BILL: FinanceTemplate = {
  id: FINAL_BILL_TEMPLATE_ID,
  title: 'Final Hospital Bill',
  subtitle: 'Consolidated IPD bill — room, doctor, pharmacy, diagnostics',
  icon: 'receipt-outline',
  color: '#0EA5E9',
  invoiceType: 'IPD',
  kind: 'final-bill',
  createTitle: CREATE_TITLE_BY_ID[FINAL_BILL_TEMPLATE_ID],
};

/** Discharge Summary sits next to the Final Hospital Bill, as in the design. */
export const FINANCE_TEMPLATES: FinanceTemplate[] = (() => {
  const list = [...fromData];
  const dischargeAt = list.findIndex((t) => t.kind === 'discharge');
  list.splice(dischargeAt >= 0 ? dischargeAt + 1 : list.length, 0, FINAL_BILL);
  return list;
})();

export const findTemplate = (id?: string | string[]): FinanceTemplate | undefined => {
  const key = Array.isArray(id) ? id[0] : id;
  return key ? FINANCE_TEMPLATES.find((t) => t.id === key) : undefined;
};
