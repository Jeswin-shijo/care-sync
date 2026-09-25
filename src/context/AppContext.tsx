import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Patient,
  Doctor,
  Appointment,
  Invoice,
  Medicine,
  LabTest,
  RadiologyScan,
  AppNotification,
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_APPOINTMENTS,
  INITIAL_INVOICES,
  INITIAL_MEDICINES,
  INITIAL_LAB_TESTS,
  INITIAL_RADIOLOGY_SCANS,
  INITIAL_NOTIFICATIONS,
} from '../data/mockData';
import { generateUHID, generateReceiptNo } from '../utils/formatters';

export interface CartItem {
  id: string;
  type: 'medicine' | 'lab' | 'radiology' | 'consultation';
  name: string;
  price: number;
  qty: number;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionCard?: {
    type: 'appointment' | 'invoice' | 'patient' | 'report';
    title: string;
    description: string;
    actionLabel?: string;
    route?: string;
    params?: any;
  };
}

interface AppContextType {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  invoices: Invoice[];
  medicines: Medicine[];
  labTests: LabTest[];
  radiologyScans: RadiologyScan[];
  notifications: AppNotification[];
  selectedPatient: Patient | null;
  cart: CartItem[];
  aiChatMessages: AiChatMessage[];
  todayStats: {
    totalPatients: number;
    opdToday: number;
    ipdOccupancy: number;
    surgeriesToday: number;
    todayCollection: number;
  };

  // Actions
  setSelectedPatient: (patient: Patient | null) => void;
  addPatient: (patientData: Omit<Patient, 'id' | 'uhid' | 'registeredDate'>) => Patient;
  bookAppointment: (data: {
    patientId: string;
    doctorId: string;
    department: string;
    type: 'OPD' | 'IPD' | 'Follow Up';
    date: string;
    time: string;
  }) => Appointment;
  updateAppointmentStatus: (appointmentId: string, status: Appointment['status']) => void;
  createInvoice: (invoiceData: {
    type: Invoice['type'];
    patientId: string;
    amount: number;
    paymentMode: Invoice['paymentMode'];
    title: string;
    items: Array<{ description: string; qty?: number; rate?: number; amount: number }>;
    doctorName?: string;
  }) => Invoice;
  admitPatientToIPD: (patientId: string, roomType: string, department: string, notes?: string) => void;
  dischargePatient: (patientId: string) => void;
  addToCart: (item: { id: string; type: CartItem['type']; name: string; price: number }) => void;
  removeFromCart: (itemId: string, removeAll?: boolean) => void;
  decrementCartItem: (itemId: string) => void;
  clearCart: (restoreStock?: boolean) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  sendAiMessage: (messageText: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [medicines, setMedicines] = useState<Medicine[]>(INITIAL_MEDICINES);
  const [labTests] = useState<LabTest[]>(INITIAL_LAB_TESTS);
  const [radiologyScans] = useState<RadiologyScan[]>(INITIAL_RADIOLOGY_SCANS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(INITIAL_PATIENTS[0]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [aiChatMessages, setAiChatMessages] = useState<AiChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'Hello Dr. Priya! I am your CareSync AI Hospital Assistant. How can I assist you today?',
      timestamp: 'Just now',
    },
  ]);

