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
  date: string;
  status: 'Confirmed' | 'Waiting' | 'Not Arrived' | 'Completed';
  tokenNo: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  title: string;
  type: 'REG' | 'OPD' | 'IPD' | 'Pharmacy' | 'Lab' | 'Radiology';
  patientId: string;
  patientName: string;
  uhid: string;
  date: string;
  time: string;
  amount: number;
  paymentMode: 'UPI' | 'Cash' | 'Card' | 'Net Banking';
  status: 'Paid' | 'Pending';
  doctorName?: string;
  items?: Array<{ description: string; qty?: number; rate?: number; amount: number }>;
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  dosageForm: string;
  stock: number;
  price: number;
  expiry: string;
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
}

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    uhid: 'CC202500125',
    name: 'Ananya S',
    age: 32,
    gender: 'Female',
    phone: '+91 98765 43210',
    dob: '14 Apr 1993',
    address: '12, Green Park, Kochi, Kerala',
    bloodGroup: 'B+',
    insurance: 'Star Health (Active)',
    status: 'Active',
    registeredDate: '2025-01-10',
  },
  {
    id: 'pat-2',
    uhid: 'CC202500126',
    name: 'Rahul Nair',
    age: 45,
    gender: 'Male',
    phone: '+91 98451 23456',
    dob: '08 Jun 1980',
    address: '45, Marine Drive, Kochi, Kerala',
    bloodGroup: 'O+',
    insurance: 'HDFC ERGO (Active)',
    status: 'Active',
    registeredDate: '2025-02-14',
  },
  {
    id: 'pat-3',
    uhid: 'CC202500127',
    name: 'Sneha Joseph',
    age: 28,
    gender: 'Female',
    phone: '+91 97455 67890',
    dob: '22 Nov 1996',
    address: '88, Panampilly Nagar, Kochi, Kerala',
    bloodGroup: 'A+',
    insurance: 'Care Health (Active)',
    status: 'Active',
    registeredDate: '2025-03-01',
  },
  {
    id: 'pat-4',
    uhid: 'CC202500128',
    name: 'Vikram K',
    age: 52,
    gender: 'Male',
    phone: '+91 94471 12233',
    dob: '17 Mar 1973',
    address: '19, Fort Kochi, Kerala',
    bloodGroup: 'AB+',
    insurance: 'Max Bupa (Active)',
    status: 'Admitted',
    room: 'Room 101',
    registeredDate: '2025-03-15',
  },
  {
    id: 'pat-5',
    uhid: 'CC202500129',
    name: 'Meera Krishnan',
    age: 42,
    gender: 'Female',
    phone: '+91 98950 33445',
    dob: '05 Jan 1983',
    address: '7A, Skyline Apts, Kakkanad, Kochi',
    bloodGroup: 'B-',
    insurance: 'New India Assurance (Active)',
    status: 'Active',
    registeredDate: '2025-04-18',
  },
];

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
    availableDays: ['Mon', 'Wed', 'Fri'],
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
    availableDays: ['Mon', 'Tue', 'Thu', 'Fri'],
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
  },
];

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
    date: '2025-09-22',
    status: 'Confirmed',
    tokenNo: 1,
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
    date: '2025-09-22',
    status: 'Confirmed',
    tokenNo: 2,
  },
  {
    id: 'apt-3',
    patientId: 'pat-3',
    patientName: 'Sneha Joseph',
    doctorId: 'doc-1',
    doctorName: 'Dr. Priya Menon',
    department: 'Dermatology',
    type: 'OPD',
    time: '11:30 AM',
    date: '2025-09-22',
    status: 'Waiting',
    tokenNo: 3,
  },
  {
    id: 'apt-4',
    patientId: 'pat-4',
    patientName: 'Vikram K',
    doctorId: 'doc-4',
    doctorName: 'Dr. Rajesh Varma',
    department: 'Orthopedics',
    type: 'OPD',
    time: '01:00 PM',
    date: '2025-09-22',
    status: 'Not Arrived',
    tokenNo: 4,
  },
  {
    id: 'apt-5',
    patientId: 'pat-5',
    patientName: 'Meera Krishnan',
    doctorId: 'doc-5',
    doctorName: 'Dr. Deepa Mohan',
    department: 'Pediatrics',
    type: 'OPD',
    time: '02:30 PM',
    date: '2025-09-22',
    status: 'Confirmed',
    tokenNo: 5,
  },
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNo: 'REG-2026-00125',
    title: 'Registration Fee',
    type: 'REG',
    patientId: 'pat-1',
    patientName: 'Ananya S',
    uhid: 'CC202500125',
    date: '22 Sep 2025',
    time: '10:05 AM',
    amount: 500,
    paymentMode: 'UPI',
    status: 'Paid',
    items: [{ description: 'New Patient Registration & Smart UHID Card', qty: 1, amount: 500 }],
  },
  {
    id: 'inv-2',
    invoiceNo: 'OPD-2026-00891',
    title: 'OPD Consultation Fee',
    type: 'OPD',
    patientId: 'pat-2',
    patientName: 'Rahul Nair',
    uhid: 'CC202500126',
    date: '22 Sep 2025',
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
    date: '22 Sep 2025',
    time: '09:10 AM',
    amount: 650,
    paymentMode: 'UPI',
    status: 'Paid',
    items: [
      { description: 'Amoxicillin 500mg (10 Tab)', qty: 1, rate: 45, amount: 45 },
      { description: 'Pantoprazole 40mg (10 Tab)', qty: 1, rate: 35, amount: 35 },
      { description: 'Vitamin D3 Sachet (4 pcs)', qty: 4, rate: 60, amount: 240 },
      { description: 'Antihistamine Syrup 100ml', qty: 1, rate: 330, amount: 330 },
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
    date: '22 Sep 2025',
    time: '08:50 AM',
    amount: 1800,
    paymentMode: 'Card',
    status: 'Paid',
    items: [
      { description: 'Complete Blood Count (CBC)', qty: 1, amount: 300 },
      { description: 'Liver Function Test (LFT)', qty: 1, amount: 600 },
      { description: 'Kidney Function Test (KFT)', qty: 1, amount: 700 },
      { description: 'Urine Routine Examination', qty: 1, amount: 200 },
    ],
  },
  {
    id: 'inv-5',
    invoiceNo: 'IPD-2026-00018',
    title: 'Room Charges (IPD)',
    type: 'IPD',
    patientId: 'pat-4',
    patientName: 'Vikram K',
    uhid: 'CC202500128',
    date: '22 Sep 2025',
    time: '08:30 AM',
    amount: 4500,
    paymentMode: 'Net Banking',
    status: 'Pending',
    items: [
      { description: 'Deluxe Room Charge (Day 1)', qty: 1, rate: 3500, amount: 3500 },
      { description: 'Nursing Care & Monitoring', qty: 1, rate: 1000, amount: 1000 },
    ],
  },
];

