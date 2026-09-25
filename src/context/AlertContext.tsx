import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert as RNAlert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomAlert, AlertType, AlertButton } from '../components/common/CustomAlert';

export interface ShowAlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  icon?: keyof typeof Ionicons.glyphMap;
  buttons?: AlertButton[];
  dismissible?: boolean;
}

interface AlertContextType {
  showAlert: (options: ShowAlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

// Reference to allow global Alert.alert delegation
let globalShowAlert: ((options: ShowAlertOptions) => void) | null = null;

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: AlertType;
    icon?: keyof typeof Ionicons.glyphMap;
    buttons?: AlertButton[];
    dismissible?: boolean;
  }>({
    visible: false,
    title: '',
  });

  const showAlert = (options: ShowAlertOptions) => {
    setAlertState({
      visible: true,
      title: options.title,
      message: options.message,
      type: options.type,
      icon: options.icon,
      buttons: options.buttons,
      dismissible: options.dismissible !== undefined ? options.dismissible : true,
    });
  };

  const hideAlert = () => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    globalShowAlert = showAlert;

    // Intercept standard React Native Alert.alert to render our attractive popup globally!
    const originalAlert = RNAlert.alert;

    (RNAlert as any).alert = (
      title: string,
      message?: string,
      buttons?: Array<{ text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>,
      options?: { cancelable?: boolean }
    ) => {
      if (globalShowAlert) {
        const mappedButtons: AlertButton[] | undefined = buttons?.map((b) => ({
          text: b.text || 'OK',
          onPress: b.onPress,
          style: b.style === 'cancel' ? 'cancel' : b.style === 'destructive' ? 'destructive' : 'primary',
        }));

        globalShowAlert({
          title,
          message,
          buttons: mappedButtons,
          dismissible: options?.cancelable ?? true,
        });
      } else {
        originalAlert(title, message, buttons as any, options);
      }
    };

    return () => {
      RNAlert.alert = originalAlert;
      globalShowAlert = null;
    };
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        icon={alertState.icon}
        buttons={alertState.buttons}
        dismissible={alertState.dismissible}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
