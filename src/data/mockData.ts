import {
  addDays,
  clockToMinutes,
  dobYearsAgo,
  expiryMonthsAhead,
  formatDisplayDate,
  isoDaysFromToday,
  startOfToday,
} from '../utils/dates';

/**
 * CareSync mock data.
 *
 * Everything is internally consistent (one hospital, one set of patients) and
 * dated relative to *today*, so the app always looks live. Screens read this
 * through AppContext; replace AppContext's initial state with API calls when a
 * backend exists.
 */

const D = (days: number) => isoDaysFromToday(days);
const display = (days: number) => formatDisplayDate(addDays(startOfToday(), days));
const minutesAgo = (m: number) => Date.now() - m * 60000;

// -------------------------------------------------------------
// Core entities
// -------------------------------------------------------------
export interface Patient {
  id: string;
  uhid: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  dob: string;
  address: string;
  bloodGroup: string;
  insurance: string;
  status: 'Active' | 'Admitted' | 'Discharged';
  room?: string;
  registeredDate: string;
  avatar?: string;
  /** Ward whose bed the patient occupies while admitted. */
  wardId?: string;
  /** ISO dates of the current / most recent admission. */
  admittedOn?: string;
  dischargedOn?: string;
  department?: string;
  attendingDoctor?: string;
  email?: string;
  emergencyContact?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  room: string;
  fee: number;
  timing: string;
  rating: number;
  experienceYears: number;
  availableDays: string[];
  qualification?: string;
  /** Bookable consultation slots. */
  slots?: string[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  type: 'OPD' | 'IPD' | 'Follow Up';
  time: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  status: 'Confirmed' | 'Waiting' | 'Not Arrived' | 'Completed' | 'In Consultation' | 'Cancelled';
  tokenNo: number;
  reason?: string;
}

export interface InvoiceItem {
  description: string;
  qty?: number;
  rate?: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  title: string;
  type: 'REG' | 'OPD' | 'IPD' | 'Pharmacy' | 'Lab' | 'Radiology' | 'Surgery';
  patientId: string;
  patientName: string;
  uhid: string;
  /** Display date, e.g. "26 Sep 2026". */
  date: string;
  time: string;
  amount: number;
  paymentMode: 'UPI' | 'Cash' | 'Card' | 'Net Banking';
  status: 'Paid' | 'Pending';
  doctorName?: string;
  items?: InvoiceItem[];
  /** ISO date for filtering (today's collection, reports). */
  dateISO?: string;
  paidAt?: string;
  insuranceCovered?: number;
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  dosageForm: string;
  stock: number;
  price: number;
  /** MM/YY */
  expiry: string;
  /** Units on a pending purchase indent. */
  onOrder?: number;
}

export interface LabTest {
  id: string;
  name: string;
  category: 'Biochemistry' | 'Hematology' | 'Microbiology' | 'Pathology';
  turnaroundTime: string;
  price: number;
}

export interface RadiologyScan {
  id: string;
  name: string;
  category: 'X-Ray' | 'CT Scan' | 'MRI' | 'Ultrasound' | 'Mammography';
  duration: string;
  price: number;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  category: 'Appointments' | 'Billing' | 'System';
  timestamp: string;
  read: boolean;
  /** Epoch ms — lets screens render live relative times ("5m ago"). */
  createdAt?: number;
  /** Route to open when the notification is tapped. */
  route?: string;
  params?: Record<string, string>;
}

/** Stock at or below this is "Low Stock". */
export const LOW_STOCK_THRESHOLD = 40;

// -------------------------------------------------------------
// Patients
// -------------------------------------------------------------
export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    uhid: 'CC202500125',
    name: 'Ananya S',
    age: 32,
    gender: 'Female',
    phone: '+91 98765 43210',
    dob: dobYearsAgo(32, 4, 14),
    address: '12, Green Park, Kochi, Kerala',
    bloodGroup: 'B+',
    insurance: 'Star Health (Active)',
    status: 'Active',
    registeredDate: D(-260),
    admittedOn: D(-9),
    dischargedOn: D(-4),
    department: 'General Medicine',
    attendingDoctor: 'Dr. Priya Menon',
    email: 'ananya.s@gmail.com',
    emergencyContact: 'Suresh S (Husband) • +91 98765 11122',
  },
  {
    id: 'pat-2',
    uhid: 'CC202500126',
    name: 'Rahul Nair',
    age: 45,
    gender: 'Male',
    phone: '+91 98451 23456',
    dob: dobYearsAgo(45, 6, 8),
    address: '45, Marine Drive, Kochi, Kerala',
    bloodGroup: 'O+',
    insurance: 'HDFC ERGO (Active)',
    status: 'Active',
    registeredDate: D(-225),
    department: 'Cardiology',
    attendingDoctor: 'Dr. Arjun Nair',
    emergencyContact: 'Divya Nair (Wife) • +91 98451 99887',
  },
  {
    id: 'pat-3',
    uhid: 'CC202500127',
    name: 'Sneha Joseph',
    age: 29,
    gender: 'Female',
    phone: '+91 97455 67890',
    dob: dobYearsAgo(29, 11, 22),
    address: '88, Panampilly Nagar, Kochi, Kerala',
    bloodGroup: 'A+',
    insurance: 'Care Health (Active)',
    status: 'Active',
    registeredDate: D(-210),
    department: 'Dermatology',
    attendingDoctor: 'Dr. Anil Kumar',
  },
  {
    id: 'pat-4',
    uhid: 'CC202500128',
    name: 'Vikram K',
    age: 52,
    gender: 'Male',
    phone: '+91 94471 12233',
    dob: dobYearsAgo(52, 3, 17),
    address: '19, Fort Kochi, Kerala',
    bloodGroup: 'AB+',
    insurance: 'Max Bupa (Active)',
    status: 'Admitted',
    room: 'Deluxe Suite 101',
    wardId: 'ward-deluxe',
    admittedOn: D(-2),
    registeredDate: D(-195),
    department: 'Orthopedics',
    attendingDoctor: 'Dr. Rajesh Varma',
    emergencyContact: 'Lakshmi K (Wife) • +91 94471 44556',
  },
  {
    id: 'pat-5',
    uhid: 'CC202500129',
    name: 'Meera Krishnan',
    age: 42,
    gender: 'Female',
    phone: '+91 98950 33445',
    dob: dobYearsAgo(42, 1, 5),
    address: '7A, Skyline Apts, Kakkanad, Kochi',
    bloodGroup: 'B-',
    insurance: 'New India Assurance (Active)',
    status: 'Active',
    registeredDate: D(-160),
    department: 'General Medicine',
    attendingDoctor: 'Dr. Priya Menon',
  },
  {
    id: 'pat-6',
    uhid: 'CC202600142',
    name: 'Arun Kumar',
    age: 42,
    gender: 'Male',
    phone: '+91 99470 21876',
    dob: dobYearsAgo(42, 7, 19),
    address: '23, Vyttila Junction, Kochi, Kerala',
    bloodGroup: 'O+',
    insurance: 'Star Health (Active)',
    status: 'Admitted',
    room: 'Ward A • Bed 14',
    wardId: 'ward-gen-a',
    admittedOn: D(-3),
    registeredDate: D(-3),
    department: 'General Medicine',
    attendingDoctor: 'Dr. Priya Menon',
  },
  {
    id: 'pat-7',
    uhid: 'CC202600143',
    name: 'Maria Joseph',
    age: 56,
    gender: 'Female',
    phone: '+91 94960 55120',
    dob: dobYearsAgo(56, 2, 11),
    address: '5, Church Road, Edappally, Kochi',
    bloodGroup: 'A-',
    insurance: 'Niva Bupa (Active)',
    status: 'Admitted',
    room: 'Ward B • Bed 04',
    wardId: 'ward-gen-b',
    admittedOn: D(-4),
    registeredDate: D(-120),
    department: 'General Medicine',
    attendingDoctor: 'Dr. Priya Menon',
  },
  {
    id: 'pat-8',
    uhid: 'CC202600151',
    name: 'Suresh Kumar',
    age: 31,
    gender: 'Male',
    phone: '+91 90480 77341',
    dob: dobYearsAgo(31, 10, 2),
    address: '41, Kaloor, Kochi, Kerala',
    bloodGroup: 'B+',
    insurance: 'Self Pay',
    status: 'Active',
    registeredDate: D(-21),
    department: 'General Medicine',
    attendingDoctor: 'Dr. Priya Menon',
  },
  {
    id: 'pat-9',
    uhid: 'CC202500099',
    name: 'Ramanathan G',
    age: 67,
    gender: 'Male',
    phone: '+91 94472 60011',
    dob: dobYearsAgo(67, 12, 30),
    address: '2, Temple Street, Tripunithura, Kochi',
    bloodGroup: 'O-',
    insurance: 'CGHS (Active)',
    status: 'Admitted',
    room: 'ICU • Bed 3',
    wardId: 'ward-icu',
    admittedOn: D(-5),
    registeredDate: D(-400),
    department: 'Critical Care',
    attendingDoctor: 'Dr. Farhan Ali',
  },
  {
    id: 'pat-10',
    uhid: 'CC202500112',
    name: 'George Thomas',
    age: 71,
    gender: 'Male',
    phone: '+91 98470 31245',
    dob: dobYearsAgo(71, 5, 9),
    address: '17, Beach Road, Fort Kochi, Kerala',
    bloodGroup: 'A+',
    insurance: 'LIC Health (Active)',
    status: 'Admitted',
    room: 'ICU • Bed 5',
    wardId: 'ward-icu',
    admittedOn: D(-2),
    registeredDate: D(-330),
    department: 'Cardiology',
    attendingDoctor: 'Dr. Arjun Nair',
  },
  {
    id: 'pat-11',
    uhid: 'CC202500084',
    name: 'Sunita Patel',
    age: 58,
    gender: 'Female',
    phone: '+91 97786 45120',
    dob: dobYearsAgo(58, 8, 25),
    address: '9, Kadavanthra, Kochi, Kerala',
    bloodGroup: 'B+',
    insurance: 'ICICI Lombard (Active)',
    status: 'Admitted',
    room: 'Deluxe Suite 104',
    wardId: 'ward-deluxe',
    admittedOn: D(-3),
    registeredDate: D(-500),
    department: 'General Surgery',
    attendingDoctor: 'Dr. Rajesh Varma',
  },
  {
    id: 'pat-12',
    uhid: 'CC202600160',
    name: 'Kavya Menon',
    age: 24,
    gender: 'Female',
    phone: '+91 90372 11890',
    dob: dobYearsAgo(24, 3, 3),
    address: '64, Palarivattom, Kochi, Kerala',
    bloodGroup: 'AB-',
    insurance: 'Self Pay',
    status: 'Discharged',
    admittedOn: D(-6),
    dischargedOn: D(-1),
    registeredDate: D(-6),
    department: 'General Medicine',
    attendingDoctor: 'Dr. Priya Menon',
  },
];

// -------------------------------------------------------------
// Doctors
// -------------------------------------------------------------
const MORNING_SLOTS = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM'];
const LATE_MORNING_SLOTS = ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM'];
const AFTERNOON_SLOTS = ['02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'];

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Priya Menon',
    specialty: 'General Physician',
    department: 'General Medicine',
    room: 'Room 201',
    fee: 500,
    timing: '10:00 AM - 2:00 PM',
    rating: 4.8,
    experienceYears: 12,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    qualification: 'MBBS, MD (General Medicine)',
    slots: LATE_MORNING_SLOTS,
  },
  {
    id: 'doc-2',
    name: 'Dr. Arjun Nair',
    specialty: 'Cardiologist',
    department: 'Cardiology',
    room: 'Room 305',
    fee: 800,
    timing: '9:00 AM - 1:00 PM',
    rating: 4.7,
    experienceYears: 15,
    availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
    qualification: 'MBBS, MD, DM (Cardiology)',
    slots: MORNING_SLOTS,
  },
  {
    id: 'doc-3',
    name: 'Dr. Sneha Joseph',
    specialty: 'Gynecologist',
    department: 'Gynecology',
    room: 'Room 104',
    fee: 700,
    timing: '11:00 AM - 3:00 PM',
    rating: 4.6,
    experienceYears: 10,
    availableDays: ['Tue', 'Thu', 'Sat'],
    qualification: 'MBBS, MS (OBG)',
    slots: ['11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '02:00 PM', '02:30 PM'],
  },
  {
    id: 'doc-4',
    name: 'Dr. Rajesh Varma',
    specialty: 'Orthopedics',
    department: 'Orthopedics',
    room: 'Room 208',
    fee: 750,
    timing: '2:00 PM - 6:00 PM',
    rating: 4.9,
    experienceYears: 18,
    availableDays: ['Mon', 'Tue', 'Thu', 'Fri', 'Sat'],
    qualification: 'MBBS, MS (Ortho)',
    slots: AFTERNOON_SLOTS,
  },
  {
    id: 'doc-5',
    name: 'Dr. Deepa Mohan',
    specialty: 'Pediatrician',
    department: 'Pediatrics',
    room: 'Room 102',
    fee: 600,
    timing: '9:30 AM - 1:30 PM',
    rating: 4.8,
    experienceYears: 9,
    availableDays: ['Mon', 'Wed', 'Thu', 'Sat'],
    qualification: 'MBBS, MD (Pediatrics)',
    slots: ['09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM'],
  },
  {
    id: 'doc-6',
    name: 'Dr. Anil Kumar',
    specialty: 'Dermatologist',
    department: 'Dermatology',
    room: 'Room 110',
    fee: 600,
    timing: '11:00 AM - 4:00 PM',
    rating: 4.5,
    experienceYears: 11,
    availableDays: ['Mon', 'Tue', 'Thu', 'Sat'],
    qualification: 'MBBS, MD (Dermatology)',
    slots: ['11:00 AM', '11:30 AM', '12:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'],
  },
  {
    id: 'doc-7',
    name: 'Dr. Lakshmi Iyer',
    specialty: 'ENT Specialist',
    department: 'ENT',
    room: 'Room 115',
    fee: 550,
    timing: '9:00 AM - 12:30 PM',
    rating: 4.6,
    experienceYears: 8,
    availableDays: ['Tue', 'Wed', 'Fri', 'Sat'],
    qualification: 'MBBS, MS (ENT)',
    slots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM'],
  },
  {
    id: 'doc-8',
    name: 'Dr. Thomas Mathew',
    specialty: 'Neurologist',
    department: 'Neurology',
    room: 'Room 310',
    fee: 900,
    timing: '2:00 PM - 6:00 PM',
    rating: 4.8,
    experienceYears: 20,
    availableDays: ['Mon', 'Wed', 'Sat'],
    qualification: 'MBBS, MD, DM (Neurology)',
    slots: AFTERNOON_SLOTS,
  },
  {
    id: 'doc-9',
    name: 'Dr. Farhan Ali',
    specialty: 'Intensivist',
    department: 'Critical Care',
    room: 'ICU Block',
    fee: 1000,
    timing: '24 x 7 On-call',
    rating: 4.7,
    experienceYears: 14,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    qualification: 'MBBS, MD, IDCCM',
    slots: ['09:00 AM', '12:00 PM', '03:00 PM', '06:00 PM'],
  },
];