export const INITIAL_MEDICINES: Medicine[] = [
  { id: 'med-1', name: 'Paracetamol 500mg', category: 'Analgesic', dosageForm: 'Tab', stock: 120, price: 12.0, expiry: '12/26' },
  { id: 'med-2', name: 'Amoxicillin 500mg', category: 'Antibiotic', dosageForm: 'Cap', stock: 48, price: 45.0, expiry: '08/26' },
  { id: 'med-3', name: 'Pantoprazole 40mg', category: 'Antacid', dosageForm: 'Tab', stock: 65, price: 35.0, expiry: '05/27' },
  { id: 'med-4', name: 'Metformin 500mg', category: 'Antidiabetic', dosageForm: 'Tab', stock: 92, price: 18.0, expiry: '10/26' },
  { id: 'med-5', name: 'Vitamin D3', category: 'Supplement', dosageForm: 'Sachet', stock: 34, price: 60.0, expiry: '04/27' },
  { id: 'med-6', name: 'Azithromycin 500mg', category: 'Antibiotic', dosageForm: 'Tab', stock: 25, price: 110.0, expiry: '09/26' },
  { id: 'med-7', name: 'Cetirizine 10mg', category: 'Antihistamine', dosageForm: 'Tab', stock: 150, price: 8.0, expiry: '01/28' },
  { id: 'med-8', name: 'Atorvastatin 10mg', category: 'Cardiovascular', dosageForm: 'Tab', stock: 80, price: 75.0, expiry: '11/26' },
];

