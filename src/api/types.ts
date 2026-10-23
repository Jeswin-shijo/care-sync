// Shapes returned by the MediOS backend (see ../hospital backend). Every record has
// a string `id`; dates are the clinic's display strings ("26 Sep 2026",
// "26 Sep 2026, 09:05 AM") except appointments, which use ISO days.

export type ApiRole = 'doctor' | 'admin' | 'staff' | 'nurse' | 'pharmacist' | 'lab';

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: ApiRole;
  specialty?: string;
  department?: string;
  doctorId?: string;
  avatar?: string;
  phone?: string;
}

export interface ApiPatient {
  id: string;
  uhid: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  dob?: string;
  address?: string;
  email?: string;
  emergencyContact?: string;
  avatar?: string;
  bloodGroup?: string;
  visitType?: 'OPD' | 'IPD';
  status?: 'Today' | 'Admitted' | 'Follow-up' | 'Discharged';
  department?: string;
  lastVisit?: string;
  nextAppointment?: string;
  doctor?: string;
  conditions?: string[];
  allergies?: string[];
  insurance?: { provider?: string; policyNumber?: string; validity?: string; coverageType?: string; claimStatus?: string };
  doNotCall?: boolean;
  createdAt?: string;
}

export type ApiAppointmentStatus = 'Checked In' | 'Waiting' | 'In Consultation' | 'Scheduled' | 'Completed' | 'Canceled' | 'No Show';

export interface ApiAppointment {
  id: string;
  uhid: string;
  patientName: string;
  age: number;
  gender: string;
  phone?: string;
  time: string;
  date: string;
  type: string;
  condition?: string;
  status: ApiAppointmentStatus;
  notes?: string;
  tags?: string[];
  confirmation?: string;
  bookedVia?: string;
}

export interface ApiConsultation {
  id: string;
  uhid: string;
  patientName: string;
  visitDate: string;
  visitTime: string;
  visitType: string;
  doctor: string;
  department: string;
  reason: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  freeText?: string;
  icd10?: { code: string; description: string; type: string }[];
  isFinal: boolean;
  createdAt?: string;
}

export interface ApiPrescriptionItem {
  medicine: string;
  brand?: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  instructions?: string;
  indication?: string;
  status?: string;
  startDate?: string;
}

export interface ApiPrescription {
  id: string;
  uhid: string;
  date: string;
  doctor: string;
  type: string;
  items: ApiPrescriptionItem[];
  additionalInstructions?: string;
}

export interface ApiMedication extends ApiPrescriptionItem {
  id: string;
  uhid: string;
}

export interface ApiVitals {
  id: string;
  uhid: string;
  recordedAt: string;
  recordedBy: string;
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  temperature?: number;
  spo2?: number;
  respiratoryRate?: number;
  bloodSugarFasting?: number;
}

export interface ApiLabParameter {
  name: string;
  result: number | string;
  referenceRange?: string;
  unit?: string;
  status?: string;
}

export interface ApiLabReport {
  id: string;
  uhid: string;
  testName: string;
  category: string;
  date: string;
  time: string;
  status: string;
  groups: { category: string; parameters: ApiLabParameter[] }[];
}

export interface ApiImaging {
  id: string;
  uhid: string;
  title: string;
  date: string;
  time: string;
  modality: string;
  bodyPart?: string;
  radiologist?: string;
  status: string;
  findings?: string[];
  impression?: string;
  radiologistReport?: { findings?: string; impression?: string; reportedBy?: string; status?: string };
}

export interface ApiBillItem {
  service: string;
  subCategory?: string;
  category?: string;
  qty: number;
  unitPrice: number;
  discount?: number;
  amount: number;
}

export interface ApiInvoice {
  id: string;
  billNumber: string;
  uhid: string;
  patientName: string;
  billDate: string;
  visitType: string;
  createdBy?: string;
  paymentMode: string;
  status: string;
  items: ApiBillItem[];
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  createdAt?: string;
}

export interface ApiDocument {
  id: string;
  uhid: string;
  title: string;
  category: string;
  date: string;
  author: string;
  department?: string;
  fileType?: string;
  fileSize?: string;
  status?: string;
  description?: string;
}

export interface ApiTask {
  id: string;
  title: string;
  subtitle: string;
  patientName: string;
  uhid: string;
  type: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDateTime: string;
  status: string;
  category: string;
  createdAt?: string;
}

export interface ApiSettings {
  profile?: { name?: string; designation?: string; specialization?: string; credentials?: string; phone?: string };
  /** name/address/phone/email come from the web app; the mobile app adds the rest. */
  hospital?: { name?: string; address?: string; phone?: string; email?: string; tagline?: string; website?: string; gstin?: string; regNo?: string };
  callAgent?: { clinicSessions?: string; slotMinutes?: number; closedDays?: string[] };
}