// -------------------------------------------------------------
// Appointments (yesterday → next few days)
// -------------------------------------------------------------
/**
 * Suresh Kumar's follow-up is a "no-show" only once its slot has passed today
 * (at least 45 min ago); earlier in the day it is simply an upcoming booking.
 */
const MISSED_SLOT = (() => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return [...LATE_MORNING_SLOTS].reverse().find((t) => clockToMinutes(t) <= nowMinutes - 45);
})();

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    patientId: 'pat-1',
    patientName: 'Ananya S',
    doctorId: 'doc-1',
    doctorName: 'Dr. Priya Menon',
    department: 'General Medicine',
    type: 'OPD',
    time: '09:00 AM',
    date: D(0),
    status: 'Confirmed',
    tokenNo: 1,
    reason: 'Fever for 3 days, body ache',
  },
  {
    id: 'apt-2',
    patientId: 'pat-2',
    patientName: 'Rahul Nair',
    doctorId: 'doc-2',
    doctorName: 'Dr. Arjun Nair',
    department: 'Cardiology',
    type: 'OPD',
    time: '10:00 AM',
    date: D(0),
    status: 'Confirmed',
    tokenNo: 2,
    reason: 'TMT & lipid profile review',
  },
  {
    id: 'apt-3',
    patientId: 'pat-3',
    patientName: 'Sneha Joseph',
    doctorId: 'doc-6',
    doctorName: 'Dr. Anil Kumar',
    department: 'Dermatology',
    type: 'OPD',
    time: '11:30 AM',
    date: D(0),
    status: 'Waiting',
    tokenNo: 3,
    reason: 'Itchy rash on forearms',
  },
  {
    id: 'apt-4',
    patientId: 'pat-8',
    patientName: 'Suresh Kumar',
    doctorId: 'doc-1',
    doctorName: 'Dr. Priya Menon',
    department: 'General Medicine',
    type: 'Follow Up',
    time: MISSED_SLOT ?? '12:30 PM',
    date: D(0),
    status: MISSED_SLOT ? 'Not Arrived' : 'Confirmed',
    tokenNo: 4,
    reason: 'Post-dengue platelet check',
  },
  {
    id: 'apt-5',
    patientId: 'pat-4',
    patientName: 'Vikram K',
    doctorId: 'doc-4',
    doctorName: 'Dr. Rajesh Varma',
    department: 'Orthopedics',
    type: 'IPD',
    time: '01:00 PM',
    date: D(0),
    status: 'Confirmed',
    tokenNo: 5,
    reason: 'Bedside review — right knee',
  },
  {
    id: 'apt-6',
    patientId: 'pat-5',
    patientName: 'Meera Krishnan',
    doctorId: 'doc-1',
    doctorName: 'Dr. Priya Menon',
    department: 'General Medicine',
    type: 'OPD',
    time: '02:30 PM',
    date: D(0),
    status: 'Confirmed',
    tokenNo: 6,
    reason: 'Diabetes review (HbA1c)',
  },
  {
    id: 'apt-7',
    patientId: 'pat-2',
    patientName: 'Rahul Nair',
    doctorId: 'doc-2',
    doctorName: 'Dr. Arjun Nair',
    department: 'Cardiology',
    type: 'OPD',
    time: '09:30 AM',
    date: D(-1),
    status: 'Completed',
    tokenNo: 3,
    reason: 'Exertional chest discomfort',
  },
  {
    id: 'apt-8',
    patientId: 'pat-12',
    patientName: 'Kavya Menon',
    doctorId: 'doc-1',
    doctorName: 'Dr. Priya Menon',
    department: 'General Medicine',
    type: 'Follow Up',
    time: '11:00 AM',
    date: D(1),
    status: 'Confirmed',
    tokenNo: 2,
    reason: 'Post-discharge review (dengue)',
  },
  {
    id: 'apt-9',
    patientId: 'pat-3',
    patientName: 'Sneha Joseph',
    doctorId: 'doc-3',
    doctorName: 'Dr. Sneha Joseph',
    department: 'Gynecology',
    type: 'OPD',
    time: '02:00 PM',
    date: D(2),
    status: 'Confirmed',
    tokenNo: 4,
    reason: 'Annual wellness check',
  },
  {
    id: 'apt-10',
    patientId: 'pat-1',
    patientName: 'Ananya S',
    doctorId: 'doc-1',
    doctorName: 'Dr. Priya Menon',
    department: 'General Medicine',
    type: 'Follow Up',
    time: '10:30 AM',
    date: D(3),
    status: 'Confirmed',
    tokenNo: 3,
    reason: 'Discharge follow-up (1 week)',
  },
  {
    id: 'apt-11',
    patientId: 'pat-5',
    patientName: 'Meera Krishnan',
    doctorId: 'doc-7',
    doctorName: 'Dr. Lakshmi Iyer',
    department: 'ENT',
    type: 'OPD',
    time: '10:00 AM',
    date: D(4),
    status: 'Confirmed',
    tokenNo: 1,
    reason: 'Recurrent sinusitis',
  },
];

// -------------------------------------------------------------
// Invoices
// -------------------------------------------------------------
export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNo: 'REG-2026-00125',
    title: 'Registration Fee',
    type: 'REG',
    patientId: 'pat-1',
    patientName: 'Ananya S',
    uhid: 'CC202500125',
    date: display(0),
    dateISO: D(0),
    time: '10:05 AM',
    amount: 500,
    paymentMode: 'UPI',
    status: 'Paid',
    items: [{ description: 'Patient Registration & Smart UHID Card', qty: 1, rate: 500, amount: 500 }],
  },
  {
    id: 'inv-2',
    invoiceNo: 'OPD-2026-00891',
    title: 'OPD Consultation Fee',
    type: 'OPD',
    patientId: 'pat-2',
    patientName: 'Rahul Nair',
    uhid: 'CC202500126',
    date: display(-1),
    dateISO: D(-1),
    time: '09:45 AM',
    amount: 1200,
    paymentMode: 'Cash',
    status: 'Paid',
    doctorName: 'Dr. Arjun Nair (Cardiology)',
    items: [
      { description: 'Specialist Consultation (Cardiology)', qty: 1, rate: 800, amount: 800 },
      { description: 'ECG Screening Routine', qty: 1, rate: 400, amount: 400 },
    ],
  },
  {
    id: 'inv-3',
    invoiceNo: 'PH-2026-00321',
    title: 'Pharmacy Bill',
    type: 'Pharmacy',
    patientId: 'pat-3',
    patientName: 'Sneha Joseph',
    uhid: 'CC202500127',
    date: display(0),
    dateISO: D(0),
    time: '09:10 AM',
    amount: 650,
    paymentMode: 'UPI',
    status: 'Paid',
    items: [
      { description: 'Cetirizine 10mg', qty: 10, rate: 8, amount: 80 },
      { description: 'Pantoprazole 40mg', qty: 10, rate: 35, amount: 350 },
      { description: 'Moisturising Emollient Cream 100g', qty: 1, rate: 220, amount: 220 },
    ],
  },
  {
    id: 'inv-4',
    invoiceNo: 'LB-2026-00456',
    title: 'Laboratory Bill',
    type: 'Lab',
    patientId: 'pat-4',
    patientName: 'Vikram K',
    uhid: 'CC202500128',
    date: display(0),
    dateISO: D(0),
    time: '08:50 AM',
    amount: 1800,
    paymentMode: 'Card',
    status: 'Paid',
    items: [
      { description: 'Complete Blood Count (CBC)', qty: 1, rate: 300, amount: 300 },
      { description: 'LFT (Liver Function Test)', qty: 1, rate: 600, amount: 600 },
      { description: 'KFT (Kidney Function Test)', qty: 1, rate: 700, amount: 700 },
      { description: 'Urine Routine & Microscopy', qty: 1, rate: 200, amount: 200 },
    ],
  },
  {
    id: 'inv-5',
    invoiceNo: 'IPD-2026-00078',
    title: 'Room Charges (IPD)',
    type: 'IPD',
    patientId: 'pat-4',
    patientName: 'Vikram K',
    uhid: 'CC202500128',
    date: display(0),
    dateISO: D(0),
    time: '08:30 AM',
    amount: 4500,
    paymentMode: 'Net Banking',
    status: 'Pending',
    items: [
      { description: 'Deluxe Room Charge (Day 2)', qty: 1, rate: 3500, amount: 3500 },
      { description: 'Nursing Care & Monitoring', qty: 1, rate: 1000, amount: 1000 },
    ],
  },
  {
    id: 'inv-6',
    invoiceNo: 'SUR-2026-00031',
    title: 'Surgery Balance — Lap. Cholecystectomy',
    type: 'Surgery',
    patientId: 'pat-11',
    patientName: 'Sunita Patel',
    uhid: 'CC202500084',
    date: display(-1),
    dateISO: D(-1),
    time: '05:40 PM',
    amount: 14000,
    paymentMode: 'Card',
    status: 'Pending',
    doctorName: 'Dr. Rajesh Varma (General Surgery)',
    insuranceCovered: 48000,
    items: [
      { description: 'Surgeon & Anaesthetist Fees', qty: 1, rate: 38000, amount: 38000 },
      { description: 'Operation Theatre & Consumables', qty: 1, rate: 24000, amount: 24000 },
      { description: 'Less: Insurance approved (ICICI Lombard)', qty: 1, rate: -48000, amount: -48000 },
    ],
  },
  {
    id: 'inv-7',
    invoiceNo: 'IPD-2026-00081',
    title: 'ICU Charges (Day 2)',
    type: 'IPD',
    patientId: 'pat-10',
    patientName: 'George Thomas',
    uhid: 'CC202500112',
    date: display(0),
    dateISO: D(0),
    time: '07:30 AM',
    amount: 12500,
    paymentMode: 'Card',
    status: 'Pending',
    doctorName: 'Dr. Arjun Nair (Cardiology)',
    items: [
      { description: 'ICU Bed Charge', qty: 1, rate: 7500, amount: 7500 },
      { description: 'Cardiac Monitoring & Infusion Pumps', qty: 1, rate: 3000, amount: 3000 },
      { description: 'Intensivist Rounds', qty: 2, rate: 1000, amount: 2000 },
    ],
  },
  {
    id: 'inv-8',
    invoiceNo: 'RAD-2026-00112',
    title: 'Radiology Bill',
    type: 'Radiology',
    patientId: 'pat-7',
    patientName: 'Maria Joseph',
    uhid: 'CC202600143',
    date: display(0),
    dateISO: D(0),
    time: '11:20 AM',
    amount: 1000,
    paymentMode: 'Cash',
    status: 'Paid',
    items: [{ description: 'Ultrasound (Whole Abdomen)', qty: 1, rate: 1000, amount: 1000 }],
  },
  {
    id: 'inv-9',
    invoiceNo: 'IPD-2026-00074',
    title: 'Final Hospital Bill',
    type: 'IPD',
    patientId: 'pat-12',
    patientName: 'Kavya Menon',
    uhid: 'CC202600160',
    date: display(-1),
    dateISO: D(-1),
    time: '04:15 PM',
    amount: 32650,
    paymentMode: 'UPI',
    status: 'Paid',
    doctorName: 'Dr. Priya Menon (General Medicine)',
    items: [
      { description: 'Room Charges (5 days)', qty: 5, rate: 1600, amount: 8000 },
      { description: 'Doctor Fees', qty: 1, rate: 3000, amount: 3000 },
      { description: 'Pharmacy', qty: 1, rate: 2450, amount: 2450 },
      { description: 'Lab & Radiology', qty: 1, rate: 4200, amount: 4200 },
      { description: 'Procedure Charges (Platelet transfusion)', qty: 1, rate: 15000, amount: 15000 },
    ],
  },
  {
    id: 'inv-10',
    invoiceNo: 'IPD-2026-00069',
    title: 'IPD Final Bill',
    type: 'IPD',
    patientId: 'pat-1',
    patientName: 'Ananya S',
    uhid: 'CC202500125',
    date: display(-4),
    dateISO: D(-4),
    time: '12:10 PM',
    amount: 2500,
    paymentMode: 'Card',
    status: 'Paid',
    doctorName: 'Dr. Priya Menon (General Medicine)',
    insuranceCovered: 16000,
    items: [
      { description: 'Deluxe Room (5 days) & Nursing', qty: 5, rate: 2400, amount: 12000 },
      { description: 'Medicines & IV Fluids', qty: 1, rate: 3800, amount: 3800 },
      { description: 'Lab Investigations', qty: 1, rate: 2700, amount: 2700 },
      { description: 'Less: Insurance approved (Star Health)', qty: 1, rate: -16000, amount: -16000 },
    ],
  },
];

/**
 * Collections from counters not modelled individually (other OPD desks, ER,
 * cafeteria-linked services…). Chosen so today's collection opens at the
 * design's ₹4,82,500; every invoice paid in-app adds on top.
 */
export const TODAY_COLLECTION_BASE =
  482500 -
  INITIAL_INVOICES.filter((inv) => inv.status === 'Paid' && inv.dateISO === D(0)).reduce(
    (sum, inv) => sum + inv.amount,
    0
  );

/** Registered patients beyond the ones modelled in detail. */
export const PATIENT_REGISTRY_BASE = 1248 - INITIAL_PATIENTS.length;
/** OPD consultations today from other doctors/desks (design: 124). */
export const OPD_TODAY_BASE = 124 - INITIAL_APPOINTMENTS.filter((a) => a.date === D(0) && a.type !== 'IPD').length;
export const SURGERIES_TODAY = 12;
export const EMERGENCY_TODAY = 31;

// -------------------------------------------------------------
// Pharmacy, lab & radiology catalogues
// -------------------------------------------------------------
export const INITIAL_MEDICINES: Medicine[] = [
  { id: 'med-1', name: 'Paracetamol 500mg', category: 'Analgesic', dosageForm: 'Tab', stock: 120, price: 12.0, expiry: expiryMonthsAhead(15) },
  { id: 'med-2', name: 'Amoxicillin 500mg', category: 'Antibiotic', dosageForm: 'Cap', stock: 68, price: 45.0, expiry: expiryMonthsAhead(11) },
  { id: 'med-3', name: 'Pantoprazole 40mg', category: 'Antacid', dosageForm: 'Tab', stock: 45, price: 35.0, expiry: expiryMonthsAhead(20) },
  { id: 'med-4', name: 'Metformin 500mg', category: 'Antidiabetic', dosageForm: 'Tab', stock: 92, price: 18.0, expiry: expiryMonthsAhead(13) },
  { id: 'med-5', name: 'Vitamin D3', category: 'Supplement', dosageForm: 'Sachet', stock: 34, price: 60.0, expiry: expiryMonthsAhead(18) },
  { id: 'med-6', name: 'Azithromycin 500mg', category: 'Antibiotic', dosageForm: 'Tab', stock: 25, price: 110.0, expiry: expiryMonthsAhead(2) },
  { id: 'med-7', name: 'Cetirizine 10mg', category: 'Antihistamine', dosageForm: 'Tab', stock: 150, price: 8.0, expiry: expiryMonthsAhead(28) },
  { id: 'med-8', name: 'Atorvastatin 10mg', category: 'Cardiovascular', dosageForm: 'Tab', stock: 80, price: 75.0, expiry: expiryMonthsAhead(14) },
  { id: 'med-9', name: 'Clarithromycin 500mg', category: 'Antibiotic', dosageForm: 'Tab', stock: 30, price: 95.0, expiry: expiryMonthsAhead(9) },
  { id: 'med-10', name: 'Ciprofloxacin 500mg', category: 'Antibiotic', dosageForm: 'Tab', stock: 60, price: 42.0, expiry: expiryMonthsAhead(16) },
  { id: 'med-11', name: 'Vitamin C & Zinc', category: 'Supplement', dosageForm: 'Tab', stock: 200, price: 6.0, expiry: expiryMonthsAhead(22) },
  { id: 'med-12', name: 'Amlodipine 5mg', category: 'Cardiovascular', dosageForm: 'Tab', stock: 110, price: 9.0, expiry: expiryMonthsAhead(19) },
  { id: 'med-13', name: 'Insulin Glargine 100IU/ml', category: 'Antidiabetic', dosageForm: 'Pen', stock: 12, price: 780.0, expiry: expiryMonthsAhead(7) },
  { id: 'med-14', name: 'Salbutamol Inhaler 100mcg', category: 'Respiratory', dosageForm: 'Inhaler', stock: 18, price: 145.0, expiry: expiryMonthsAhead(12) },
  { id: 'med-15', name: 'Azithromycin 250mg', category: 'Antibiotic', dosageForm: 'Tab', stock: 0, price: 65.0, expiry: expiryMonthsAhead(10) },
];

