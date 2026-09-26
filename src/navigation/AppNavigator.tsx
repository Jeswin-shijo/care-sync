import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { SplashScreen } from '../screens/SplashScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { BookAppointmentScreen } from '../screens/BookAppointmentScreen';
import { PatientDetailsScreen } from '../screens/PatientDetailsScreen';
import { RegisterPatientScreen } from '../screens/RegisterPatientScreen';
import { OpdConsultationScreen } from '../screens/OpdConsultationScreen';
import { IpdAdmissionScreen } from '../screens/IpdAdmissionScreen';
import { PharmacyScreen } from '../screens/PharmacyScreen';
import { LabPathologyScreen } from '../screens/LabPathologyScreen';
import { RadiologyScreen } from '../screens/RadiologyScreen';
import { BillingScreen } from '../screens/BillingScreen';
import { ReceiptDetailScreen } from '../screens/ReceiptDetailScreen';
import { ReceiptTemplatesScreen } from '../screens/ReceiptTemplatesScreen';
import { DischargeSummaryScreen } from '../screens/DischargeSummaryScreen';
import { AiAssistantScreen } from '../screens/AiAssistantScreen';
import { FinancialManagementScreen } from '../screens/FinancialManagementScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MoreFeaturesScreen } from '../screens/MoreFeaturesScreen';
import { DoctorCopilotScreen } from '../screens/DoctorCopilotScreen';
import { NursePortalScreen } from '../screens/NursePortalScreen';
import { LabPortalScreen } from '../screens/LabPortalScreen';
import { PharmacyReviewScreen } from '../screens/PharmacyReviewScreen';
import { PatientPortalScreen } from '../screens/PatientPortalScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="Appointments" component={AppointmentsScreen} />
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
      <Stack.Screen name="PatientDetails" component={PatientDetailsScreen} />
      <Stack.Screen name="RegisterPatient" component={RegisterPatientScreen} />
      <Stack.Screen name="OpdConsultation" component={OpdConsultationScreen} />
      <Stack.Screen name="IpdAdmission" component={IpdAdmissionScreen} />
      <Stack.Screen name="Pharmacy" component={PharmacyScreen} />
      <Stack.Screen name="LabPathology" component={LabPathologyScreen} />
      <Stack.Screen name="Radiology" component={RadiologyScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
      <Stack.Screen name="ReceiptTemplates" component={ReceiptTemplatesScreen} />
      <Stack.Screen name="DischargeSummary" component={DischargeSummaryScreen} />
      <Stack.Screen name="AiAssistant" component={AiAssistantScreen} />
      <Stack.Screen name="FinancialManagement" component={FinancialManagementScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="MoreFeatures" component={MoreFeaturesScreen} />
      <Stack.Screen name="DoctorCopilot" component={DoctorCopilotScreen} />
      <Stack.Screen name="NursePortal" component={NursePortalScreen} />
      <Stack.Screen name="LabPortal" component={LabPortalScreen} />
      <Stack.Screen name="PharmacyReview" component={PharmacyReviewScreen} />
      <Stack.Screen name="PatientPortal" component={PatientPortalScreen} />
    </Stack.Navigator>
  );
};

