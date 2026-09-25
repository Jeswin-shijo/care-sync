import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="appointments" options={{ headerShown: false }} />
        <Stack.Screen name="book-appointment" options={{ headerShown: false }} />
        <Stack.Screen name="patient/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="register-patient" options={{ headerShown: false }} />
        <Stack.Screen name="opd-consultation" options={{ headerShown: false }} />
        <Stack.Screen name="ipd-admission" options={{ headerShown: false }} />
        <Stack.Screen name="pharmacy" options={{ headerShown: false }} />
        <Stack.Screen name="lab" options={{ headerShown: false }} />
        <Stack.Screen name="radiology" options={{ headerShown: false }} />
        <Stack.Screen name="receipt/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="receipt-templates" options={{ headerShown: false }} />
        <Stack.Screen name="discharge-summary" options={{ headerShown: false }} />
        <Stack.Screen name="financial-management" options={{ headerShown: false }} />
        <Stack.Screen name="reports" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </AppProvider>
  );
}
