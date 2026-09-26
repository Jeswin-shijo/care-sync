import type { ModuleId } from '../../logic/access';

/** Display names for every RBAC module (typed so a new ModuleId can't be forgotten). */
export const MODULE_LABEL: Record<ModuleId, string> = {
  'doctor-copilot': 'Doctor Copilot',
  'nurse-portal': 'Nurse Ward',
  'lab-portal': 'Lab Portal',
  'pharmacy-review': 'Drug Safety',
  'patient-portal': 'Patient App',
  'admin-portal': 'Admin Portal',
  pharmacy: 'Pharmacy',
  lab: 'Laboratory',
  radiology: 'Radiology',
  billing: 'Billing',
  'financial-management': 'Financial Management',
  reports: 'Reports',
  settings: 'Settings',
  'blood-bank': 'Blood Bank',
  ambulance: 'Ambulance',
  'bed-management': 'Bed Management',
  inventory: 'Inventory',
  documents: 'Document Support',
  'opd-consultation': 'OPD Consultation',
  'ipd-admission': 'IPD Admission',
  'discharge-summary': 'Discharge Summary',
  'register-patient': 'Patient Registration',
  appointments: 'Appointments',
  'help-support': 'Help & Support',
};

export const ALL_MODULES = Object.keys(MODULE_LABEL) as ModuleId[];
