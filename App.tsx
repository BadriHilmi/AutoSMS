import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import { ThemeProvider, useTheme } from './src/theme';
import { AppSettingsProvider } from './src/context/AppSettingsContext';
import { initDatabase } from './src/db/client';
import { Header } from './src/ui/components/Header';
import { BottomNav, TabKey } from './src/ui/components/BottomNav';
import { ComposeScreen } from './src/ui/screens/ComposeScreen';
import { TasksScreen } from './src/ui/screens/TasksScreen';
import { HistoryScreen } from './src/ui/screens/HistoryScreen';
import { SettingsScreen } from './src/ui/screens/SettingsScreen';

import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

function MainApp() {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('compose');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Header onSettingsPress={() => setActiveTab('settings')} />
      <View style={styles.screenContainer}>
        {activeTab === 'compose' && <ComposeScreen onNavigateToTasks={() => setActiveTab('tasks')} />}
        {activeTab === 'tasks' && <TasksScreen onNavigateToCompose={() => setActiveTab('compose')} />}
        {activeTab === 'history' && <HistoryScreen onNavigateToCompose={() => setActiveTab('compose')} />}
        {activeTab === 'settings' && <SettingsScreen />}
      </View>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        if (Platform.OS === 'android') {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.SEND_SMS,
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          ]);
        }
      } catch (e) {
        console.log('Setup notice:', e);
      } finally {
        setDbReady(true);
      }
    }
    setup();
  }, []);

  useEffect(() => {
    if (dbReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [dbReady, fontsLoaded]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppSettingsProvider>
          <MainApp />
        </AppSettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f9f8',
  },
});
