import type { UserRole } from './hospital';

/**
 * Role-based access (mock RBAC). Every staff role can open its own portal and
 * the modules its job needs; admins can open everything. Screens use
 * `canAccess` to show a lock and offer a role switch instead of silently
 * letting anyone in.
 */

export type ModuleId =
  | 'doctor-copilot'
  | 'nurse-portal'
  | 'lab-portal'
  | 'pharmacy-review'
  | 'patient-portal'
  | 'admin-portal'
  | 'pharmacy'
  | 'lab'
  | 'radiology'
  | 'billing'
  | 'financial-management'
  | 'reports'
  | 'settings'
  | 'blood-bank'
  | 'ambulance'
  | 'bed-management'
  | 'inventory'
  | 'documents'
  | 'opd-consultation'
  | 'ipd-admission'
  | 'discharge-summary'
  | 'register-patient'
  | 'appointments'
  | 'help-support';

export const ROLE_LABEL: Record<UserRole, string> = {
  doctor: 'Doctor',
  nurse: 'Nurse',
  lab: 'Lab Technician',
  pharmacy: 'Pharmacist',
  admin: 'Administrator',
  patient: 'Patient',
};

export const PORTAL_FOR_ROLE: Record<UserRole, string> = {
  doctor: '/doctor-copilot',
  nurse: '/nurse-portal',
  lab: '/lab-portal',
  pharmacy: '/pharmacy-review',
  admin: '/admin-portal',
  patient: '/patient-portal',
};

const COMMON: ModuleId[] = ['help-support', 'reports', 'settings'];

const ROLE_ACCESS: Record<UserRole, ModuleId[] | 'all'> = {
  admin: 'all',
  doctor: [
    ...COMMON,
    'doctor-copilot',
    'opd-consultation',
    'ipd-admission',
    'discharge-summary',
    'register-patient',
    'appointments',
    'lab',
    'radiology',
    'pharmacy',
    'bed-management',
    'blood-bank',
    'documents',
    'billing',
  ],
  nurse: [...COMMON, 'nurse-portal', 'bed-management', 'ipd-admission', 'discharge-summary', 'appointments', 'blood-bank', 'inventory', 'documents', 'ambulance'],
  lab: [...COMMON, 'lab-portal', 'lab', 'radiology', 'blood-bank', 'inventory', 'documents'],
  pharmacy: [...COMMON, 'pharmacy-review', 'pharmacy', 'inventory', 'billing'],
  patient: ['patient-portal', 'help-support'],
};

export const canAccess = (role: UserRole, module: ModuleId): boolean => {
  const access = ROLE_ACCESS[role];
  return access === 'all' || access.includes(module);
};

/** The role that "owns" a module — used to offer a one-tap role switch. */
export const ownerRoleFor = (module: ModuleId): UserRole => {
  switch (module) {
    case 'nurse-portal':
    case 'bed-management':
    case 'ambulance':
      return 'nurse';
    case 'lab-portal':
    case 'lab':
    case 'radiology':
      return 'lab';
    case 'pharmacy-review':
    case 'pharmacy':
    case 'inventory':
      return 'pharmacy';
    case 'patient-portal':
      return 'patient';
    case 'doctor-copilot':
    case 'opd-consultation':
    case 'ipd-admission':
    case 'discharge-summary':
    case 'register-patient':
    case 'appointments':
    case 'blood-bank':
    case 'documents':
      return 'doctor';
    default:
      return 'admin';
  }
};