  // Derived metrics
  const todayCollection = invoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.amount, 477450); // Base historical + dynamic
  const totalPatients = patients.length + 1243;
  const opdToday = appointments.filter((a) => a.type === 'OPD').length + 119;
  const admittedCount = patients.filter((p) => p.status === 'Admitted').length + 17;
  const ipdOccupancy = Math.min(Math.round((admittedCount / 30) * 100), 100);

  const addPatient = (patientData: Omit<Patient, 'id' | 'uhid' | 'registeredDate'>): Patient => {
    const newPatient: Patient = {
      ...patientData,
      id: `pat-${Date.now()}`,
      uhid: generateUHID(),
      registeredDate: new Date().toISOString().split('T')[0],
      status: 'Active',
    };
    setPatients((prev) => [newPatient, ...prev]);

    // Add registration invoice
    createInvoice({
      type: 'REG',
      patientId: newPatient.id,
      amount: 500,
      paymentMode: 'UPI',
      title: 'Registration Fee',
      items: [{ description: 'New Patient Registration & Smart UHID Card', qty: 1, amount: 500 }],
    });

    // Add notification
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'New patient registered',
      description: `${newPatient.name} registered with UHID ${newPatient.uhid}`,
      category: 'System',
      timestamp: 'Just now',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return newPatient;
  };

  const bookAppointment = (data: {
    patientId: string;
    doctorId: string;
    department: string;
    type: 'OPD' | 'IPD' | 'Follow Up';
    date: string;
    time: string;
  }): Appointment => {
    const patient = patients.find((p) => p.id === data.patientId) || patients[0];
    const doctor = doctors.find((d) => d.id === data.doctorId) || doctors[0];

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      patientId: data.patientId,
      patientName: patient.name,
      doctorId: data.doctorId,
      doctorName: doctor.name,
      department: data.department || doctor.department,
      type: data.type,
      date: data.date,
      time: data.time,
      status: 'Confirmed',
      tokenNo: appointments.length + 1,
    };

    setAppointments((prev) => [newAppointment, ...prev]);

    // Create consultation invoice
    createInvoice({
      type: 'OPD',
      patientId: patient.id,
      amount: doctor.fee,
      paymentMode: 'UPI',
      title: 'OPD Consultation Fee',
      doctorName: `${doctor.name} (${doctor.department})`,
      items: [{ description: `Specialist Consultation - ${doctor.name}`, qty: 1, rate: doctor.fee, amount: doctor.fee }],
    });

    // Add notification
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'New appointment booked',
      description: `${patient.name} with ${doctor.name} at ${data.time}`,
      category: 'Appointments',
      timestamp: 'Just now',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return newAppointment;
  };

  const updateAppointmentStatus = (appointmentId: string, status: Appointment['status']) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === appointmentId ? { ...apt, status } : apt))
    );
  };

  const createInvoice = (invoiceData: {
    type: Invoice['type'];
    patientId: string;
    amount: number;
    paymentMode: Invoice['paymentMode'];
    title: string;
    items: Array<{ description: string; qty?: number; rate?: number; amount: number }>;
    doctorName?: string;
  }): Invoice => {
    const patient = patients.find((p) => p.id === invoiceData.patientId) || patients[0];
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateFormatted = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNo: generateReceiptNo(invoiceData.type),
      title: invoiceData.title,
      type: invoiceData.type,
      patientId: invoiceData.patientId,
      patientName: patient?.name || 'Walk-in Patient',
      uhid: patient?.uhid || generateUHID(),
      date: dateFormatted,
      time: timeFormatted,
      amount: invoiceData.amount,
      paymentMode: invoiceData.paymentMode,
      status: 'Paid',
      doctorName: invoiceData.doctorName,
      items: invoiceData.items,
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    return newInvoice;
  };

  const admitPatientToIPD = (patientId: string, roomType: string, department: string, notes?: string) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId ? { ...p, status: 'Admitted', room: `${roomType} Room` } : p
      )
    );

    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      createInvoice({
        type: 'IPD',
        patientId,
        amount: roomType.includes('ICU') ? 7500 : 3500,
        paymentMode: 'Card',
        title: 'IPD Admission Advance & Room Charge',
        items: [
          { description: `${roomType} Room Admission Charge`, qty: 1, amount: roomType.includes('ICU') ? 5000 : 2500 },
          { description: 'Nursing & Sanitization Fee', qty: 1, amount: 1000 },
        ],
      });

      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: 'Patient admitted',
        description: `${patient.name} admitted to ${roomType} (${department})`,
        category: 'Appointments',
        timestamp: 'Just now',
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  const dischargePatient = (patientId: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, status: 'Discharged' } : p))
    );
  };

  const addToCart = (item: { id: string; type: CartItem['type']; name: string; price: number }) => {
    if (item.type === 'medicine') {
      const med = medicines.find((m) => m.id === item.id);
      if (med && med.stock <= 0) {
        return;
      }
    }

    setCart((prev) => {
      const existing = prev.find((ci) => ci.id === item.id);
      if (existing) {
        return prev.map((ci) => (ci.id === item.id ? { ...ci, qty: ci.qty + 1 } : ci));
      }
      return [...prev, { ...item, qty: 1 }];
    });

    if (item.type === 'medicine') {
      setMedicines((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, stock: Math.max(0, m.stock - 1) } : m))
      );
    }
  };

  const decrementCartItem = (itemId: string) => {
    const item = cart.find((ci) => ci.id === itemId);
    if (!item) return;

    if (item.type === 'medicine') {
      setMedicines((prev) =>
        prev.map((m) => (m.id === itemId ? { ...m, stock: m.stock + 1 } : m))
      );
    }

    if (item.qty > 1) {
      setCart((prev) =>
        prev.map((ci) => (ci.id === itemId ? { ...ci, qty: ci.qty - 1 } : ci))
      );
    } else {
      setCart((prev) => prev.filter((ci) => ci.id !== itemId));
    }
  };

  const removeFromCart = (itemId: string, removeAll: boolean = false) => {
    const item = cart.find((ci) => ci.id === itemId);
    if (!item) return;

    if (!removeAll && item.qty > 1) {
      decrementCartItem(itemId);
      return;
    }

    if (item.type === 'medicine') {
      setMedicines((prev) =>
        prev.map((m) => (m.id === itemId ? { ...m, stock: m.stock + item.qty } : m))
      );
    }
    setCart((prev) => prev.filter((ci) => ci.id !== itemId));
  };

  const clearCart = (restoreStock: boolean = false) => {
    if (restoreStock) {
      cart.forEach((item) => {
        if (item.type === 'medicine') {
          setMedicines((prev) =>
            prev.map((m) => (m.id === item.id ? { ...m, stock: m.stock + item.qty } : m))
          );
        }
      });
    }
    setCart([]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const sendAiMessage = (messageText: string) => {
    const userMsg: AiChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: 'Just now',
    };

    setAiChatMessages((prev) => [...prev, userMsg]);

    // Process AI simulation response
    setTimeout(() => {
      const lower = messageText.toLowerCase();
      let replyText = '';
      let actionCard: AiChatMessage['actionCard'] = undefined;

      if (lower.includes('pending bills') || lower.includes('10,000')) {
        replyText =
          'Found 3 patients with pending bills totaling ₹28,500:\n\n• Vikram K (UHID: CC202500128) - Room Charges: ₹4,500\n• Sunita Patel (UHID: CC202500084) - Surgery Balance: ₹14,000\n• George Thomas (UHID: CC202500099) - ICU Day 2: ₹10,000';
        actionCard = {
          type: 'invoice',
          title: 'Pending Invoices Review',
          description: '3 high-value invoices require clearance before discharge.',
          actionLabel: 'View Billing',
          route: 'Billing',
        };
      } else if (lower.includes('opd collection') || lower.includes('report') || lower.includes('collection')) {
        replyText =
          `Today's OPD Collection summary as of now:\n\n• Total OPD Invoices: ${appointments.length + 119}\n• Direct Consultations: ₹8,45,000\n• Pharmacy Collections: ₹6,10,000\n• Total Revenue Today: ₹4,82,500 (+15% vs yesterday)\n\nCash: 35% | UPI: 52% | Cards: 13%`;
        actionCard = {
          type: 'report',
          title: 'Financial Daily Breakdown',
          description: 'All collections verified with bank ledger reconciliation.',
          actionLabel: 'Financial Summary',
          route: 'FinancialManagement',
        };
      } else if (lower.includes('bed') || lower.includes('icu') || lower.includes('availability')) {
        replyText =
          'Current Bed Status:\n\n• ICU: 2 beds available out of 8 (75% occupancy)\n• General Ward: 12 beds available out of 30\n• Private Deluxe: 4 rooms available\n\nTotal Hospital Occupancy is at 78%.';
      } else if (lower.includes('discharge') || lower.includes('ananya')) {
        replyText =
          'Discharge summary prepared for Ananya S (UHID: CC202500125):\n\n• Primary Diagnosis: Acute Viral Fever\n• Stay Duration: 5 days (Room 101)\n• Discharge Status: Medically Stable, Cleared by Dr. Priya Menon.\n• Follow-up: 1 week';
        actionCard = {
          type: 'patient',
          title: 'Discharge Summary - Ananya S',
          description: 'Clinical notes and digital prescription ready for PDF export.',
          actionLabel: 'Open Summary',
          route: 'DischargeSummary',
        };
      } else if (lower.includes('receipt') || lower.includes('rahul')) {
        replyText =
          'Found receipt for Rahul Nair:\n\n• Receipt No: OPD-2026-00891\n• Amount: ₹1,200 (Paid via Cash)\n• Service: Specialist Consultation (Cardiology)\n• Date: 22 Sep 2025 09:45 AM';
        actionCard = {
          type: 'invoice',
          title: 'Receipt #OPD-2026-00891',
          description: 'Payment verified and stamped by Dr. Priya Menon.',
          actionLabel: 'View Receipt',
          route: 'ReceiptDetail',
          params: { invoiceId: 'inv-2' },
        };
      } else if (lower.includes('appointment')) {
        replyText =
          `You have ${appointments.length} appointments scheduled today. Next up:\n• Ananya S at 09:00 AM (General Medicine)\n• Rahul Nair at 10:00 AM (Cardiology)\n• Sneha Joseph at 11:30 AM (Dermatology)`;
        actionCard = {
          type: 'appointment',
          title: "Today's Schedule",
          description: `${appointments.length} patients lined up for consultation.`,
          actionLabel: 'View Schedule',
          route: 'Appointments',
        };
      } else {
        replyText =
          `I processed your query: "${messageText}". All hospital modules (OPD, IPD, Billing, Pharmacy, and Diagnostics) are synced. Let me know if you would like me to pull up specific patient records, generate financial invoices, or check room availability.`;
      }

      const assistantMsg: AiChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: replyText,
        timestamp: 'Just now',
        actionCard,
      };

      setAiChatMessages((prev) => [...prev, assistantMsg]);
    }, 600);
  };

  return (
    <AppContext.Provider
      value={{
        patients,
        doctors,
        appointments,
        invoices,
        medicines,
        labTests,
        radiologyScans,
        notifications,
        selectedPatient,
        cart,
        aiChatMessages,
        todayStats: {
          totalPatients,
          opdToday,
          ipdOccupancy,
          surgeriesToday: 12,
          todayCollection,
        },
        setSelectedPatient,
        addPatient,
        bookAppointment,
        updateAppointmentStatus,
        createInvoice,
        admitPatientToIPD,
        dischargePatient,
        addToCart,
        decrementCartItem,
        removeFromCart,
        clearCart,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        sendAiMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