export const INITIAL_LAB_TESTS: LabTest[] = [
  { id: 'lab-1', name: 'Complete Blood Count (CBC)', category: 'Hematology', turnaroundTime: '1-2 hrs', price: 300 },
  { id: 'lab-2', name: 'LFT (Liver Function Test)', category: 'Biochemistry', turnaroundTime: '2-4 hrs', price: 600 },
  { id: 'lab-3', name: 'KFT (Kidney Function Test)', category: 'Biochemistry', turnaroundTime: '2-4 hrs', price: 700 },
  { id: 'lab-4', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Biochemistry', turnaroundTime: '4-6 hrs', price: 1200 },
  { id: 'lab-5', name: 'HbA1c Glycated Hemoglobin', category: 'Biochemistry', turnaroundTime: '2-3 hrs', price: 600 },
  { id: 'lab-6', name: 'Lipid Profile', category: 'Biochemistry', turnaroundTime: '3-4 hrs', price: 800 },
  { id: 'lab-7', name: 'Urine Routine & Microscopy', category: 'Pathology', turnaroundTime: '1-2 hrs', price: 250 },
  { id: 'lab-8', name: 'Dengue NS1 Antigen', category: 'Microbiology', turnaroundTime: '2-3 hrs', price: 650 },
  { id: 'lab-9', name: 'Blood Culture & Sensitivity', category: 'Microbiology', turnaroundTime: '48-72 hrs', price: 950 },
  { id: 'lab-10', name: 'Peripheral Smear', category: 'Hematology', turnaroundTime: '2-3 hrs', price: 200 },
  { id: 'lab-11', name: 'Troponin I (Quantitative)', category: 'Biochemistry', turnaroundTime: '1 hr', price: 900 },
];

export const INITIAL_RADIOLOGY_SCANS: RadiologyScan[] = [
  { id: 'rad-1', name: 'X-Ray (Chest PA)', category: 'X-Ray', duration: '30 min', price: 500 },
  { id: 'rad-2', name: 'Ultrasound (Whole Abdomen)', category: 'Ultrasound', duration: '1 hr', price: 1000 },
  { id: 'rad-3', name: 'CT Scan (Head Brain Plain)', category: 'CT Scan', duration: '2 hrs', price: 3500 },
  { id: 'rad-4', name: 'MRI (Brain with Contrast)', category: 'MRI', duration: '3 hrs', price: 7000 },
  { id: 'rad-5', name: 'Digital Mammography', category: 'Mammography', duration: '1 hr', price: 2500 },
  { id: 'rad-6', name: 'MRI (Spine Lumbar)', category: 'MRI', duration: '3 hrs', price: 8500 },
  { id: 'rad-7', name: 'X-Ray (Knee AP & Lateral)', category: 'X-Ray', duration: '30 min', price: 650 },
  { id: 'rad-8', name: 'HRCT Chest', category: 'CT Scan', duration: '2 hrs', price: 4200 },
];

// -------------------------------------------------------------
// Notifications
// -------------------------------------------------------------
export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'New appointment booked',
    description: 'Ananya S • 09:00 AM General Medicine',
    category: 'Appointments',
    timestamp: '2m ago',
    createdAt: minutesAgo(2),
    read: false,
    route: '/appointments',
  },
  {
    id: 'notif-2',
    title: 'Critical lab value',
    description: 'Meera Krishnan • HbA1c 10.2% flagged for Dr. Priya Menon',
    category: 'System',
    timestamp: '9m ago',
    createdAt: minutesAgo(9),
    read: false,
    route: '/lab-portal',
  },
  {
    id: 'notif-3',
    title: 'Payment received',
    description: '₹650 • PH-2026-00321 via UPI',
    category: 'Billing',
    timestamp: '15m ago',
    createdAt: minutesAgo(15),
    read: false,
    route: '/receipt/[id]',
    params: { id: 'inv-3' },
  },
  {
    id: 'notif-4',
    title: 'Drug interaction flagged',
    description: 'RX-2026-00401 • Atorvastatin + Clarithromycin (Rahul Nair)',
    category: 'System',
    timestamp: '38m ago',
    createdAt: minutesAgo(38),
    read: true,
    route: '/pharmacy-review',
  },
  {
    id: 'notif-5',
    title: 'Lab report ready',
    description: 'CBC • Ananya S available for review',
    category: 'System',
    timestamp: '1h ago',
    createdAt: minutesAgo(62),
    read: true,
    route: '/patient/[id]',
    params: { id: 'pat-1' },
  },
  {
    id: 'notif-6',
    title: 'Patient admitted',
    description: 'Vikram K admitted to Deluxe Suite 101',
    category: 'Appointments',
    timestamp: '2h ago',
    createdAt: minutesAgo(125),
    read: true,
    route: '/patient/[id]',
    params: { id: 'pat-4' },
  },
  {
    id: 'notif-7',
    title: 'Pending bill above ₹10,000',
    description: 'George Thomas • ICU charges ₹12,500 awaiting payment',
    category: 'Billing',
    timestamp: '3h ago',
    createdAt: minutesAgo(180),
    read: true,
    route: '/receipt/[id]',
    params: { id: 'inv-7' },
  },
  {
    id: 'notif-8',
    title: 'Follow-up reminder',
    description: 'Kavya Menon follow-up visit scheduled for tomorrow',
    category: 'Appointments',
    timestamp: '3h ago',
    createdAt: minutesAgo(200),
    read: true,
    route: '/appointments',
  },
];

// -------------------------------------------------------------
// Receipt templates
// -------------------------------------------------------------
export const RECEIPT_TEMPLATES = [
  { id: 'tpl-1', title: 'Registration Receipt', subtitle: 'Patient registration & UHID issuance', icon: 'card-outline', color: '#1E6BFF', invoiceType: 'REG' },
  { id: 'tpl-2', title: 'OPD Consultation Receipt', subtitle: 'Doctor consultation & OPD services', icon: 'medkit-outline', color: '#10B981', invoiceType: 'OPD' },
  { id: 'tpl-3', title: 'IPD Admission Receipt', subtitle: 'Hospital admission & room advance', icon: 'bed-outline', color: '#8B5CF6', invoiceType: 'IPD' },
  { id: 'tpl-4', title: 'Pharmacy Bill', subtitle: 'Medicine dispense & pharmacy charges', icon: 'fitness-outline', color: '#F59E0B', invoiceType: 'Pharmacy' },
  { id: 'tpl-5', title: 'Lab Bill', subtitle: 'Laboratory pathology test charges', icon: 'flask-outline', color: '#00B4D8', invoiceType: 'Lab' },
  { id: 'tpl-6', title: 'Radiology Bill', subtitle: 'X-ray, CT, MRI, and Ultrasound scans', icon: 'scan-outline', color: '#6366F1', invoiceType: 'Radiology' },
  { id: 'tpl-7', title: 'Surgery / Procedure Bill', subtitle: 'Operation & specialized procedure charges', icon: 'cut-outline', color: '#EC4899', invoiceType: 'Surgery' },
  { id: 'tpl-8', title: 'Discharge Summary', subtitle: 'Clinical treatment summary & final invoice', icon: 'document-text-outline', color: '#14B8A6', invoiceType: 'IPD' },
  { id: 'tpl-9', title: 'Insurance Claim Document', subtitle: 'Pre-authorization & TPA insurance claims', icon: 'shield-checkmark-outline', color: '#F97316', invoiceType: 'IPD' },
];

// -------------------------------------------------------------
// Discharge summaries
// -------------------------------------------------------------
export interface DischargeSummary {
  patientId: string;
  patientName: string;
  uhid: string;
  admissionDate: string;
  dischargeDate: string;
  room: string;
  stayDuration: string;
  doctorName: string;
  department: string;
  diagnosis: string;
  treatmentGiven: string;
  advice: string[];
  prescriptions: Array<{ name: string; dosage: string; duration: string }>;
  totalAmount: number;
  insuranceApproved: number;
  patientPaid: number;
  status?: 'Final' | 'Draft';
}

export const DISCHARGE_SUMMARIES: DischargeSummary[] = [
  {
    patientId: 'pat-1',
    patientName: 'Ananya S',
    uhid: 'CC202500125',
    admissionDate: display(-9),
    dischargeDate: display(-4),
    room: 'Room 101 (Deluxe Ward)',
    stayDuration: '5 days',
    doctorName: 'Dr. Priya Menon',
    department: 'General Medicine',
    diagnosis: 'Acute Viral Fever with Mild Dehydration',
    treatmentGiven: 'IV Normal Saline 500ml, Inj. Paracetamol 1g, Oral Multivitamins, Complete Bed Rest.',
    advice: [
      'Take prescribed oral medications regularly for 5 days',
      'Drink 2.5 to 3 liters of fluids daily to maintain hydration',
      'Avoid spicy and heavy oily food for 1 week',
      `Follow up review in OPD after 1 week (${display(3)})`,
      'Report to emergency in case of high fever spike or persistent vomiting',
    ],
    prescriptions: [
      { name: 'Paracetamol 500mg', dosage: '1 tablet thrice daily after food', duration: '5 days' },
      { name: 'Pantoprazole 40mg', dosage: '1 tablet once daily before breakfast', duration: '5 days' },
      { name: 'Vitamin C & Zinc', dosage: '1 tablet once daily after lunch', duration: '10 days' },
    ],
    totalAmount: 18500,
    insuranceApproved: 16000,
    patientPaid: 2500,
    status: 'Final',
  },
  {
    patientId: 'pat-12',
    patientName: 'Kavya Menon',
    uhid: 'CC202600160',
    admissionDate: display(-6),
    dischargeDate: display(-1),
    room: 'Ward B • Bed 11',
    stayDuration: '5 days',
    doctorName: 'Dr. Priya Menon',
    department: 'General Medicine',
    diagnosis: 'Dengue Fever with Thrombocytopenia (NS1 positive)',
    treatmentGiven: 'IV fluids as per WHO dengue protocol, single donor platelet transfusion (Day 3), Paracetamol, daily CBC monitoring.',
    advice: [
      'Oral fluids 3 liters/day; watch for bleeding gums or black stools',
      'Avoid NSAIDs (Ibuprofen, Diclofenac, Aspirin)',
      'Repeat CBC in 48 hours',
      `Follow up review in OPD on ${display(1)}`,
    ],
    prescriptions: [
      { name: 'Paracetamol 500mg', dosage: '1 tablet SOS for fever (max 4/day)', duration: '5 days' },
      { name: 'ORS Sachets', dosage: '1 sachet in 1L water, sip through the day', duration: '5 days' },
    ],
    totalAmount: 32650,
    insuranceApproved: 0,
    patientPaid: 32650,
    status: 'Final',
  },
  {
    patientId: 'pat-11',
    patientName: 'Sunita Patel',
    uhid: 'CC202500084',
    admissionDate: display(-3),
    dischargeDate: display(0),
    room: 'Deluxe Suite 104',
    stayDuration: '3 days',
    doctorName: 'Dr. Rajesh Varma',
    department: 'General Surgery',
    diagnosis: 'Symptomatic Cholelithiasis — Laparoscopic Cholecystectomy (uneventful)',
    treatmentGiven: 'Laparoscopic cholecystectomy under GA (Day 1), IV antibiotics 24 hrs, analgesia, early mobilisation.',
    advice: [
      'Keep port sites dry for 5 days; dressing change on Day 5',
      'Low-fat diet for 2 weeks',
      'No heavy lifting for 4 weeks',
      `Suture review in surgical OPD on ${display(7)}`,
    ],
    prescriptions: [
      { name: 'Paracetamol 1g', dosage: '1 tablet thrice daily after food', duration: '5 days' },
      { name: 'Pantoprazole 40mg', dosage: '1 tablet once daily before breakfast', duration: '14 days' },
    ],
    totalAmount: 62000,
    insuranceApproved: 48000,
    patientPaid: 0,
    status: 'Draft',
  },
];

/** Kept for existing imports — the sample shown on the discharge screen by default. */
export const DISCHARGE_SUMMARY_SAMPLE = DISCHARGE_SUMMARIES[0];

// -------------------------------------------------------------
// Clinical records (the "one screen, complete patient intelligence" layer)
// -------------------------------------------------------------
export interface ClinicalProfile {
  patientId: string;
  allergies: string[];
  conditions: string[];
  currentMedications: string[];
  surgicalHistory: string[];
  familyHistory: string[];
  lifestyle: string;
  chiefComplaint: string;
  riskFlags: string[];
}