export const INITIAL_LAB_TESTS: LabTest[] = [
  { id: 'lab-1', name: 'Complete Blood Count (CBC)', category: 'Hematology', turnaroundTime: '1-2 hrs', price: 300 },
  { id: 'lab-2', name: 'LFT (Liver Function Test)', category: 'Biochemistry', turnaroundTime: '2-4 hrs', price: 600 },
  { id: 'lab-3', name: 'KFT (Kidney Function Test)', category: 'Biochemistry', turnaroundTime: '2-4 hrs', price: 700 },
  { id: 'lab-4', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Biochemistry', turnaroundTime: '4-6 hrs', price: 1200 },
  { id: 'lab-5', name: 'HbA1c Glycated Hemoglobin', category: 'Biochemistry', turnaroundTime: '2-3 hrs', price: 600 },
  { id: 'lab-6', name: 'Lipid Profile', category: 'Biochemistry', turnaroundTime: '3-4 hrs', price: 800 },
  { id: 'lab-7', name: 'Urine Routine & Microscopy', category: 'Pathology', turnaroundTime: '1-2 hrs', price: 250 },
];

export const INITIAL_RADIOLOGY_SCANS: RadiologyScan[] = [
  { id: 'rad-1', name: 'X-Ray (Chest PA)', category: 'X-Ray', duration: '30 min', price: 500 },
  { id: 'rad-2', name: 'Ultrasound (Whole Abdomen)', category: 'Ultrasound', duration: '1 hr', price: 1000 },
  { id: 'rad-3', name: 'CT Scan (Head Brain Plain)', category: 'CT Scan', duration: '2 hrs', price: 3500 },
  { id: 'rad-4', name: 'MRI (Brain with Contrast)', category: 'MRI', duration: '3 hrs', price: 7000 },
  { id: 'rad-5', name: 'Digital Mammography', category: 'Mammography', duration: '1 hr', price: 2500 },
  { id: 'rad-6', name: 'MRI (Spine Lumbar)', category: 'MRI', duration: '3 hrs', price: 8500 },
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'New appointment booked',
    description: 'Ananya S • 10:00 AM General Medicine',
    category: 'Appointments',
    timestamp: '2m ago',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Payment received',
    description: '₹1,200 • OPD-2026-00891 via UPI',
    category: 'Billing',
    timestamp: '15m ago',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Lab report ready',
    description: 'CBC & LFT • Ananya S available for review',
    category: 'System',
    timestamp: '1h ago',
    read: true,
  },
  {
    id: 'notif-4',
    title: 'Patient admitted',
    description: 'Vikram K admitted to Room 101 (Deluxe)',
    category: 'Appointments',
    timestamp: '2h ago',
    read: true,
  },
  {
    id: 'notif-5',
    title: 'Follow-up reminder',
    description: 'Follow up visit scheduled for Rahul Nair tomorrow',
    category: 'System',
    timestamp: '3h ago',
    read: true,
  },
];

export const RECEIPT_TEMPLATES = [
  { id: 'tpl-1', title: 'Registration Receipt', subtitle: 'Patient registration & UHID issuance', icon: 'card-outline', color: '#1E6BFF' },
  { id: 'tpl-2', title: 'OPD Consultation Receipt', subtitle: 'Doctor consultation & OPD services', icon: 'medkit-outline', color: '#10B981' },
  { id: 'tpl-3', title: 'IPD Admission Receipt', subtitle: 'Hospital admission & room advance', icon: 'bed-outline', color: '#8B5CF6' },
  { id: 'tpl-4', title: 'Pharmacy Bill', subtitle: 'Medicine dispense & pharmacy charges', icon: 'fitness-outline', color: '#F59E0B' },
  { id: 'tpl-5', title: 'Lab Bill', subtitle: 'Laboratory pathology test charges', icon: 'flask-outline', color: '#00B4D8' },
  { id: 'tpl-6', title: 'Radiology Bill', subtitle: 'X-ray, CT, MRI, and Ultrasound scans', icon: 'scan-outline', color: '#6366F1' },
  { id: 'tpl-7', title: 'Surgery / Procedure Bill', subtitle: 'Operation & specialized procedure charges', icon: 'cut-outline', color: '#EC4899' },
  { id: 'tpl-8', title: 'Discharge Summary', subtitle: 'Clinical treatment summary & final invoice', icon: 'document-text-outline', color: '#14B8A6' },
  { id: 'tpl-9', title: 'Insurance Claim Document', subtitle: 'Pre-authorization & TPA insurance claims', icon: 'shield-checkmark-outline', color: '#F97316' },
];

export const DISCHARGE_SUMMARY_SAMPLE = {
  patientName: 'Ananya S',
  uhid: 'CC202500125',
  admissionDate: '17 Sep 2025',
  dischargeDate: '22 Sep 2025',
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
    'Follow up review in OPD after 1 week (29 Sep 2025)',
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
};
