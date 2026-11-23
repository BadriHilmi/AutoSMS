import React, { createContext, useContext, useState, useCallback } from 'react';
import { CustomAlertModal, AlertButton } from '../ui/components/CustomAlertModal';
import { Toast } from '../ui/components/Toast';

export interface AlertContextType {
  showAlert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type?: 'info' | 'success' | 'warning' | 'danger'
  ) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    isDestructive?: boolean
  ) => void;
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    duration?: number
  ) => void;
}

const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
  showConfirm: () => {},
  showToast: () => {},
});

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Alert State
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
    type?: 'info' | 'success' | 'warning' | 'danger';
  }>({
    visible: false,
    title: '',
  });

  // Toast State
  const [toastState, setToastState] = useState<{
    visible: boolean;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
  }>({
    visible: false,
    message: '',
  });

  const showAlert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      type?: 'info' | 'success' | 'warning' | 'danger'
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: buttons || [{ text: 'OK' }],
        type,
      });
    },
    []
  );

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      confirmText: string = 'Confirm',
      isDestructive: boolean = false
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        type: isDestructive ? 'danger' : 'info',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: confirmText,
            style: isDestructive ? 'destructive' : 'default',
            onPress: onConfirm,
          },
        ],
      });
    },
    []
  );

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 2600) => {
      setToastState({
        visible: true,
        message,
        type,
        duration,
      });
    },
    []
  );

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const hideToast = useCallback(() => {
    setToastState((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, showToast }}>
      {children}
      <CustomAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onDismiss={hideAlert}
      />
      <Toast
        visible={toastState.visible}
        message={toastState.message}
        type={toastState.type}
        duration={toastState.duration}
        onDismiss={hideToast}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);