export const INITIAL_CLINICAL_PROFILES: ClinicalProfile[] = [
  {
    patientId: 'pat-1',
    allergies: [],
    conditions: ['Recent acute viral fever (discharged 4 days ago)'],
    currentMedications: ['Paracetamol 500mg SOS', 'Vitamin C & Zinc OD'],
    surgicalHistory: ['None'],
    familyHistory: ['Mother — Hypothyroidism'],
    lifestyle: 'Non-smoker, no alcohol. Software engineer, sedentary.',
    chiefComplaint: '3-day history of recurrent low-grade fever with body ache and fatigue.',
    riskFlags: ['Fever recurrence within 1 week of discharge'],
  },
  {
    patientId: 'pat-2',
    allergies: [],
    conditions: ['Dyslipidemia', 'Borderline hypertension'],
    currentMedications: ['Atorvastatin 10mg (Night)', 'Clarithromycin 500mg (BD) — started yesterday'],
    surgicalHistory: ['Appendectomy (2009)'],
    familyHistory: ['Father — Myocardial infarction at 58'],
    lifestyle: 'Ex-smoker (quit 2019). Occasional alcohol.',
    chiefComplaint: 'Exertional chest discomfort for 2 weeks; TMT advised.',
    riskFlags: ['Atorvastatin + Clarithromycin interaction pending pharmacist review', 'Family history of premature CAD'],
  },
  {
    patientId: 'pat-3',
    allergies: ['Sulfa drugs'],
    conditions: ['Atopic dermatitis'],
    currentMedications: ['Cetirizine 10mg (Night)', 'Emollient cream BD'],
    surgicalHistory: ['None'],
    familyHistory: ['Brother — Asthma'],
    lifestyle: 'Non-smoker. Teacher.',
    chiefComplaint: 'Itchy erythematous rash on both forearms for 1 week.',
    riskFlags: [],
  },
  {
    patientId: 'pat-4',
    allergies: ['Penicillin (urticaria & angioedema)'],
    conditions: ['Non-alcoholic fatty liver disease', 'Right knee osteoarthritis'],
    currentMedications: ['Ursodeoxycholic acid 300mg BD', 'Paracetamol 500mg SOS'],
    surgicalHistory: ['None'],
    familyHistory: ['Mother — Type 2 diabetes'],
    lifestyle: 'Social drinker (advised abstinence). Businessman.',
    chiefComplaint: 'Right knee pain; deranged LFT on admission work-up.',
    riskFlags: ['Penicillin allergy', 'ALT 88 U/L — avoid hepatotoxic drugs'],
  },
  {
    patientId: 'pat-5',
    allergies: [],
    conditions: ['Type 2 Diabetes Mellitus (8 yrs)', 'Hypothyroidism'],
    currentMedications: ['Metformin 500mg BD', 'Glimepiride 1mg OD', 'Thyroxine 50mcg OD'],
    surgicalHistory: ['LSCS (2012)'],
    familyHistory: ['Both parents — Type 2 diabetes'],
    lifestyle: 'Non-smoker. Irregular meals, minimal exercise.',
    chiefComplaint: 'Routine diabetes review; fatigue and increased thirst.',
    riskFlags: ['HbA1c 10.2% — uncontrolled and rising', 'Diabetic retinopathy screening overdue'],
  },
  {
    patientId: 'pat-6',
    allergies: [],
    conditions: ['Community-acquired pneumonia (right lower lobe)', 'Smoker — 15 pack-years'],
    currentMedications: ['Inj. Ceftriaxone 1g BD', 'Azithromycin 500mg OD', 'Paracetamol 650mg SOS', 'O2 2L/min via nasal prongs'],
    surgicalHistory: ['None'],
    familyHistory: ['Non-contributory'],
    lifestyle: 'Current smoker (counselled). Auto driver.',
    chiefComplaint: 'Fever, productive cough and breathlessness for 5 days.',
    riskFlags: ['SpO2 dipped to 92% overnight', 'TLC 14,200 — rising'],
  },
  {
    patientId: 'pat-7',
    allergies: ['NSAIDs (gastritis & AKI risk)'],
    conditions: ['Hypertension (15 yrs)', 'Chronic kidney disease — Stage 3a', 'Anemia of CKD'],
    currentMedications: ['Amlodipine 5mg OD', 'Telmisartan 40mg OD', 'Iron sucrose IV weekly'],
    surgicalHistory: ['Hysterectomy (2015)'],
    familyHistory: ['Father — Stroke'],
    lifestyle: 'Non-smoker. Retired school principal.',
    chiefComplaint: 'Headache and dizziness; BP 178/102 on arrival.',
    riskFlags: ['eGFR 52 — renal dose adjustment required', 'Creatinine trending up (1.3 → 1.6)'],
  },
  {
    patientId: 'pat-8',
    allergies: [],
    conditions: ['Dengue fever (recovered)'],
    currentMedications: [],
    surgicalHistory: ['None'],
    familyHistory: ['Non-contributory'],
    lifestyle: 'Non-smoker. IT professional.',
    chiefComplaint: 'Follow-up after dengue; platelet recovery check.',
    riskFlags: MISSED_SLOT ? ['Missed follow-up (not arrived)'] : ['Follow-up due today'],
  },
  {
    patientId: 'pat-9',
    allergies: ['Iodinated contrast'],
    conditions: ['COPD (GOLD 3)', 'Type 2 respiratory failure', 'Hypertension'],
    currentMedications: [
      'Nebulised Ipratropium + Salbutamol 6-hourly',
      'Inj. Methylprednisolone 40mg OD',
      'Inj. Piperacillin-Tazobactam 4.5g TDS',
    ],
    surgicalHistory: ['None'],
    familyHistory: ['Non-contributory'],
    lifestyle: 'Ex-smoker, 40 pack-years.',
    chiefComplaint: 'Acute exacerbation of COPD — ventilator day 3.',
    riskFlags: ['Ventilator day 3 — daily SAT/SBT', 'Contrast allergy'],
  },
  {
    patientId: 'pat-10',
    allergies: [],
    conditions: ['NSTEMI', 'Type 2 Diabetes', 'Ex-smoker'],
    currentMedications: [
      'Aspirin 75mg OD',
      'Clopidogrel 75mg OD',
      'Atorvastatin 80mg (Night)',
      'Enoxaparin 60mg SC BD',
      'Metoprolol 25mg BD',
    ],
    surgicalHistory: ['None'],
    familyHistory: ['Brother — CAD'],
    lifestyle: 'Ex-smoker. Retired port officer.',
    chiefComplaint: 'Chest pain at rest; Troponin I elevated.',
    riskFlags: ['Dual antiplatelet + LMWH — bleeding risk', 'Coronary angiography planned'],
  },
  {
    patientId: 'pat-11',
    allergies: [],
    conditions: ['Symptomatic cholelithiasis — post Lap. cholecystectomy (Day 3)', 'Obesity (BMI 32)'],
    currentMedications: ['Paracetamol 1g TDS', 'Pantoprazole 40mg OD'],
    surgicalHistory: ['Laparoscopic cholecystectomy (3 days ago)'],
    familyHistory: ['Non-contributory'],
    lifestyle: 'Non-smoker. Homemaker.',
    chiefComplaint: 'Post-operative recovery; planned discharge today.',
    riskFlags: ['Surgery balance ₹14,000 pending before discharge'],
  },
  {
    patientId: 'pat-12',
    allergies: [],
    conditions: ['Dengue fever with thrombocytopenia (recovered)'],
    currentMedications: ['Paracetamol 500mg SOS'],
    surgicalHistory: ['None'],
    familyHistory: ['Non-contributory'],
    lifestyle: 'Non-smoker. College student.',
    chiefComplaint: 'Discharged yesterday after dengue.',
    riskFlags: ['Repeat CBC due tomorrow'],
  },
];

export interface VitalsRecord {
  id: string;
  patientId: string;
  /** ISO date */
  date: string;
  time: string;
  bp: string;
  pulse: number;
  spo2: number;
  temp: number;
  respRate?: number;
  sugar?: number;
  recordedBy: string;
}

export const INITIAL_VITALS: VitalsRecord[] = [
  { id: 'vit-1', patientId: 'pat-1', date: D(0), time: '08:40 AM', bp: '118/76', pulse: 92, spo2: 98, temp: 101.4, respRate: 18, recordedBy: 'Triage Nurse Fathima' },
  { id: 'vit-2', patientId: 'pat-2', date: D(-1), time: '09:20 AM', bp: '138/88', pulse: 84, spo2: 98, temp: 98.4, respRate: 16, recordedBy: 'Triage Nurse Fathima' },
  { id: 'vit-3', patientId: 'pat-3', date: D(0), time: '11:05 AM', bp: '112/72', pulse: 78, spo2: 99, temp: 98.2, respRate: 14, recordedBy: 'Triage Nurse Fathima' },
  { id: 'vit-4', patientId: 'pat-4', date: D(0), time: '06:00 AM', bp: '132/84', pulse: 80, spo2: 97, temp: 98.9, respRate: 16, recordedBy: 'Nurse Anjali Thomas' },
  { id: 'vit-5', patientId: 'pat-5', date: D(-90), time: '10:10 AM', bp: '128/80', pulse: 86, spo2: 98, temp: 98.1, sugar: 212, recordedBy: 'Triage Nurse Fathima' },
  { id: 'vit-6', patientId: 'pat-6', date: D(0), time: '02:00 AM', bp: '124/78', pulse: 104, spo2: 92, temp: 100.8, respRate: 24, recordedBy: 'Nurse Anjali Thomas' },
  { id: 'vit-7', patientId: 'pat-6', date: D(0), time: '06:00 AM', bp: '122/76', pulse: 98, spo2: 94, temp: 100.2, respRate: 22, recordedBy: 'Nurse Anjali Thomas' },
  { id: 'vit-8', patientId: 'pat-7', date: D(-4), time: '07:30 PM', bp: '178/102', pulse: 88, spo2: 97, temp: 98.6, respRate: 18, recordedBy: 'ER Nurse Joseph' },
  { id: 'vit-9', patientId: 'pat-7', date: D(0), time: '06:00 AM', bp: '146/90', pulse: 82, spo2: 98, temp: 98.4, respRate: 16, recordedBy: 'Nurse Reshma K' },
  { id: 'vit-10', patientId: 'pat-9', date: D(0), time: '06:00 AM', bp: '132/70', pulse: 96, spo2: 91, temp: 99.1, respRate: 20, recordedBy: 'ICU Nurse Reshma K' },
  { id: 'vit-11', patientId: 'pat-10', date: D(0), time: '06:00 AM', bp: '108/68', pulse: 64, spo2: 96, temp: 98.2, respRate: 16, recordedBy: 'ICU Nurse Reshma K' },
  { id: 'vit-12', patientId: 'pat-11', date: D(0), time: '06:00 AM', bp: '126/80', pulse: 76, spo2: 99, temp: 98.4, respRate: 14, recordedBy: 'Nurse Anjali Thomas' },
  { id: 'vit-13', patientId: 'pat-12', date: D(-1), time: '09:00 AM', bp: '110/70', pulse: 80, spo2: 99, temp: 98.2, respRate: 14, recordedBy: 'Nurse Reshma K' },
];

