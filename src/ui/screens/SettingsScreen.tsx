import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { useTheme } from '../../theme';
import { SegmentedControl } from '../components/SegmentedControl';
import { Card } from '../components/Card';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getAllLogs } from '../../db/queries/logs';
import { getAllSchedules } from '../../db/queries/schedules';
import { getAllContacts, getAllGroups } from '../../db/queries/contacts';
import { useSimCards } from '../../hooks/useSimCards';
import { useAppSettings } from '../../context/AppSettingsContext';
import { MaterialIcons } from '@expo/vector-icons';
import SmsEngine from '../../../modules/sms-engine';

export const SettingsScreen: React.FC = () => {
  const { colors, typography, isDark, setThemeMode, themeMode } = useTheme();
  const { isDualSim, simCards, singleSimLabel } = useSimCards();
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    preAlertEnabled,
    setPreAlertEnabled,
    appLockEnabled,
    setAppLockEnabled,
    defaultSim,
    setDefaultSim,
    sendDelay,
    setSendDelay,
  } = useAppSettings();

  const handleToggleAppLock = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable AutoSMS App Lock',
          fallbackLabel: 'Enter PIN',
        });
        if (auth.success) {
          setAppLockEnabled(true);
        } else {
          Alert.alert('Authentication Failed', 'Could not verify identity.');
        }
      } else {
        setAppLockEnabled(true);
      }
    } else {
      setAppLockEnabled(false);
    }
  };

  const handleRequestBatteryOptimization = async () => {
    try {
      const launched = await SmsEngine.requestIgnoreBatteryOptimizations();
      if (!launched) {
        Alert.alert(
          'Background Battery',
          'AutoSMS is already unrestricted, or you can verify battery permissions in Android system settings.',
          [
            { text: 'OK' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch {
      Linking.openSettings();
    }
  };

  const handleExportCsv = async () => {
    try {
      const logs = await getAllLogs();
      const csvHeader = 'Phone Number,Recipient Name,Status,SIM Slot,Sent Time,Delivered Time,Message\n';
      const csvRows = logs
        .map(
          (l) =>
            `"${l.phoneNumber}","${l.contactName || ''}","${l.status}","SIM ${l.simSlot + 1}","${new Date(
              l.sentAt
            ).toISOString()}","${l.deliveredAt ? new Date(l.deliveredAt).toISOString() : ''}","${l.messageContent.replace(
              /"/g,
              '""'
            )}"`
        )
        .join('\n');

      const csvContent = csvHeader + csvRows;
      const fileUri = `${FileSystem.documentDirectory}autosms_history_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export SMS History CSV',
        });
      } else {
        Alert.alert('Exported', `Saved to ${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Export Error', 'Could not generate CSV file.');
    }
  };

  const handleBackupRestore = async () => {
    try {
      const schedules = await getAllSchedules();
      const contacts = await getAllContacts();
      const groups = await getAllGroups();

      const backupData = {
        version: '1.0.0',
        timestamp: Date.now(),
        schedules,
        contacts,
        groups,
      };

      const backupJson = JSON.stringify(backupData, null, 2);
      const fileUri = `${FileSystem.documentDirectory}autosms_backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, backupJson);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Backup AutoSMS Data',
        });
      } else {
        Alert.alert('Backup Created', `Saved to ${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Backup Error', 'Could not export backup data.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Page Title */}
      <View style={styles.pageTitleBlock}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Preferences and configuration for AutoSMS.
        </Text>
      </View>

      {/* Group: App & Display */}
      <Card title="App & Security" iconName="security">
        {/* Theme */}
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
              <MaterialIcons name="brightness-medium" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.settingTitle, { color: colors.text }]}>Theme</Text>
          </View>
          <View style={{ width: 140 }}>
            <SegmentedControl
              options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
              selectedValue={themeMode}
              onSelect={(val) => setThemeMode(val)}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
              <MaterialIcons name="notifications-none" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Notifications</Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>Delivery & send alerts</Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Pre-campaign Heads-up */}
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
              <MaterialIcons name="schedule-send" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Pre-campaign heads-up</Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Alert 5m before large campaigns (10+ contacts)
              </Text>
            </View>
          </View>
          <Switch
            value={preAlertEnabled}
            onValueChange={setPreAlertEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        {/* App Lock */}
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
              <MaterialIcons name="lock-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>App lock</Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>Require biometric / PIN</Text>
            </View>
          </View>
          <Switch
            value={appLockEnabled}
            onValueChange={handleToggleAppLock}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Allow Unrestricted Background Battery */}
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomWidth: 0 }]}
          onPress={handleRequestBatteryOptimization}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
              <MaterialIcons name="battery-charging-full" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Allow Unrestricted Battery
              </Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Prevent Android Doze from delaying scheduled tasks
              </Text>
            </View>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.primaryContainer }]}>
            <Text style={[styles.chipText, { color: colors.primaryDark, fontWeight: '700' }]}>
              Configure
            </Text>
          </View>
        </TouchableOpacity>
      </Card>

      {/* Group: SMS & Hardware */}
      <Card title="SMS & Connectivity" iconName="sim-card">
        {/* SIM Configuration */}
        {isDualSim ? (
          <View style={[styles.settingRowBlock, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="sim-card" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Default SIM</Text>
            </View>
            <SegmentedControl
              options={[
                { label: 'Ask', value: 'ASK' },
                { label: simCards[0]?.displayName || 'SIM 1', value: 'SIM1' },
                { label: simCards[1]?.displayName || 'SIM 2', value: 'SIM2' },
              ]}
              selectedValue={defaultSim}
              onSelect={setDefaultSim}
              style={{ marginTop: 10 }}
            />
          </View>
        ) : (
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="sim-card" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Active SIM</Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>Single SIM device</Text>
              </View>
            </View>
            <View style={[styles.chip, { backgroundColor: colors.primaryContainer }]}>
              <Text style={[styles.chipText, { color: colors.primaryDark, fontWeight: '700' }]}>
                {singleSimLabel}
              </Text>
            </View>
          </View>
        )}

        {/* Default Send Delay */}
        <View style={[styles.settingRowBlock, { borderBottomWidth: 0 }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
              <MaterialIcons name="timer" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Send delay</Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Interval between each recipient
              </Text>
            </View>
          </View>
          <SegmentedControl
            options={[
              { label: '5s', value: 5 },
              { label: '10s', value: 10 },
              { label: '15s', value: 15 },
              { label: '30s', value: 30 },
            ]}
            selectedValue={sendDelay}
            onSelect={(val) => setSendDelay(Number(val))}
            style={{ marginTop: 12 }}
          />

          {/* Non-blocking Delay Safety Tip */}
          <View style={[styles.nonBlockingTipBox, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={14} color={colors.primary} />
            <Text style={[styles.nonBlockingTipText, { color: colors.textMuted }]}>
              Carrier safety tip: 10s or 15s delay is recommended for bulk batches to avoid SIM rate-limits.
            </Text>
          </View>
        </View>
      </Card>

      {/* Group: Data & Storage */}
      <Card title="Data & Backups" iconName="storage">
        {/* Excluded numbers */}
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.border }]}
          onPress={() => Alert.alert('Excluded Numbers', 'Manage global blacklisted numbers.')}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
              <MaterialIcons name="block" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Excluded numbers</Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Blacklist specific contacts
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Export history */}
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.border }]}
          onPress={handleExportCsv}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
              <MaterialIcons name="file-download" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Export history</Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>Download CSV report</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Backup & Restore */}
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomWidth: 0 }]}
          onPress={handleBackupRestore}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
              <MaterialIcons name="cloud-sync" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Backup & restore</Text>
              <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                Save or import JSON data
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pageTitleBlock: {
    paddingVertical: 10,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  settingRowBlock: {
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: 13.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  settingSub: {
    fontSize: 11.5,
    fontFamily: 'Sora_400Regular',
    marginTop: 1,
    includeFontPadding: false,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  nonBlockingTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  nonBlockingTipText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    lineHeight: 15,
    includeFontPadding: false,
  },
});
