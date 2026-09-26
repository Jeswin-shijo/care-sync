import { NavigatorScreenParams } from '@react-navigation/native';
import { Invoice } from '../data/mockData';
import { ReceiptPrintData } from '../utils/pdfGenerator';

export type MainTabParamList = {
  Home: undefined;
  Patients: undefined;
  Billing: undefined;
  AiAssistant: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Appointments: undefined;
  BookAppointment: { doctorId?: string; specialty?: string } | undefined;
  PatientDetails: { patientId: string };
  RegisterPatient: undefined;
  OpdConsultation: { patientId?: string } | undefined;
  IpdAdmission: { patientId?: string } | undefined;
  Pharmacy: undefined;
  LabPathology: undefined;
  Radiology: undefined;
  Billing: undefined;
  ReceiptDetail: { invoiceId?: string; receiptData?: ReceiptPrintData } | undefined;
  ReceiptTemplates: undefined;
  DischargeSummary: { patientId?: string } | undefined;
  AiAssistant: undefined;
  FinancialManagement: undefined;
  Reports: undefined;
  Notifications: undefined;
  Settings: undefined;
  MoreFeatures: undefined;
  DoctorCopilot: undefined;
  NursePortal: undefined;
  LabPortal: undefined;
  PharmacyReview: undefined;
  PatientPortal: undefined;
};