export interface PrescriptionLine {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Visit {
  id: string;
  patientId: string;
  /** ISO date */
  date: string;
  type: 'OPD' | 'IPD' | 'Follow Up' | 'Emergency';
  department: string;
  doctorName: string;
  symptoms: string;
  diagnosis: string;
  prescription: PrescriptionLine[];
  advice?: string;
  followUpDate?: string;
  /** Where the note came from — "AI draft (approved)" for copilot notes. */
  source?: string;
}

export const INITIAL_VISITS: Visit[] = [
  {
    id: 'visit-1',
    patientId: 'pat-1',
    date: D(-9),
    type: 'IPD',
    department: 'General Medicine',
    doctorName: 'Dr. Priya Menon',
    symptoms: 'High-grade fever 102°F for 4 days, vomiting, poor oral intake.',
    diagnosis: 'Acute viral fever with mild dehydration (admitted 5 days)',
    prescription: [
      { name: 'Paracetamol 500mg', dose: '1 Tab', frequency: 'TDS', duration: '5 days' },
      { name: 'Pantoprazole 40mg', dose: '1 Tab', frequency: 'OD (Before food)', duration: '5 days' },
    ],
    advice: 'Hydration, bed rest. Review after 1 week.',
    followUpDate: D(3),
  },
  {
    id: 'visit-2',
    patientId: 'pat-1',
    date: D(-48),
    type: 'OPD',
    department: 'General Medicine',
    doctorName: 'Dr. Priya Menon',
    symptoms: 'Sneezing, nasal blockage for a week.',
    diagnosis: 'Seasonal allergic rhinitis',
    prescription: [{ name: 'Cetirizine 10mg', dose: '1 Tab', frequency: 'HS (Night only)', duration: '7 days' }],
  },
  {
    id: 'visit-3',
    patientId: 'pat-2',
    date: D(-1),
    type: 'OPD',
    department: 'Cardiology',
    doctorName: 'Dr. Arjun Nair',
    symptoms: 'Exertional chest tightness for 2 weeks; mild URTI with cough.',
    diagnosis: 'Stable angina (suspected) — TMT advised; Acute bronchitis',
    prescription: [
      { name: 'Atorvastatin 10mg', dose: '1 Tab', frequency: 'HS (Night only)', duration: 'Continue' },
      { name: 'Clarithromycin 500mg', dose: '1 Tab', frequency: 'BD (Twice a day)', duration: '5 days' },
    ],
    advice: 'Avoid strenuous activity until TMT. Lipid profile ordered.',
    followUpDate: D(0),
  },
  {
    id: 'visit-4',
    patientId: 'pat-2',
    date: D(-92),
    type: 'OPD',
    department: 'Cardiology',
    doctorName: 'Dr. Arjun Nair',
    symptoms: 'Routine check-up; family history of CAD.',
    diagnosis: 'Dyslipidemia (LDL 168 mg/dL)',
    prescription: [{ name: 'Atorvastatin 10mg', dose: '1 Tab', frequency: 'HS (Night only)', duration: '3 months' }],
  },
  {
    id: 'visit-5',
    patientId: 'pat-3',
    date: D(-70),
    type: 'OPD',
    department: 'Dermatology',
    doctorName: 'Dr. Anil Kumar',
    symptoms: 'Dry itchy patches behind knees.',
    diagnosis: 'Atopic dermatitis — mild flare',
    prescription: [{ name: 'Cetirizine 10mg', dose: '1 Tab', frequency: 'HS (Night only)', duration: '14 days' }],
  },
  {
    id: 'visit-6',
    patientId: 'pat-4',
    date: D(-2),
    type: 'IPD',
    department: 'Orthopedics',
    doctorName: 'Dr. Rajesh Varma',
    symptoms: 'Right knee pain and swelling for 3 weeks; unable to climb stairs.',
    diagnosis: 'Right knee osteoarthritis (KL grade 3); incidental transaminitis',
    prescription: [
      { name: 'Paracetamol 500mg', dose: '1 Tab', frequency: 'SOS', duration: '5 days' },
      { name: 'Ursodeoxycholic acid 300mg', dose: '1 Tab', frequency: 'BD (Twice a day)', duration: '30 days' },
    ],
    advice: 'Physiotherapy, knee X-ray, hepatology opinion.',
  },
  {
    id: 'visit-7',
    patientId: 'pat-5',
    date: D(-90),
    type: 'OPD',
    department: 'General Medicine',
    doctorName: 'Dr. Priya Menon',
    symptoms: 'Routine diabetes review.',
    diagnosis: 'Type 2 DM — suboptimal control (HbA1c 9.1%)',
    prescription: [
      { name: 'Metformin 500mg', dose: '1 Tab', frequency: 'BD (Twice a day)', duration: '3 months' },
      { name: 'Glimepiride 1mg', dose: '1 Tab', frequency: 'OD (Before breakfast)', duration: '3 months' },
    ],
    advice: 'Diet counselling; walk 30 min/day.',
    followUpDate: D(0),
  },
  {
    id: 'visit-8',
    patientId: 'pat-6',
    date: D(-3),
    type: 'IPD',
    department: 'General Medicine',
    doctorName: 'Dr. Priya Menon',
    symptoms: 'Fever, productive cough, breathlessness for 5 days.',
    diagnosis: 'Community-acquired pneumonia — right lower lobe (CURB-65: 1)',
    prescription: [
      { name: 'Inj. Ceftriaxone 1g', dose: '1 Vial', frequency: 'BD (Twice a day)', duration: '5 days' },
      { name: 'Azithromycin 500mg', dose: '1 Tab', frequency: 'OD', duration: '5 days' },
    ],
  },
  {
    id: 'visit-9',
    patientId: 'pat-7',
    date: D(-4),
    type: 'Emergency',
    department: 'General Medicine',
    doctorName: 'Dr. Priya Menon',
    symptoms: 'Severe headache, dizziness; BP 178/102.',
    diagnosis: 'Hypertensive urgency on CKD stage 3a',
    prescription: [
      { name: 'Amlodipine 5mg', dose: '1 Tab', frequency: 'OD', duration: 'Continue' },
      { name: 'Telmisartan 40mg', dose: '1 Tab', frequency: 'OD', duration: 'Continue' },
    ],
  },
  {
    id: 'visit-10',
    patientId: 'pat-8',
    date: D(-21),
    type: 'OPD',
    department: 'General Medicine',
    doctorName: 'Dr. Priya Menon',
    symptoms: 'Fever with myalgia for 3 days; NS1 positive.',
    diagnosis: 'Dengue fever without warning signs',
    prescription: [{ name: 'Paracetamol 500mg', dose: '1 Tab', frequency: 'SOS', duration: '5 days' }],
    followUpDate: D(0),
  },
  {
    id: 'visit-11',
    patientId: 'pat-9',
    date: D(-5),
    type: 'Emergency',
    department: 'Critical Care',
    doctorName: 'Dr. Farhan Ali',
    symptoms: 'Severe breathlessness, drowsiness; pH 7.21, pCO2 78.',
    diagnosis: 'Acute exacerbation of COPD with type 2 respiratory failure — intubated',
    prescription: [{ name: 'Inj. Piperacillin-Tazobactam 4.5g', dose: '1 Vial', frequency: 'TDS', duration: '7 days' }],
  },
  {
    id: 'visit-12',
    patientId: 'pat-10',
    date: D(-2),
    type: 'Emergency',
    department: 'Cardiology',
    doctorName: 'Dr. Arjun Nair',
    symptoms: 'Retrosternal chest pain at rest for 40 minutes.',
    diagnosis: 'NSTEMI (Troponin I 2.8 ng/mL) — GRACE score 142',
    prescription: [
      { name: 'Aspirin 75mg', dose: '1 Tab', frequency: 'OD', duration: 'Lifelong' },
      { name: 'Clopidogrel 75mg', dose: '1 Tab', frequency: 'OD', duration: '12 months' },
      { name: 'Atorvastatin 80mg', dose: '1 Tab', frequency: 'HS (Night only)', duration: 'Continue' },
    ],
  },
  {
    id: 'visit-13',
    patientId: 'pat-11',
    date: D(-3),
    type: 'IPD',
    department: 'General Surgery',
    doctorName: 'Dr. Rajesh Varma',
    symptoms: 'Recurrent right upper quadrant pain after fatty meals.',
    diagnosis: 'Symptomatic cholelithiasis — Lap. cholecystectomy done',
    prescription: [{ name: 'Paracetamol 1g', dose: '1 Tab', frequency: 'TDS', duration: '5 days' }],
  },
  {
    id: 'visit-14',
    patientId: 'pat-12',
    date: D(-6),
    type: 'IPD',
    department: 'General Medicine',
    doctorName: 'Dr. Priya Menon',
    symptoms: 'Fever, retro-orbital pain, platelets 38,000.',
    diagnosis: 'Dengue fever with thrombocytopenia',
    prescription: [{ name: 'Paracetamol 500mg', dose: '1 Tab', frequency: 'SOS', duration: '5 days' }],
    followUpDate: D(1),
  },
];

export interface ClinicalNote {
  id: string;
  patientId: string;
  /** ISO date */
  date: string;
  time: string;
  author: string;
  /** SOAP-structured note text. */
  content: string;
  status: 'Draft' | 'Approved';
  source: 'Voice' | 'Text' | 'AI Draft';
  approvedBy?: string;
}

export const INITIAL_CLINICAL_NOTES: ClinicalNote[] = [
  {
    id: 'note-1',
    patientId: 'pat-6',
    date: D(-1),
    time: '07:45 PM',
    author: 'Dr. Priya Menon',
    content:
      'S: Cough improving, still breathless on walking.\nO: Temp 100.4°F, SpO2 93% on 2L O2, crackles right base.\nA: CAP — slow clinical response on Day 2.\nP: Continue Ceftriaxone + Azithromycin, repeat CBC & CXR tomorrow, incentive spirometry.',
    status: 'Approved',
    source: 'Voice',
    approvedBy: 'Dr. Priya Menon',
  },
];

// -------------------------------------------------------------
// Beds & nursing
// -------------------------------------------------------------
export interface NurseTask {
  id: string;
  title: string;
  category: 'Vitals' | 'Medication' | 'ICU Follow-up' | 'Discharge';
  ward: string;
  patientName: string;
  uhid: string;
  timeDue: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  notes?: string;
  patientId?: string;
  completedAt?: string;
}

export interface WardInfo {
  id: string;
  name: string;
  totalBeds: number;
  occupied: number;
  available: number;
  type: 'ICU' | 'Deluxe' | 'General';
  /** Charge per day (₹) used for admission advances. */
  dailyRate?: number;
}

export const INITIAL_WARD_INFO: WardInfo[] = [
  { id: 'ward-icu', name: 'ICU / Critical Care', totalBeds: 8, occupied: 6, available: 2, type: 'ICU', dailyRate: 7500 },
  { id: 'ward-deluxe', name: 'Private Deluxe Suites', totalBeds: 24, occupied: 20, available: 4, type: 'Deluxe', dailyRate: 3500 },
  { id: 'ward-gen-a', name: 'General Ward A (Male)', totalBeds: 110, occupied: 82, available: 28, type: 'General', dailyRate: 1600 },
  { id: 'ward-gen-b', name: 'General Ward B (Female)', totalBeds: 108, occupied: 79, available: 29, type: 'General', dailyRate: 1600 },
];

export const INITIAL_NURSE_TASKS: NurseTask[] = [
  {
    id: 'nt-1',
    title: 'Check Vitals - Ward A',
    category: 'Vitals',
    ward: 'Ward A • Bed 14',
    patientName: 'Arun Kumar',
    uhid: 'CC202600142',
    patientId: 'pat-6',
    timeDue: '10:00 AM',
    completed: false,
    priority: 'High',
    notes: 'SpO2 dipped to 92% overnight — record BP, SpO2, pulse, temp every 2 hrs',
  },
  {
    id: 'nt-2',
    title: 'Medicine Round - Ward B',
    category: 'Medication',
    ward: 'Ward B • Bed 04',
    patientName: 'Maria Joseph',
    uhid: 'CC202600143',
    patientId: 'pat-7',
    timeDue: '11:30 AM',
    completed: false,
    priority: 'Medium',
    notes: 'Amlodipine 5mg + Telmisartan 40mg — check BP before dose; no NSAIDs',
  },
  {
    id: 'nt-3',
    title: 'Follow-up - ICU Bed 3',
    category: 'ICU Follow-up',
    ward: 'ICU • Bed 3',
    patientName: 'Ramanathan G',
    uhid: 'CC202500099',
    patientId: 'pat-9',
    timeDue: '12:00 PM',
    completed: false,
    priority: 'High',
    notes: 'Check arterial line pressure & ventilator synchrony; SAT/SBT with Dr. Farhan',
  },
  {
    id: 'nt-4',
    title: 'Discharge Preparation',
    category: 'Discharge',
    ward: 'Deluxe Suite 104',
    patientName: 'Sunita Patel',
    uhid: 'CC202500084',
    patientId: 'pat-11',
    timeDue: '01:30 PM',
    completed: false,
    priority: 'Medium',
    notes: 'Handover discharge summary, pharmacy take-home kit & cannula removal',
  },
  {
    id: 'nt-5',
    title: 'Cardiac Monitoring - ICU Bed 5',
    category: 'Vitals',
    ward: 'ICU • Bed 5',
    patientName: 'George Thomas',
    uhid: 'CC202500112',
    patientId: 'pat-10',
    timeDue: '09:00 AM',
    completed: true,
    completedAt: '09:05 AM',
    priority: 'High',
    notes: 'Repeat Troponin sent; 12-lead ECG every 6 hrs',
  },
  {
    id: 'nt-6',
    title: 'Medication - Deluxe 101',
    category: 'Medication',
    ward: 'Deluxe Suite 101',
    patientName: 'Vikram K',
    uhid: 'CC202500128',
    patientId: 'pat-4',
    timeDue: '02:00 PM',
    completed: false,
    priority: 'Low',
    notes: 'Ursodeoxycholic acid 300mg; avoid hepatotoxic drugs; PENICILLIN ALLERGY',
  },
];

// -------------------------------------------------------------
// Lab samples (today's pipeline + result history for trends)
// -------------------------------------------------------------
export interface LabParameter {
  name: string;
  value: number;
  unit: string;
  low?: number;
  high?: number;
}

export interface LabSample {
  id: string;
  sampleCode: string;
  patientName: string;
  uhid: string;
  testName: string;
  category: 'Biochemistry' | 'Hematology' | 'Microbiology' | 'Pathology';
  collectedAt: string;
  status: 'New' | 'Processing' | 'Completed' | 'Abnormal';
  resultValue?: string;
  normalRange?: string;
  flag?: string;
  turnaroundTime: string;
  patientId?: string;
  /** ISO date collected */
  date?: string;
  parameters?: LabParameter[];
  orderedBy?: string;
}

export const INITIAL_LAB_SAMPLES: LabSample[] = [
  {
    id: 'smp-1',
    sampleCode: 'SMP-2026-9021',
    patientId: 'pat-1',
    patientName: 'Ananya S',
    uhid: 'CC202500125',
    testName: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    date: D(0),
    collectedAt: '08:30 AM',
    status: 'Completed',
    resultValue: 'Hb: 12.8 g/dL • TLC: 7,400 /mcL • Platelets: 2.4 Lakhs',
    normalRange: 'Hb: 12-15 • TLC: 4,000-11,000',
    turnaroundTime: 'Ready',
    orderedBy: 'Dr. Priya Menon',
    parameters: [
      { name: 'Hemoglobin', value: 12.8, unit: 'g/dL', low: 12, high: 15 },
      { name: 'TLC', value: 7400, unit: '/mcL', low: 4000, high: 11000 },
      { name: 'Platelets', value: 240000, unit: '/mcL', low: 150000, high: 450000 },
    ],
  },
  {
    id: 'smp-2',
    sampleCode: 'SMP-2026-9022',
    patientId: 'pat-4',
    patientName: 'Vikram K',
    uhid: 'CC202500128',
    testName: 'Liver Function Test (LFT)',
    category: 'Biochemistry',
    date: D(0),
    collectedAt: '09:15 AM',
    status: 'Abnormal',
    resultValue: 'SGPT (ALT): 88 U/L (High) • SGOT (AST): 76 U/L (High) • Bilirubin: 1.8 mg/dL',
    normalRange: 'ALT: <45 U/L • AST: <40 U/L',
    flag: 'Elevated Transaminases • Clinical correlation required',
    turnaroundTime: 'Review Flagged',
    orderedBy: 'Dr. Rajesh Varma',
    parameters: [
      { name: 'ALT (SGPT)', value: 88, unit: 'U/L', high: 45 },
      { name: 'AST (SGOT)', value: 76, unit: 'U/L', high: 40 },
      { name: 'Total Bilirubin', value: 1.8, unit: 'mg/dL', high: 1.2 },
    ],
  },
  {
    id: 'smp-3',
    sampleCode: 'SMP-2026-9023',
    patientId: 'pat-2',
    patientName: 'Rahul Nair',
    uhid: 'CC202500126',
    testName: 'Lipid Profile',
    category: 'Biochemistry',
    date: D(0),
    collectedAt: '09:45 AM',
    status: 'Processing',
    turnaroundTime: '30 mins left',
    orderedBy: 'Dr. Arjun Nair',
  },
  {
    id: 'smp-4',
    sampleCode: 'SMP-2026-9024',
    patientId: 'pat-5',
    patientName: 'Meera Krishnan',
    uhid: 'CC202500129',
    testName: 'HbA1c Glycated Hemoglobin',
    category: 'Biochemistry',
    date: D(0),
    collectedAt: '08:15 AM',
    status: 'Abnormal',
    resultValue: '10.2% (Uncontrolled Glycemia)',
    normalRange: '< 5.7% Normal • 5.7-6.4% Pre-diabetic',
    flag: 'Critical Hyperglycemic Risk (HbA1c > 10%)',
    turnaroundTime: 'Doctor Notified',
    orderedBy: 'Dr. Priya Menon',
    parameters: [{ name: 'HbA1c', value: 10.2, unit: '%', high: 5.7 }],
  },
  {
    id: 'smp-5',
    sampleCode: 'SMP-2026-9025',
    patientId: 'pat-3',
    patientName: 'Sneha Joseph',
    uhid: 'CC202500127',
    testName: 'Thyroid Profile (T3, T4, TSH)',
    category: 'Biochemistry',
    date: D(0),
    collectedAt: '10:00 AM',
    status: 'New',
    turnaroundTime: 'Queued (1 hr)',
    orderedBy: 'Dr. Anil Kumar',
  },
  {
    id: 'smp-6',
    sampleCode: 'SMP-2026-9026',
    patientId: 'pat-7',
    patientName: 'Maria Joseph',
    uhid: 'CC202600143',
    testName: 'KFT (Kidney Function Test)',
    category: 'Biochemistry',
    date: D(0),
    collectedAt: '07:10 AM',
    status: 'Abnormal',
    resultValue: 'Creatinine: 1.6 mg/dL (High) • eGFR: 52 • Urea: 58 mg/dL (High)',
    normalRange: 'Creatinine: 0.6-1.2 • eGFR: >90 • Urea: 15-40',
    flag: 'Declining renal function vs last month',
    turnaroundTime: 'Doctor Notified',
    orderedBy: 'Dr. Priya Menon',
    parameters: [
      { name: 'Creatinine', value: 1.6, unit: 'mg/dL', low: 0.6, high: 1.2 },
      { name: 'eGFR', value: 52, unit: 'mL/min', low: 90 },
      { name: 'Urea', value: 58, unit: 'mg/dL', low: 15, high: 40 },
    ],
  },
  {
    id: 'smp-7',
    sampleCode: 'SMP-2026-9027',
    patientId: 'pat-6',
    patientName: 'Arun Kumar',
    uhid: 'CC202600142',
    testName: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    date: D(0),
    collectedAt: '06:30 AM',
    status: 'Abnormal',
    resultValue: 'Hb: 13.9 g/dL • TLC: 14,200 /mcL (High) • Platelets: 3.1 Lakhs',
    normalRange: 'TLC: 4,000-11,000',
    flag: 'Leukocytosis rising (11,800 → 14,200)',
    turnaroundTime: 'Doctor Notified',
    orderedBy: 'Dr. Priya Menon',
    parameters: [
      { name: 'Hemoglobin', value: 13.9, unit: 'g/dL', low: 13, high: 17 },
      { name: 'TLC', value: 14200, unit: '/mcL', low: 4000, high: 11000 },
      { name: 'Platelets', value: 310000, unit: '/mcL', low: 150000, high: 450000 },
    ],
  },
  {
    id: 'smp-8',
    sampleCode: 'SMP-2026-9028',
    patientId: 'pat-8',
    patientName: 'Suresh Kumar',
    uhid: 'CC202600151',
    testName: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    date: D(0),
    collectedAt: '—',
    status: 'New',
    turnaroundTime: 'Awaiting sample',
    orderedBy: 'Dr. Priya Menon',
  },
  {
    id: 'smp-9',
    sampleCode: 'SMP-2026-9029',
    patientId: 'pat-10',
    patientName: 'George Thomas',
    uhid: 'CC202500112',
    testName: 'Troponin I (Quantitative)',
    category: 'Biochemistry',
    date: D(0),
    collectedAt: '09:00 AM',
    status: 'Processing',
    turnaroundTime: '20 mins left',
    orderedBy: 'Dr. Arjun Nair',
  },
  // ---- History (completed earlier — powers trends & "compare previous labs")
  {
    id: 'smp-h1',
    sampleCode: 'SMP-2026-7310',
    patientId: 'pat-5',
    patientName: 'Meera Krishnan',
    uhid: 'CC202500129',
    testName: 'HbA1c Glycated Hemoglobin',
    category: 'Biochemistry',
    date: D(-90),
    collectedAt: '09:10 AM',
    status: 'Abnormal',
    resultValue: '9.1%',
    normalRange: '< 5.7%',
    turnaroundTime: 'Ready',
    orderedBy: 'Dr. Priya Menon',
    parameters: [{ name: 'HbA1c', value: 9.1, unit: '%', high: 5.7 }],
  },
  {
    id: 'smp-h2',
    sampleCode: 'SMP-2026-5122',
    patientId: 'pat-5',
    patientName: 'Meera Krishnan',
    uhid: 'CC202500129',
    testName: 'HbA1c Glycated Hemoglobin',
    category: 'Biochemistry',
    date: D(-180),
    collectedAt: '08:40 AM',
    status: 'Abnormal',
    resultValue: '8.4%',
    normalRange: '< 5.7%',
    turnaroundTime: 'Ready',
    orderedBy: 'Dr. Priya Menon',
    parameters: [{ name: 'HbA1c', value: 8.4, unit: '%', high: 5.7 }],
  },
  {
    id: 'smp-h3',
    sampleCode: 'SMP-2026-8004',
    patientId: 'pat-4',
    patientName: 'Vikram K',
    uhid: 'CC202500128',
    testName: 'Liver Function Test (LFT)',
    category: 'Biochemistry',
    date: D(-60),
    collectedAt: '10:00 AM',
    status: 'Abnormal',
    resultValue: 'ALT: 52 U/L • AST: 44 U/L • Bilirubin: 1.1 mg/dL',
    normalRange: 'ALT: <45 • AST: <40',
    turnaroundTime: 'Ready',
    orderedBy: 'Dr. Priya Menon',
    parameters: [
      { name: 'ALT (SGPT)', value: 52, unit: 'U/L', high: 45 },
      { name: 'AST (SGOT)', value: 44, unit: 'U/L', high: 40 },
      { name: 'Total Bilirubin', value: 1.1, unit: 'mg/dL', high: 1.2 },
    ],
  },
  {
    id: 'smp-h4',
    sampleCode: 'SMP-2026-8710',
    patientId: 'pat-7',
    patientName: 'Maria Joseph',
    uhid: 'CC202600143',
    testName: 'KFT (Kidney Function Test)',
    category: 'Biochemistry',
    date: D(-30),
    collectedAt: '08:00 AM',
    status: 'Abnormal',
    resultValue: 'Creatinine: 1.3 mg/dL • eGFR: 61 • Urea: 44 mg/dL',
    normalRange: 'Creatinine: 0.6-1.2',
    turnaroundTime: 'Ready',
    orderedBy: 'Dr. Priya Menon',
    parameters: [
      { name: 'Creatinine', value: 1.3, unit: 'mg/dL', low: 0.6, high: 1.2 },
      { name: 'eGFR', value: 61, unit: 'mL/min', low: 90 },
      { name: 'Urea', value: 44, unit: 'mg/dL', low: 15, high: 40 },
    ],
  },
  {
    id: 'smp-h5',
    sampleCode: 'SMP-2026-9001',
    patientId: 'pat-1',
    patientName: 'Ananya S',
    uhid: 'CC202500125',
    testName: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    date: D(-8),
    collectedAt: '07:00 AM',
    status: 'Abnormal',
    resultValue: 'Hb: 12.1 g/dL • TLC: 3,800 /mcL (Low) • Platelets: 1.6 Lakhs',
    normalRange: 'TLC: 4,000-11,000',
    turnaroundTime: 'Ready',
    orderedBy: 'Dr. Priya Menon',
    parameters: [
      { name: 'Hemoglobin', value: 12.1, unit: 'g/dL', low: 12, high: 15 },
      { name: 'TLC', value: 3800, unit: '/mcL', low: 4000, high: 11000 },
      { name: 'Platelets', value: 160000, unit: '/mcL', low: 150000, high: 450000 },
    ],
  },
  {
    id: 'smp-h6',
    sampleCode: 'SMP-2026-6090',
    patientId: 'pat-2',
    patientName: 'Rahul Nair',
    uhid: 'CC202500126',
    testName: 'Lipid Profile',
    category: 'Biochemistry',
    date: D(-92),
    collectedAt: '08:20 AM',
    status: 'Abnormal',
    resultValue: 'Total Cholesterol: 242 mg/dL • LDL: 168 mg/dL (High) • HDL: 38 mg/dL (Low)',
    normalRange: 'LDL: <100 • HDL: >40',
    turnaroundTime: 'Ready',
    orderedBy: 'Dr. Arjun Nair',
    parameters: [
      { name: 'Total Cholesterol', value: 242, unit: 'mg/dL', high: 200 },
      { name: 'LDL', value: 168, unit: 'mg/dL', high: 100 },
      { name: 'HDL', value: 38, unit: 'mg/dL', low: 40 },
    ],
  },
  {
    id: 'smp-h7',
    sampleCode: 'SMP-2026-8990',
    patientId: 'pat-6',
    patientName: 'Arun Kumar',
    uhid: 'CC202600142',
    testName: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    date: D(-2),
    collectedAt: '06:30 AM',
    status: 'Abnormal',
    resultValue: 'Hb: 14.1 g/dL • TLC: 11,800 /mcL (High) • Platelets: 2.9 Lakhs',
    normalRange: 'TLC: 4,000-11,000',
    turnaroundTime: 'Ready',
    orderedBy: 'Dr. Priya Menon',
    parameters: [
      { name: 'Hemoglobin', value: 14.1, unit: 'g/dL', low: 13, high: 17 },
      { name: 'TLC', value: 11800, unit: '/mcL', low: 4000, high: 11000 },
      { name: 'Platelets', value: 290000, unit: '/mcL', low: 150000, high: 450000 },
    ],
  },
  {
    id: 'smp-h8',
    sampleCode: 'SMP-2026-8551',
    patientId: 'pat-12',
    patientName: 'Kavya Menon',
    uhid: 'CC202600160',
    testName: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    date: D(-1),
    collectedAt: '06:00 AM',
    status: 'Completed',
    resultValue: 'Hb: 12.4 g/dL • TLC: 5,200 /mcL • Platelets: 1.62 Lakhs',
    normalRange: 'Platelets: 1.5-4.5 Lakhs',
    turnaroundTime: 'Ready',
    orderedBy: 'Dr. Priya Menon',
    parameters: [
      { name: 'Hemoglobin', value: 12.4, unit: 'g/dL', low: 12, high: 15 },
      { name: 'TLC', value: 5200, unit: '/mcL', low: 4000, high: 11000 },
      { name: 'Platelets', value: 162000, unit: '/mcL', low: 150000, high: 450000 },
    ],
  },
];

/**
 * Samples in today's pipeline that aren't modelled individually. Added to the
 * live counts so the lab dashboard opens at the design's 12 / 28 / 56 / 8.
 */
export const LAB_PIPELINE_BASE: Record<LabSample['status'], number> = {
  New: 10,
  Processing: 26,
  Completed: 55,
  Abnormal: 4,
};

// -------------------------------------------------------------
// Radiology orders
// -------------------------------------------------------------
export interface RadiologyOrder {
  id: string;
  patientId: string;
  patientName: string;
  scanName: string;
  category: RadiologyScan['category'];
  /** ISO date */
  date: string;
  time: string;
  status: 'Scheduled' | 'In Progress' | 'Reported';
  findings?: string;
  impression?: string;
  orderedBy: string;
}

export const INITIAL_RADIOLOGY_ORDERS: RadiologyOrder[] = [
  {
    id: 'ro-1',
    patientId: 'pat-7',
    patientName: 'Maria Joseph',
    scanName: 'Ultrasound (Whole Abdomen)',
    category: 'Ultrasound',
    date: D(0),
    time: '11:00 AM',
    status: 'Reported',
    findings: 'Both kidneys normal in size with increased cortical echogenicity. No hydronephrosis or calculi.',
    impression: 'Bilateral grade I renal parenchymal disease.',
    orderedBy: 'Dr. Priya Menon',
  },
  {
    id: 'ro-2',
    patientId: 'pat-6',
    patientName: 'Arun Kumar',
    scanName: 'X-Ray (Chest PA)',
    category: 'X-Ray',
    date: D(-3),
    time: '08:30 PM',
    status: 'Reported',
    findings: 'Homogeneous opacity in the right lower zone with air bronchogram. Costophrenic angles clear.',
    impression: 'Right lower lobe consolidation — pneumonia.',
    orderedBy: 'Dr. Priya Menon',
  },
  {
    id: 'ro-3',
    patientId: 'pat-9',
    patientName: 'Ramanathan G',
    scanName: 'HRCT Chest',
    category: 'CT Scan',
    date: D(-5),
    time: '11:45 PM',
    status: 'Reported',
    findings: 'Centrilobular and paraseptal emphysema, bilateral upper lobes. No consolidation. (Non-contrast — contrast allergy.)',
    impression: 'Emphysematous COPD; no acute parenchymal lesion.',
    orderedBy: 'Dr. Farhan Ali',
  },
  {
    id: 'ro-4',
    patientId: 'pat-4',
    patientName: 'Vikram K',
    scanName: 'X-Ray (Knee AP & Lateral)',
    category: 'X-Ray',
    date: D(0),
    time: '04:00 PM',
    status: 'Scheduled',
    orderedBy: 'Dr. Rajesh Varma',
  },
];

// -------------------------------------------------------------
// Pharmacy prescription safety review
// -------------------------------------------------------------
export interface PrescriptionReviewItem {
  id: string;
  prescriptionCode: string;
  patientName: string;
  uhid: string;
  age: number;
  gender: string;
  doctorName: string;
  drugs: string[];
  safetyStatus: 'Safe' | 'Interaction Warning' | 'Allergy Warning';
  interactionAlert?: string;
  allergyAlert?: string;
  dosageValidation: string;
  alternativeSuggestion?: string;
  status: 'Pending Review' | 'Dispensed' | 'Doctor Clarification';
  patientId?: string;
  /** Dispensable lines — dispensing deducts these from pharmacy stock. */
  items?: Array<{ medicineId?: string; name: string; qty: number }>;
  source?: string;
  /** Pharmacist's question to the prescriber (status 'Doctor Clarification'). */
  clarificationNote?: string;
}

export const INITIAL_PRESCRIPTION_REVIEWS: PrescriptionReviewItem[] = [
  {
    id: 'rx-1',
    prescriptionCode: 'RX-2026-00401',
    patientId: 'pat-2',
    patientName: 'Rahul Nair',
    uhid: 'CC202500126',
    age: 45,
    gender: 'Male',
    doctorName: 'Dr. Arjun Nair',
    drugs: ['Atorvastatin 10mg (Night)', 'Clarithromycin 500mg (BD)'],
    safetyStatus: 'Interaction Warning',
    interactionAlert:
      'Clarithromycin strongly inhibits CYP3A4, dramatically elevating Atorvastatin serum levels. High risk of Myopathy / Rhabdomyolysis.',
    dosageValidation: 'Standard adult dosages for both individual agents.',
    alternativeSuggestion:
      'Replace Clarithromycin with Azithromycin 500mg OD (minimal CYP3A4 interaction) or temporarily suspend Atorvastatin.',
    status: 'Pending Review',
    items: [
      { medicineId: 'med-8', name: 'Atorvastatin 10mg', qty: 10 },
      { medicineId: 'med-9', name: 'Clarithromycin 500mg', qty: 10 },
    ],
    source: 'OPD Consultation',
  },
  {
    id: 'rx-2',
    prescriptionCode: 'RX-2026-00402',
    patientId: 'pat-4',
    patientName: 'Vikram K',
    uhid: 'CC202500128',
    age: 52,
    gender: 'Male',
    doctorName: 'Dr. Rajesh Varma',
    drugs: ['Amoxicillin 500mg (TDS)', 'Paracetamol 500mg (SOS)'],
    safetyStatus: 'Allergy Warning',
    allergyAlert: 'CRITICAL: Patient has documented Penicillin allergy (History of severe urticaria & angioedema).',
    dosageValidation: 'Amoxicillin contraindicated due to beta-lactam hypersensitivity.',
    alternativeSuggestion: 'Substitute with Ciprofloxacin 500mg BD or Clindamycin 300mg TDS.',
    status: 'Pending Review',
    items: [
      { medicineId: 'med-2', name: 'Amoxicillin 500mg', qty: 15 },
      { medicineId: 'med-1', name: 'Paracetamol 500mg', qty: 10 },
    ],
    source: 'IPD Order',
  },
  {
    id: 'rx-3',
    prescriptionCode: 'RX-2026-00403',
    patientId: 'pat-1',
    patientName: 'Ananya S',
    uhid: 'CC202500125',
    age: 32,
    gender: 'Female',
    doctorName: 'Dr. Priya Menon',
    drugs: ['Paracetamol 500mg (TDS)', 'Pantoprazole 40mg (OD AC)', 'Vitamin D3 Sachet (Weekly)'],
    safetyStatus: 'Safe',
    dosageValidation: 'Appropriate therapeutic dosages for acute viral management.',
    status: 'Dispensed',
    items: [
      { medicineId: 'med-1', name: 'Paracetamol 500mg', qty: 15 },
      { medicineId: 'med-3', name: 'Pantoprazole 40mg', qty: 5 },
      { medicineId: 'med-5', name: 'Vitamin D3', qty: 2 },
    ],
    source: 'Discharge Medication',
  },
  {
    id: 'rx-4',
    prescriptionCode: 'RX-2026-00404',
    patientId: 'pat-7',
    patientName: 'Maria Joseph',
    uhid: 'CC202600143',
    age: 56,
    gender: 'Female',
    doctorName: 'Dr. Priya Menon',
    drugs: ['Diclofenac 50mg (BD)', 'Amlodipine 5mg (OD)'],
    safetyStatus: 'Allergy Warning',
    allergyAlert: 'Documented NSAID intolerance; eGFR 52 — NSAIDs risk acute kidney injury in CKD 3a.',
    dosageValidation: 'Amlodipine dose appropriate. Diclofenac should be avoided in CKD.',
    alternativeSuggestion: 'Use Paracetamol 500mg TDS for headache; review BP control.',
    status: 'Pending Review',
    items: [
      { name: 'Diclofenac 50mg', qty: 10 },
      { medicineId: 'med-12', name: 'Amlodipine 5mg', qty: 10 },
    ],
    source: 'IPD Order',
  },
  {
    id: 'rx-5',
    prescriptionCode: 'RX-2026-00405',
    patientId: 'pat-5',
    patientName: 'Meera Krishnan',
    uhid: 'CC202500129',
    age: 42,
    gender: 'Female',
    doctorName: 'Dr. Priya Menon',
    drugs: ['Metformin 500mg (BD)', 'Vitamin D3 Sachet (Weekly)'],
    safetyStatus: 'Safe',
    dosageValidation: 'Metformin dose within range (eGFR 88). No interactions detected.',
    status: 'Pending Review',
    items: [
      { medicineId: 'med-4', name: 'Metformin 500mg', qty: 60 },
      { medicineId: 'med-5', name: 'Vitamin D3', qty: 4 },
    ],
    source: 'OPD Consultation',
  },
];

// -------------------------------------------------------------
// Hospital knowledge (RAG) — clinical protocols
// -------------------------------------------------------------
export interface HospitalProtocol {
  id: string;
  title: string;
  category: 'Emergency' | 'Infection Control' | 'Cardiology' | 'Endocrine' | 'Respiratory' | 'Surgery';
  description: string;
  keySteps: string[];
  lastUpdated: string;
  keywords?: string[];
}

export const INITIAL_HOSPITAL_PROTOCOLS: HospitalProtocol[] = [
  {
    id: 'proto-1',
    title: 'Sepsis Resuscitation & Hour-1 Bundle',
    category: 'Emergency',
    description: 'Immediate diagnostic & resuscitation measures upon suspected sepsis or qSOFA ≥ 2.',
    keySteps: [
      '1. Measure blood lactate level immediately; remeasure if initial lactate > 2 mmol/L',
      '2. Obtain blood cultures (2 sets) prior to initiating antibiotics',
      '3. Administer broad-spectrum empiric IV antimicrobials within 60 minutes',
      '4. Rapid infusion of 30 mL/kg crystalloid for hypotension or lactate ≥ 4 mmol/L',
      '5. Apply vasopressors (Norepinephrine first-choice) during or after fluid resuscitation if MAP < 65 mmHg',
    ],
    lastUpdated: display(-42),
    keywords: ['sepsis', 'septic', 'lactate', 'qsofa', 'shock'],
  },
  {
    id: 'proto-2',
    title: 'Hospital Antibiotic Stewardship Policy (HAST)',
    category: 'Infection Control',
    description: 'Restriction guidelines for Reserve Carbapenems, Vancomycin, and Colistin.',
    keySteps: [
      '1. Access-group antibiotics (Amoxicillin, Cefuroxime) first-line for uncomplicated infections',
      '2. Meropenem / Colistin requires Infectious Disease CMO pre-authorization within 24 hours',
      '3. Mandatory de-escalation review at 48 hours post microbiological culture sensitivity release',
    ],
    lastUpdated: display(-25),
    keywords: ['antibiotic', 'stewardship', 'meropenem', 'colistin', 'vancomycin'],
  },
  {
    id: 'proto-3',
    title: 'Type 2 Diabetes Glycemic Management (In-Patient)',
    category: 'Endocrine',
    description: 'Protocol for managing hospitalized hyperglycemic non-critically ill and critically ill patients.',
    keySteps: [
      '1. Target blood glucose: 140-180 mg/dL for majority of hospitalized patients',
      '2. Stop oral hypoglycemics (Metformin, SGLT2i) in patients with eGFR < 30 or acute contrast studies',
      '3. Initiate basal-bolus subcutaneous insulin regimen; avoid standalone sliding scale insulin',
    ],
    lastUpdated: display(-68),
    keywords: ['diabetes', 'hba1c', 'insulin', 'glucose', 'metformin', 'hyperglycemia'],
  },
  {
    id: 'proto-4',
    title: 'Acute Coronary Syndrome (ACS) First Contact',
    category: 'Cardiology',
    description: 'Code STEMI & NSTEMI rapid triage within 10 minutes of ER presentation.',
    keySteps: [
      '1. 12-lead ECG acquired and interpreted within 10 minutes',
      '2. Chewable Aspirin 300mg + Ticagrelor 180mg / Clopidogrel 300mg immediately',
      '3. High-intensity Statin: Atorvastatin 80mg stat',
      '4. Activate Cath Lab for Primary PCI if STEMI diagnosed; target Door-to-Balloon time < 90 mins',
    ],
    lastUpdated: display(-108),
    keywords: ['acs', 'stemi', 'nstemi', 'chest pain', 'troponin', 'cardiac', 'mi'],
  },
  {
    id: 'proto-5',
    title: 'Dengue Fever — Warning Signs & Platelet Thresholds',
    category: 'Infection Control',
    description: 'WHO-aligned triage and fluid management for dengue with or without warning signs.',
    keySteps: [
      '1. Admit if warning signs: abdominal pain, persistent vomiting, mucosal bleed, lethargy, rising HCT with falling platelets',
      '2. Crystalloid 5-7 mL/kg/hr for 1-2 hrs, then taper per HCT response',
      '3. Platelet transfusion only if < 10,000/mcL or active bleeding',
      '4. Avoid NSAIDs and IM injections; Paracetamol for fever',
    ],
    lastUpdated: display(-12),
    keywords: ['dengue', 'platelet', 'ns1', 'thrombocytopenia'],
  },
  {
    id: 'proto-6',
    title: 'COPD Exacerbation & Ventilator Weaning',
    category: 'Respiratory',
    description: 'Management of acute exacerbation of COPD including NIV criteria and daily SAT/SBT.',
    keySteps: [
      '1. Target SpO2 88-92%; ABG within 1 hour of O2 titration',
      '2. NIV (BiPAP) if pH < 7.35 and pCO2 > 45 despite optimal therapy',
      '3. Systemic steroids (Prednisolone 40mg × 5 days) + short-acting bronchodilators',
      '4. Daily spontaneous awakening & breathing trial for ventilated patients',
    ],
    lastUpdated: display(-30),
    keywords: ['copd', 'ventilator', 'weaning', 'bipap', 'niv', 'respiratory'],
  },
  {
    id: 'proto-7',
    title: 'Post-operative Discharge Checklist',
    category: 'Surgery',
    description: 'Standard checklist before discharging post-surgical patients.',
    keySteps: [
      '1. Afebrile > 24 hrs, tolerating oral diet, pain controlled on oral analgesia',
      '2. Wound inspected and documented; drain removed',
      '3. Discharge medications reconciled by pharmacist',
      '4. Final bill cleared or TPA approval documented before gate pass',
    ],
    lastUpdated: display(-55),
    keywords: ['discharge', 'post-op', 'surgery', 'checklist', 'wound'],
  },
];

// -------------------------------------------------------------
// Patient self-service app
// -------------------------------------------------------------
export interface PatientReminder {
  id: string;
  medicineName: string;
  dosage: string;
  time: string;
  taken: boolean;
  instructions: string;
  patientId?: string;
  /** Clock time the dose was marked taken. */
  takenAt?: string;
}

export const INITIAL_PATIENT_REMINDERS: PatientReminder[] = [
  { id: 'rem-1', patientId: 'pat-1', medicineName: 'Pantoprazole 40mg', dosage: '1 Tablet', time: '08:00 AM', taken: true, instructions: 'Before breakfast with a glass of water' },
  { id: 'rem-2', patientId: 'pat-1', medicineName: 'Paracetamol 500mg', dosage: '1 Tablet', time: '01:30 PM', taken: false, instructions: 'After lunch if fever persists' },
  { id: 'rem-3', patientId: 'pat-1', medicineName: 'Vitamin C & Zinc', dosage: '1 Tablet', time: '08:30 PM', taken: false, instructions: 'After dinner' },
];

/** The patient signed in to the Patient App demo. */
export const PATIENT_APP_USER_ID = 'pat-1';

export interface HospitalLocation {
  id: string;
  name: string;
  floor: string;
  block: string;
  directions: string;
  icon: string;
  walkMinutes: number;
}

export const HOSPITAL_LOCATIONS: HospitalLocation[] = [
  { id: 'loc-1', name: 'OPD Registration & Billing', floor: 'Ground Floor', block: 'Main Block', directions: 'Enter through the main gate; counters are on your right.', icon: 'card', walkMinutes: 1 },
  { id: 'loc-2', name: 'General Medicine OPD (Room 201)', floor: '2nd Floor', block: 'Main Block', directions: 'Take lift A to the 2nd floor, turn left; Room 201 is the third door.', icon: 'medkit', walkMinutes: 4 },
  { id: 'loc-3', name: 'Laboratory Sample Collection', floor: 'Ground Floor', block: 'Diagnostics Wing', directions: 'Walk past the pharmacy and follow the purple floor line.', icon: 'flask', walkMinutes: 3 },
  { id: 'loc-4', name: 'Radiology (X-Ray, CT, MRI)', floor: 'Lower Ground', block: 'Diagnostics Wing', directions: 'Take the ramp down from the Diagnostics Wing lobby.', icon: 'scan', walkMinutes: 5 },
  { id: 'loc-5', name: 'Pharmacy (24 x 7)', floor: 'Ground Floor', block: 'Main Block', directions: 'Next to the main lobby café, opposite the lift lobby.', icon: 'medical', walkMinutes: 2 },
  { id: 'loc-6', name: 'Emergency & Casualty', floor: 'Ground Floor', block: 'Emergency Block', directions: 'Separate entrance from the east gate; ambulance bay on the left.', icon: 'alert-circle', walkMinutes: 3 },
  { id: 'loc-7', name: 'Cardiology OPD (Room 305)', floor: '3rd Floor', block: 'Main Block', directions: 'Take lift B to the 3rd floor; follow the red signage.', icon: 'heart', walkMinutes: 5 },
];

// -------------------------------------------------------------
// Operations: blood bank, ambulances, supplies, documents
// -------------------------------------------------------------
export interface BloodStock {
  group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  wholeBlood: number;
  prbc: number;
  platelets: number;
  plasma: number;
}

export const INITIAL_BLOOD_STOCK: BloodStock[] = [
  { group: 'A+', wholeBlood: 14, prbc: 22, platelets: 9, plasma: 18 },
  { group: 'A-', wholeBlood: 3, prbc: 5, platelets: 2, plasma: 4 },
  { group: 'B+', wholeBlood: 18, prbc: 26, platelets: 11, plasma: 20 },
  { group: 'B-', wholeBlood: 2, prbc: 3, platelets: 1, plasma: 3 },
  { group: 'AB+', wholeBlood: 6, prbc: 8, platelets: 4, plasma: 7 },
  { group: 'AB-', wholeBlood: 1, prbc: 1, platelets: 0, plasma: 2 },
  { group: 'O+', wholeBlood: 21, prbc: 30, platelets: 12, plasma: 24 },
  { group: 'O-', wholeBlood: 3, prbc: 4, platelets: 2, plasma: 5 },
];

export interface BloodRequest {
  id: string;
  patientId: string;
  patientName: string;
  group: BloodStock['group'];
  component: 'Whole Blood' | 'PRBC' | 'Platelets' | 'Plasma';
  units: number;
  priority: 'Emergency' | 'Routine';
  status: 'Pending Cross-match' | 'Issued' | 'Rejected';
  requestedBy: string;
  requestedAt: string;
  rejectionReason?: string;
}

export const INITIAL_BLOOD_REQUESTS: BloodRequest[] = [
  { id: 'br-1', patientId: 'pat-10', patientName: 'George Thomas', group: 'A+', component: 'PRBC', units: 2, priority: 'Routine', status: 'Pending Cross-match', requestedBy: 'Dr. Arjun Nair', requestedAt: '08:10 AM' },
  { id: 'br-2', patientId: 'pat-9', patientName: 'Ramanathan G', group: 'O-', component: 'Plasma', units: 1, priority: 'Emergency', status: 'Pending Cross-match', requestedBy: 'Dr. Farhan Ali', requestedAt: '09:35 AM' },
  { id: 'br-3', patientId: 'pat-12', patientName: 'Kavya Menon', group: 'AB-', component: 'Platelets', units: 1, priority: 'Emergency', status: 'Issued', requestedBy: 'Dr. Priya Menon', requestedAt: `${display(-3)} 11:20 PM` },
];

export interface Ambulance {
  id: string;
  vehicleNo: string;
  type: 'ALS' | 'BLS' | 'Neonatal';
  driver: string;
  driverPhone?: string;
  paramedic?: string;
  status: 'Available' | 'On Trip' | 'Maintenance';
  location: string;
  trip?: { pickup: string; reason: string; etaMinutes: number; priority?: 'Emergency' | 'Routine'; dispatchedAt?: number };
}

export const INITIAL_AMBULANCES: Ambulance[] = [
  { id: 'amb-1', vehicleNo: 'KL-07-AB-1024', type: 'ALS', driver: 'Biju Mathew', driverPhone: '+91 94470 55101', paramedic: 'Jithin R', status: 'Available', location: 'Main Block Bay 1' },
  { id: 'amb-2', vehicleNo: 'KL-07-CD-2211', type: 'ALS', driver: 'Shaji P', driverPhone: '+91 94470 55102', paramedic: 'Anu Varghese', status: 'On Trip', location: 'Edappally Signal', trip: { pickup: 'Edappally, NH 66', reason: 'Road traffic accident — 1 casualty', etaMinutes: 12, priority: 'Emergency', dispatchedAt: Date.now() - 6 * 60000 } },
  { id: 'amb-3', vehicleNo: 'KL-07-EF-3302', type: 'BLS', driver: 'Rafeeq M', driverPhone: '+91 94470 55103', status: 'Available', location: 'Emergency Bay 2' },
  { id: 'amb-4', vehicleNo: 'KL-07-GH-4410', type: 'BLS', driver: 'Manoj K', driverPhone: '+91 94470 55104', status: 'Maintenance', location: 'Service Centre, Kalamassery' },
  { id: 'amb-5', vehicleNo: 'KL-07-JK-5520', type: 'Neonatal', driver: 'Sunil Das', driverPhone: '+91 94470 55105', paramedic: 'Neethu S', status: 'Available', location: 'Main Block Bay 3' },
];

export interface SupplyItem {
  id: string;
  name: string;
  category: 'PPE' | 'Consumables' | 'Surgical' | 'Respiratory' | 'Housekeeping';
  stock: number;
  unit: string;
  reorderLevel: number;
  supplier: string;
  lastRestocked: string;
  onOrder?: number;
}

export const INITIAL_SUPPLIES: SupplyItem[] = [
  { id: 'sup-1', name: 'Surgical Gloves (Sterile, 7.5)', category: 'Surgical', stock: 180, unit: 'boxes', reorderLevel: 100, supplier: 'MedLine India', lastRestocked: display(-6) },
  { id: 'sup-2', name: 'N95 Respirator Masks', category: 'PPE', stock: 60, unit: 'pcs', reorderLevel: 150, supplier: '3M Healthcare', lastRestocked: display(-19) },
  { id: 'sup-3', name: 'IV Cannula 20G', category: 'Consumables', stock: 340, unit: 'pcs', reorderLevel: 200, supplier: 'BD India', lastRestocked: display(-9) },
  { id: 'sup-4', name: 'Disposable Syringes 5ml', category: 'Consumables', stock: 1200, unit: 'pcs', reorderLevel: 800, supplier: 'HMD Dispovan', lastRestocked: display(-4) },
  { id: 'sup-5', name: 'Oxygen Cylinders (D-type)', category: 'Respiratory', stock: 18, unit: 'cylinders', reorderLevel: 20, supplier: 'Kerala Oxygen Ltd', lastRestocked: display(-2) },
  { id: 'sup-6', name: 'Sterile Gauze Rolls', category: 'Surgical', stock: 90, unit: 'rolls', reorderLevel: 120, supplier: 'MedLine India', lastRestocked: display(-15) },
  { id: 'sup-7', name: 'PPE Kits (Level 3)', category: 'PPE', stock: 45, unit: 'kits', reorderLevel: 60, supplier: 'SafeWear', lastRestocked: display(-27) },
  { id: 'sup-8', name: 'Hand Sanitizer 5L', category: 'Housekeeping', stock: 25, unit: 'cans', reorderLevel: 20, supplier: 'Lifebuoy Pro', lastRestocked: display(-11) },
];

export interface PatientDocument {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  type: 'Consent' | 'ID Proof' | 'Insurance' | 'Lab Report' | 'Discharge' | 'Imaging';
  /** ISO date */
  date: string;
  size: string;
  uploadedBy: string;
}

export const INITIAL_DOCUMENTS: PatientDocument[] = [
  { id: 'doc-f1', patientId: 'pat-11', patientName: 'Sunita Patel', title: 'Surgical Consent — Lap. Cholecystectomy', type: 'Consent', date: D(-3), size: '420 KB', uploadedBy: 'Dr. Rajesh Varma' },
  { id: 'doc-f2', patientId: 'pat-10', patientName: 'George Thomas', title: 'Insurance Pre-authorization (LIC Health)', type: 'Insurance', date: D(-2), size: '1.1 MB', uploadedBy: 'TPA Desk' },
  { id: 'doc-f3', patientId: 'pat-1', patientName: 'Ananya S', title: 'Discharge Summary', type: 'Discharge', date: D(-4), size: '310 KB', uploadedBy: 'Dr. Priya Menon' },
  { id: 'doc-f4', patientId: 'pat-1', patientName: 'Ananya S', title: 'Aadhaar Card', type: 'ID Proof', date: D(-260), size: '640 KB', uploadedBy: 'Front Office' },
  { id: 'doc-f5', patientId: 'pat-6', patientName: 'Arun Kumar', title: 'Chest X-Ray Report', type: 'Imaging', date: D(-3), size: '2.4 MB', uploadedBy: 'Radiology' },
  { id: 'doc-f6', patientId: 'pat-12', patientName: 'Kavya Menon', title: 'Discharge Summary', type: 'Discharge', date: D(-1), size: '290 KB', uploadedBy: 'Dr. Priya Menon' },
  { id: 'doc-f7', patientId: 'pat-5', patientName: 'Meera Krishnan', title: 'HbA1c Report', type: 'Lab Report', date: D(0), size: '180 KB', uploadedBy: 'Laboratory' },
];

// -------------------------------------------------------------
// Administration: staff, departments, branches, audit trail
// -------------------------------------------------------------
export interface StaffMember {
  id: string;
  name: string;
  role: 'Doctor' | 'Nurse' | 'Lab Technician' | 'Pharmacist' | 'Administrator' | 'Receptionist';
  department: string;
  status: 'On Duty' | 'Off Duty' | 'On Leave';
  phone: string;
  access: string[];
}

export const INITIAL_STAFF: StaffMember[] = [
  { id: 'stf-1', name: 'Dr. Priya Menon', role: 'Doctor', department: 'General Medicine', status: 'On Duty', phone: '+91 98470 10001', access: ['Patients', 'Doctor Copilot', 'Prescriptions', 'Reports'] },
  { id: 'stf-2', name: 'Nurse Anjali Thomas', role: 'Nurse', department: 'Ward A & Deluxe', status: 'On Duty', phone: '+91 98470 10002', access: ['Nurse Portal', 'Vitals', 'Bed Management'] },
  { id: 'stf-3', name: 'Nurse Reshma K', role: 'Nurse', department: 'ICU', status: 'On Duty', phone: '+91 98470 10003', access: ['Nurse Portal', 'Vitals', 'ICU Charts'] },
  { id: 'stf-4', name: 'Vishnu Prasad', role: 'Lab Technician', department: 'Laboratory', status: 'On Duty', phone: '+91 98470 10004', access: ['Lab Portal', 'Sample Tracking'] },
  { id: 'stf-5', name: 'Neethu George', role: 'Pharmacist', department: 'Pharmacy', status: 'On Duty', phone: '+91 98470 10005', access: ['Pharmacy Review', 'Dispensing', 'Inventory'] },
  { id: 'stf-6', name: 'Rajiv Menon', role: 'Administrator', department: 'Administration', status: 'On Duty', phone: '+91 98470 10006', access: ['Admin Portal', 'Billing', 'Users & Roles', 'Settings'] },
  { id: 'stf-7', name: 'Fathima S', role: 'Receptionist', department: 'Front Office', status: 'On Duty', phone: '+91 98470 10007', access: ['Registration', 'Appointments', 'Billing'] },
  { id: 'stf-8', name: 'Dr. Arjun Nair', role: 'Doctor', department: 'Cardiology', status: 'On Duty', phone: '+91 98470 10008', access: ['Patients', 'Doctor Copilot', 'Prescriptions'] },
  { id: 'stf-9', name: 'Dr. Sneha Joseph', role: 'Doctor', department: 'Gynecology', status: 'On Leave', phone: '+91 98470 10009', access: ['Patients', 'Doctor Copilot', 'Prescriptions'] },
];

export interface Department {
  id: string;
  name: string;
  head: string;
  opdToday: number;
  beds: number;
  icon: string;
  color: string;
}

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: 'General Medicine', head: 'Dr. Priya Menon', opdToday: 38, beds: 60, icon: 'medkit', color: '#1E6BFF' },
  { id: 'dept-2', name: 'Cardiology', head: 'Dr. Arjun Nair', opdToday: 21, beds: 24, icon: 'heart', color: '#EF4444' },
  { id: 'dept-3', name: 'Orthopedics', head: 'Dr. Rajesh Varma', opdToday: 17, beds: 30, icon: 'body', color: '#F59E0B' },
  { id: 'dept-4', name: 'Gynecology', head: 'Dr. Sneha Joseph', opdToday: 12, beds: 28, icon: 'woman', color: '#EC4899' },
  { id: 'dept-5', name: 'Pediatrics', head: 'Dr. Deepa Mohan', opdToday: 14, beds: 26, icon: 'happy', color: '#10B981' },
  { id: 'dept-6', name: 'Dermatology', head: 'Dr. Anil Kumar', opdToday: 9, beds: 0, icon: 'color-palette', color: '#8B5CF6' },
  { id: 'dept-7', name: 'ENT', head: 'Dr. Lakshmi Iyer', opdToday: 7, beds: 6, icon: 'ear', color: '#14B8A6' },
  { id: 'dept-8', name: 'Neurology', head: 'Dr. Thomas Mathew', opdToday: 6, beds: 16, icon: 'pulse', color: '#6366F1' },
  { id: 'dept-9', name: 'Critical Care', head: 'Dr. Farhan Ali', opdToday: 0, beds: 8, icon: 'fitness', color: '#DC2626' },
];

