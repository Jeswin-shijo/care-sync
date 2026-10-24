import React from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppProvider } from '../context/AppContext';
import { AlertProvider } from '../context/AlertContext';
import { ToastProvider } from '../context/ToastContext';
import { SessionProvider, useSession } from '../context/SessionContext';
import { colors } from '../constants/theme';

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
]);

/**
 * Every screen behind sign-in (an account, or the offline demo). Expo Router lets
 * any route not listed here through, so a new route must be added to this list.
 */
const APP_ROUTES = [
  '(tabs)',
  'admin-portal',
  'ambulance',
  'appointments',
  'bed-management',
  'blood-bank',
  'book-appointment',
  'create-invoice',
  'discharge-summary',
  'doctor-copilot',
  'documents',
  'financial-management',
  'help-support',
  'hospital-navigation',
  'inventory',
  'ipd-admission',
  'lab',
  'lab-portal',
  'notifications',
  'nurse-portal',
  'opd-consultation',
  'patient-assistant',
  'patient-portal',
  'patient-reports',
  'patient/[id]',
  'pharmacy',
  'pharmacy-review',
  'queue',
  'radiology',
  'receipt-templates',
  'receipt/[id]',
  'register-patient',
  'report/[id]',
  'reports',
  'settings',
  'settings/[section]',
  'template/[id]',
];

function RootStack() {
  const { status } = useSession();
  const inside = status === 'live' || status === 'demo';
  return (
    // Every route uses its own <Header />, so the native header is off app-wide.
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* The welcome screen is the anchor: losing a session returns here. */}
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Protected guard={!inside}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={inside}>
        {APP_ROUTES.map((name) => (
          <Stack.Screen key={name} name={name} options={name === '(tabs)' ? { animation: 'fade' } : undefined} />
        ))}
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AlertProvider>
        <ToastProvider>
          <SessionProvider>
            <AppProvider>
              <StatusBar style="dark" />
              <RootStack />
            </AppProvider>
          </SessionProvider>
        </ToastProvider>
      </AlertProvider>
    </SafeAreaProvider>
  );
}
