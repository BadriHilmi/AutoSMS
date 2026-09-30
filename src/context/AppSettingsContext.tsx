import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSetting, setSetting } from '../db/client';

export interface AppSettingsContextType {
  sendDelay: number;
  setSendDelay: (delay: number) => void;
  defaultSim: 'ASK' | 'SIM1' | 'SIM2';
  setDefaultSim: (sim: 'ASK' | 'SIM1' | 'SIM2') => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  appLockEnabled: boolean;
  setAppLockEnabled: (enabled: boolean) => void;
  isLoading: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  sendDelay: 10,
  setSendDelay: () => {},
  defaultSim: 'SIM1',
  setDefaultSim: () => {},
  notificationsEnabled: true,
  setNotificationsEnabled: () => {},
  appLockEnabled: false,
  setAppLockEnabled: () => {},
  isLoading: true,
});

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sendDelay, setSendDelayState] = useState<number>(10);
  const [defaultSim, setDefaultSimState] = useState<'ASK' | 'SIM1' | 'SIM2'>('SIM1');
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(true);
  const [appLockEnabled, setAppLockEnabledState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const savedDelay = await getSetting('send_delay', '10');
        const parsedDelay = parseInt(savedDelay, 10);
        if (!isNaN(parsedDelay) && parsedDelay > 0) {
          setSendDelayState(parsedDelay);
        }

        const savedSim = await getSetting('default_sim', 'SIM1');
        if (savedSim === 'ASK' || savedSim === 'SIM1' || savedSim === 'SIM2') {
          setDefaultSimState(savedSim);
        }

        const savedNotif = await getSetting('notifications_enabled', 'true');
        setNotificationsEnabledState(savedNotif === 'true');

        const savedLock = await getSetting('app_lock_enabled', 'false');
        setAppLockEnabledState(savedLock === 'true');
      } catch (err) {
        console.warn('Failed to load app settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const setSendDelay = (delay: number) => {
    setSendDelayState(delay);
    setSetting('send_delay', delay.toString()).catch((err) =>
      console.warn('Failed to save send_delay', err)
    );
  };

  const setDefaultSim = (sim: 'ASK' | 'SIM1' | 'SIM2') => {
    setDefaultSimState(sim);
    setSetting('default_sim', sim).catch((err) =>
      console.warn('Failed to save default_sim', err)
    );
  };

  const setNotificationsEnabled = (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    setSetting('notifications_enabled', enabled ? 'true' : 'false').catch((err) =>
      console.warn('Failed to save notifications_enabled', err)
    );
  };

  const setAppLockEnabled = (enabled: boolean) => {
    setAppLockEnabledState(enabled);
    setSetting('app_lock_enabled', enabled ? 'true' : 'false').catch((err) =>
      console.warn('Failed to save app_lock_enabled', err)
    );
  };

  return (
    <AppSettingsContext.Provider
      value={{
        sendDelay,
        setSendDelay,
        defaultSim,
        setDefaultSim,
        notificationsEnabled,
        setNotificationsEnabled,
        appLockEnabled,
        setAppLockEnabled,
        isLoading,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => useContext(AppSettingsContext);