export interface Branch {
  id: string;
  name: string;
  address: string;
  type: 'Main Hospital' | 'Satellite Hospital' | 'Clinic';
  beds: number;
  phone: string;
  status: 'Operational' | 'Opening Soon';
}

export const INITIAL_BRANCHES: Branch[] = [
  { id: 'br-hq', name: 'City Care — Kakkanad (HQ)', address: 'NH 47, Kakkanad, Kochi - 682030', type: 'Main Hospital', beds: 250, phone: '+91 484 234 5678', status: 'Operational' },
  { id: 'br-2', name: 'City Care — Edappally', address: 'NH 66, Edappally, Kochi - 682024', type: 'Satellite Hospital', beds: 80, phone: '+91 484 280 1122', status: 'Operational' },
  { id: 'br-3', name: 'City Care Clinic — Vyttila', address: 'Vyttila Hub, Kochi - 682019', type: 'Clinic', beds: 0, phone: '+91 484 230 7788', status: 'Opening Soon' },
];

export interface AuditEntry {
  id: string;
  /** Epoch ms */
  at: number;
  actor: string;
  role: string;
  action: string;
  target?: string;
}

export const INITIAL_AUDIT_LOG: AuditEntry[] = [
  { id: 'aud-1', at: minutesAgo(4), actor: 'Dr. Priya Menon', role: 'doctor', action: 'Viewed AI patient summary', target: 'Ananya S' },
  { id: 'aud-2', at: minutesAgo(11), actor: 'Vishnu Prasad', role: 'lab', action: 'Flagged critical result', target: 'Meera Krishnan • HbA1c' },
  { id: 'aud-3', at: minutesAgo(26), actor: 'Fathima S', role: 'admin', action: 'Collected payment ₹650', target: 'PH-2026-00321' },
  { id: 'aud-4', at: minutesAgo(40), actor: 'MediOS Safety Engine', role: 'system', action: 'Blocked unsafe prescription (interaction)', target: 'RX-2026-00401' },
  { id: 'aud-5', at: minutesAgo(95), actor: 'Nurse Reshma K', role: 'nurse', action: 'Recorded ICU vitals', target: 'Ramanathan G' },
];

