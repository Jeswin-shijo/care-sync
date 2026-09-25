import React from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from './src/context/AppContext';
import { AlertProvider } from './src/context/AlertContext';
import { AppNavigator } from './src/navigation/AppNavigator';

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
]);

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AlertProvider>
        <AppProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <AppNavigator />
          </NavigationContainer>
        </AppProvider>
      </AlertProvider>
    </SafeAreaProvider>
  );
}
