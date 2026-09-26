import React from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppProvider } from '../context/AppContext';
import { AlertProvider } from '../context/AlertContext';
import { ToastProvider } from '../context/ToastContext';
import { colors } from '../constants/theme';

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
]);

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AlertProvider>
        <ToastProvider>
          <AppProvider>
            <StatusBar style="dark" />
            {/* Every route uses its own <Header />, so the native header is off app-wide. */}
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            </Stack>
          </AppProvider>
        </ToastProvider>
      </AlertProvider>
    </SafeAreaProvider>
  );
}