// -------------------------------------------------------------
// Finance
// -------------------------------------------------------------
export type RevenuePeriod = 'today' | 'week' | 'month';

export interface RevenueSnapshot {
  total: number;
  growthPct: number;
  comparedTo: string;
  opd: { amount: number; count: number };
  ipd: { amount: number; count: number };
  pharmacy: { amount: number; count: number };
  diagnostics: { amount: number; count: number };
  other: { amount: number; count: number };
  chart: Array<{ label: string; value: number }>;
}

/** Revenue by period. "today" is scaled to the live collection by AppContext. */
export const REVENUE_BY_PERIOD: Record<RevenuePeriod, RevenueSnapshot> = {
  today: {
    total: 482500,
    growthPct: 15,
    comparedTo: 'vs yesterday',
    opd: { amount: 84500, count: 124 },
    ipd: { amount: 224000, count: 18 },
    pharmacy: { amount: 61000, count: 342 },
    diagnostics: { amount: 52000, count: 88 },
    other: { amount: 61000, count: 12 },
    chart: [
      { label: '8a', value: 18000 },
      { label: '10a', value: 74000 },
      { label: '12p', value: 96000 },
      { label: '2p', value: 88000 },
      { label: '4p', value: 102000 },
      { label: '6p', value: 71000 },
      { label: '8p', value: 33500 },
    ],
  },
  week: {
    total: 2910000,
    growthPct: 9,
    comparedTo: 'vs last week',
    opd: { amount: 512000, count: 742 },
    ipd: { amount: 1352000, count: 104 },
    pharmacy: { amount: 368000, count: 2011 },
    diagnostics: { amount: 314000, count: 530 },
    other: { amount: 364000, count: 71 },
    chart: [
      { label: 'Mon', value: 452000 },
      { label: 'Tue', value: 498000 },
      { label: 'Wed', value: 441000 },
      { label: 'Thu', value: 536000 },
      { label: 'Fri', value: 569000 },
      { label: 'Sat', value: 414000 },
      { label: 'Sun', value: 0 },
    ],
  },
  month: {
    total: 4825000,
    growthPct: 12,
    comparedTo: 'vs last month',
    opd: { amount: 845000, count: 1236 },
    ipd: { amount: 2240000, count: 176 },
    pharmacy: { amount: 610000, count: 3342 },
    diagnostics: { amount: 520000, count: 881 },
    other: { amount: 610000, count: 118 },
    chart: [
      { label: 'W1', value: 1080000 },
      { label: 'W2', value: 1215000 },
      { label: 'W3', value: 1320000 },
      { label: 'W4', value: 1210000 },
    ],
  },
};

// -------------------------------------------------------------
// Reports
// -------------------------------------------------------------
export interface ReportDefinition {
  id: string;
  title: string;
  subtitle: string;
  category: 'Financial' | 'Patient' | 'Operational';
  icon: string;
  color: string;
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { id: 'daily-collection', title: 'Daily Collection Report', subtitle: 'Revenue by payment mode with every receipt', category: 'Financial', icon: 'cash', color: '#10B981' },
  { id: 'opd-collection', title: 'OPD Collection Report', subtitle: 'Department-wise outpatient consultation revenue', category: 'Financial', icon: 'medkit', color: '#1E6BFF' },
  { id: 'ipd-admission', title: 'IPD Admission Report', subtitle: 'Admissions, discharges and bed revenue', category: 'Financial', icon: 'bed', color: '#8B5CF6' },
  { id: 'pharmacy-sales', title: 'Pharmacy Sales Report', subtitle: 'Medicine-wise sales, low stock and expiries', category: 'Financial', icon: 'bandage', color: '#F59E0B' },
  { id: 'lab-radiology', title: 'Lab & Radiology Report', subtitle: 'Diagnostic volume, revenue and turnaround', category: 'Financial', icon: 'flask', color: '#00B4D8' },
  { id: 'doctor-wise', title: 'Doctor Wise Report', subtitle: 'Consultations and revenue per doctor', category: 'Financial', icon: 'person', color: '#EC4899' },
  { id: 'patient-register', title: 'Patient Registry', subtitle: 'All patients by status, age and insurance', category: 'Patient', icon: 'people', color: '#1E6BFF' },
  { id: 'admissions-discharges', title: 'Admissions & Discharges', subtitle: 'Current in-patients and recent discharges', category: 'Patient', icon: 'swap-horizontal', color: '#14B8A6' },
  { id: 'follow-ups', title: 'Follow-up Due', subtitle: 'Patients with upcoming or missed follow-ups', category: 'Patient', icon: 'calendar', color: '#F97316' },
  { id: 'bed-occupancy', title: 'Bed Occupancy', subtitle: 'Ward-wise occupancy and availability', category: 'Operational', icon: 'grid', color: '#8B5CF6' },
  { id: 'lab-tat', title: 'Lab Turnaround & Pipeline', subtitle: 'Samples by status with abnormal flags', category: 'Operational', icon: 'timer', color: '#00B4D8' },
  { id: 'inventory-status', title: 'Inventory Status', subtitle: 'Supplies below reorder level', category: 'Operational', icon: 'cube', color: '#F59E0B' },
];

// -------------------------------------------------------------
// Help & support
// -------------------------------------------------------------
export const HELP_FAQS = [
  { q: 'How do I register a new patient?', a: 'Home → New Patient (or Patients tab → +). Complete the 4 steps; a UHID and ₹500 registration receipt are generated automatically.' },
  { q: 'How do I collect a pending bill?', a: 'Billing tab → open the invoice marked Pending → Collect Payment, then choose the payment mode. The receipt updates instantly.' },
  { q: 'Where do AI suggestions come from?', a: 'MediOS AI answers only from hospital records in CareSync and the approved SOP library, and cites its sources under every answer. A clinician must approve anything it drafts.' },
  { q: 'How do nurses record vitals?', a: 'Nurse Portal → Log Vitals. Saved vitals appear immediately in the patient record and the Doctor Copilot.' },
  { q: 'Can I share a receipt on WhatsApp?', a: 'Open any receipt → Share. The PDF is generated on the device and handed to the share sheet (WhatsApp, Email, Drive…).' },
];
