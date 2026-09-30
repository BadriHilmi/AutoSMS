import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { useTheme } from '../../theme';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { getAllSchedules, updateScheduleStatus, updateSchedule, deleteSchedule, updateScheduleProgress } from '../../db/queries/schedules';
import { Schedule, messageLogs } from '../../db/schema';
import { db } from '../../db/client';
import { EditTaskModal } from '../components/EditTaskModal';
import { formatRecurrenceLabel } from '../../domain/scheduler';
import SmsEngine from '../../../modules/sms-engine';
import { MaterialIcons } from '@expo/vector-icons';

export const TasksScreen: React.FC<{ onNavigateToCompose?: () => void }> = ({ onNavigateToCompose }) => {
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [schedulesList, setSchedulesList] = useState<Schedule[]>([]);
  const [hasUserSwitchedTab, setHasUserSwitchedTab] = useState(false);
  const [showBatteryTip, setShowBatteryTip] = useState(true);

  const handleOpenBatterySettings = async () => {
    try {
      const launched = await SmsEngine.requestIgnoreBatteryOptimizations();
      if (!launched) {
        Alert.alert(
          'Background Battery',
          'AutoSMS is already unrestricted, or you can manage power permissions in Android system settings.',
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

  // Smart initial tab: if active is empty and upcoming has tasks, show upcoming
  useEffect(() => {
    if (!hasUserSwitchedTab && schedulesList.length > 0) {
      const activeCount = schedulesList.filter((s) => s.status === 'RUNNING').length;
      const upcomingCount = schedulesList.filter((s) => s.status === 'SCHEDULED').length;
      if (activeCount === 0 && upcomingCount > 0 && activeTab === 'active') {
        setActiveTab('upcoming');
      }
    }
  }, [schedulesList, hasUserSwitchedTab, activeTab]);

  const syncPendingCampaignEvents = async () => {
    try {
      const rawEvents = await SmsEngine.getPendingEvents();
      if (!rawEvents || rawEvents === '[]') return false;
      const events: any[] = JSON.parse(rawEvents);
      if (!events.length) return false;

      for (const evt of events) {
        if (evt.type === 'STARTED') {
          await updateScheduleStatus(evt.taskId, 'RUNNING');
        } else if (evt.type === 'PROGRESS') {
          if (evt.sentCount !== undefined) {
            await updateScheduleProgress(evt.taskId, evt.sentCount);
          }
          try {
            await db.insert(messageLogs).values({
              id: `log_${evt.timestamp || Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              scheduleId: evt.taskId,
              contactName: evt.contactName || '',
              phoneNumber: evt.phoneNumber || '',
              messageContent: evt.messageContent || '',
              simSlot: evt.simSlot ?? 0,
              sentAt: evt.timestamp || Date.now(),
              status: 'SENT',
            });
          } catch (logErr) {
            console.log('Log insert error:', logErr);
          }
        } else if (evt.type === 'COMPLETED') {
          if (evt.frequency === 'DAILY' || evt.frequency === 'WEEKLY' || (evt.frequency === 'CUSTOM' && evt.nextRun)) {
            const updates: any = {
              status: 'SCHEDULED',
              sentCount: 0,
              startDate: evt.nextRun,
            };
            if (evt.customRule) {
              updates.customRule = evt.customRule;
            }
            await updateSchedule(evt.taskId, updates);
          } else {
            await updateScheduleStatus(evt.taskId, 'COMPLETED');
            if (evt.totalSent !== undefined) {
              await updateScheduleProgress(evt.taskId, evt.totalSent);
            }
          }
        }
      }

      await SmsEngine.clearPendingEvents();
      return true;
    } catch (e) {
      console.log('Error syncing pending campaign events:', e);
      return false;
    }
  };

  const checkAndTriggerDueTasks = async () => {
    try {
      await syncPendingCampaignEvents();

      const items = await getAllSchedules();
      const now = Date.now();

      for (const task of items) {
        if (task.status === 'SCHEDULED' && task.startDate <= now) {
          console.log(`Auto-triggering due task: ${task.id} (${task.title})`);
          await updateScheduleStatus(task.id, 'RUNNING');
          try {
            await SmsEngine.runCampaignNow({
              taskId: task.id,
              message: task.messageBody,
              recipientsJson: task.targetNumbers || '[]',
              intervalDelaySec: task.intervalDelaySec ?? 10,
              simSlot: task.simSlot ?? 0,
              frequency: task.frequency,
              customRule: task.customRule ?? undefined,
            });
          } catch (runErr) {
            console.log('Failed to trigger due task:', runErr);
          }
        }
      }

      const refreshed = await getAllSchedules();
      setSchedulesList(refreshed);
    } catch (e) {
      console.log('Error checking schedules:', e);
    }
  };

  const isAnyRunning = schedulesList.some((s) => s.status === 'RUNNING');

  useEffect(() => {
    checkAndTriggerDueTasks();
    const pollInterval = isAnyRunning ? 3000 : 10000;
    const interval = setInterval(() => {
      checkAndTriggerDueTasks();
    }, pollInterval);
    return () => clearInterval(interval);
  }, [isAnyRunning]);

  const [editingTask, setEditingTask] = useState<Schedule | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);

  const handleOpenEdit = (task: Schedule) => {
    setEditingTask(task);
    setIsEditModalVisible(true);
  };

  const handleRunNow = async (task: Schedule) => {
    Alert.alert(
      'Run Campaign Now',
      `Start sending "${task.title || 'SMS Campaign'}" immediately?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Now',
          onPress: async () => {
            try {
              await SmsEngine.runCampaignNow({
                taskId: task.id,
                message: task.messageBody,
                recipientsJson: task.targetNumbers || '[]',
                intervalDelaySec: task.intervalDelaySec ?? 10,
                simSlot: task.simSlot ?? 0,
                frequency: task.frequency,
                customRule: task.customRule ?? undefined,
              });
              await updateScheduleStatus(task.id, 'RUNNING');
              setSchedulesList((prev) =>
                prev.map((s) => (s.id === task.id ? { ...s, status: 'RUNNING' } : s))
              );
              setActiveTab('active');
            } catch (err: any) {
              Alert.alert('Run Failed', err.message || 'Could not start campaign.');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async (updatedTask: Schedule) => {
    try {
      await updateSchedule(updatedTask.id, {
        title: updatedTask.title,
        messageBody: updatedTask.messageBody,
        frequency: updatedTask.frequency,
        startDate: updatedTask.startDate,
        timeOfDay: updatedTask.timeOfDay,
        daysOfWeek: updatedTask.daysOfWeek,
        customRule: updatedTask.customRule,
        simSlot: updatedTask.simSlot,
        intervalDelaySec: updatedTask.intervalDelaySec,
      });

      if (updatedTask.status === 'SCHEDULED' && updatedTask.targetNumbers) {
        try {
          await SmsEngine.scheduleAlarmTask({
            taskId: updatedTask.id,
            timestamp: updatedTask.startDate,
            message: updatedTask.messageBody,
            recipientsJson: updatedTask.targetNumbers,
            intervalDelaySec: updatedTask.intervalDelaySec ?? 10,
            simSlot: updatedTask.simSlot ?? 0,
            frequency: updatedTask.frequency,
            customRule: updatedTask.customRule || undefined,
          });
        } catch (alarmErr) {
          console.log('Alarm reschedule notice:', alarmErr);
        }
      }

      setSchedulesList((prev) =>
        prev.map((s) => (s.id === updatedTask.id ? updatedTask : s))
      );
      setIsEditModalVisible(false);
      setEditingTask(null);
      Alert.alert('Campaign Updated', 'Your changes have been saved successfully.');
    } catch (e: any) {
      console.log('Failed to update schedule:', e);
      Alert.alert('Update Failed', e.message || 'Could not update campaign.');
    }
  };

  const handleTogglePause = async (task: Schedule) => {
    const nextStatus = task.status === 'RUNNING' ? 'PAUSED' : 'RUNNING';
    try {
      await updateScheduleStatus(task.id, nextStatus);
      setSchedulesList((prev) =>
        prev.map((s) => (s.id === task.id ? { ...s, status: nextStatus } : s))
      );
    } catch (e) {
      setSchedulesList((prev) =>
        prev.map((s) => (s.id === task.id ? { ...s, status: nextStatus } : s))
      );
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this scheduled task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSchedule(id);
            await SmsEngine.cancelAlarmTask(id);
          } catch (e) {}
          setSchedulesList((prev) => prev.filter((s) => s.id !== id));
        },
      },
    ]);
  };

  const filteredTasks = schedulesList.filter((s) => {
    if (activeTab === 'active') {
      return s.status === 'RUNNING' || s.status === 'PAUSED' || (s.status === 'SCHEDULED' && s.startDate <= Date.now());
    }
    if (activeTab === 'upcoming') {
      return s.status === 'SCHEDULED' && s.startDate > Date.now();
    }
    if (activeTab === 'completed') {
      return s.status === 'COMPLETED';
    }
    return true;
  });

  const activeCount = schedulesList.filter(
    (s) => s.status === 'RUNNING' || s.status === 'PAUSED' || (s.status === 'SCHEDULED' && s.startDate <= Date.now())
  ).length;
  const upcomingCount = schedulesList.filter((s) => s.status === 'SCHEDULED' && s.startDate > Date.now()).length;
  const completedCount = schedulesList.filter((s) => s.status === 'COMPLETED').length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Page Title */}
      <View style={styles.pageTitleBlock}>
        <Text style={[styles.title, { color: colors.text }]}>Tasks</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Manage active and automated campaigns.
        </Text>
      </View>

      {/* Modern Stat Card */}
      <View style={[styles.statCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <View style={styles.statLeft}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active campaigns</Text>
          <Text style={[styles.statNum, { color: colors.primaryDark }]}>{activeCount}</Text>
          <Text style={[styles.statNote, { color: colors.textMuted }]}>
            {upcomingCount} scheduled • {completedCount} completed
          </Text>
        </View>
        <View style={[styles.statIconBox, { backgroundColor: colors.primaryContainer }]}>
          <MaterialIcons name="auto-awesome" size={24} color={colors.primary} />
        </View>
      </View>

      {/* Non-blocking Background Battery Optimization Tip */}
      {showBatteryTip && upcomingCount > 0 && (
        <View style={[styles.batteryTipBanner, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
          <MaterialIcons name="battery-charging-full" size={18} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text style={[styles.batteryTipTitle, { color: colors.text }]}>
              Allow Unrestricted Battery
            </Text>
            <Text style={[styles.batteryTipBody, { color: colors.textMuted }]}>
              Prevent Android Doze from delaying scheduled morning & background tasks.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.batteryTipBtn, { backgroundColor: colors.primaryContainer }]}
            onPress={handleOpenBatterySettings}
            activeOpacity={0.8}
          >
            <Text style={[styles.batteryTipBtnText, { color: colors.primaryDark }]}>Allow</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowBatteryTip(false)}
            style={{ padding: 4, marginLeft: 2 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Fluid Pill Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
        {[
          { key: 'active', label: 'Active', count: activeCount },
          { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
          { key: 'completed', label: 'Completed', count: completedCount },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabPill,
                isActive && [styles.activeTabPill, { backgroundColor: colors.surfaceCard }],
              ]}
              onPress={() => {
                setHasUserSwitchedTab(true);
                setActiveTab(tab.key as any);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.textMuted },
                  isActive && styles.activeTabLabel,
                ]}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View
                  style={[
                    styles.countPill,
                    {
                      backgroundColor: isActive ? colors.primaryContainer : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countPillText,
                      { color: isActive ? colors.primaryDark : colors.textMuted },
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryContainer }]}>
            <MaterialIcons
              name={activeTab === 'active' ? 'play-circle-outline' : activeTab === 'upcoming' ? 'schedule' : 'check-circle-outline'}
              size={36}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {activeTab === 'active'
              ? 'No active campaigns'
              : activeTab === 'upcoming'
              ? 'No upcoming scheduled tasks'
              : 'No completed tasks yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            {activeTab === 'active'
              ? 'Start an SMS campaign from the Compose tab or resume an upcoming task.'
              : 'Compose a message and set a date or recurrence to automate your SMS sends.'}
          </Text>
        </View>
      ) : (
        filteredTasks.map((task) => {
          const progress = task.totalRecipients > 0 ? task.sentCount / task.totalRecipients : 0;
          return (
            <Card key={task.id} style={styles.taskCard}>
              <View style={styles.cardTop}>
                <View style={styles.taskInfoRow}>
                  <Text style={[styles.scheduleLine, { color: colors.text }]}>
                    {task.title || 'SMS Campaign'}
                  </Text>
                  <View style={[styles.freqBadge, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={[styles.freqText, { color: colors.primaryDark }]}>
                      {formatRecurrenceLabel(task.frequency, task.customRule, task.daysOfWeek)} @ {task.timeOfDay}
                    </Text>
                  </View>
                </View>
                <StatusBadge status={task.status} />
              </View>

              <TextInput
                style={[
                  styles.msgPreview,
                  {
                    backgroundColor: colors.surfaceSunken,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                multiline
                numberOfLines={2}
                value={task.messageBody}
                editable={false}
              />

              {task.status === 'RUNNING' && <ProgressBar progress={progress} />}

              <View style={styles.statsRow}>
                <View style={styles.statsItem}>
                  <MaterialIcons name="people-outline" size={15} color={colors.textMuted} />
                  <Text style={[styles.statSub, { color: colors.textMuted }]}>
                    {task.totalRecipients.toLocaleString()} recipients
                  </Text>
                </View>
                <View style={styles.statsItem}>
                  {task.status === 'SCHEDULED' ? (
                    <>
                      <MaterialIcons name="schedule" size={14} color={colors.pending} />
                      <Text style={[styles.statSub, { color: colors.pending }]}>
                        Starts automatically
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="done-all" size={14} color={colors.success} />
                      <Text style={[styles.statSub, { color: colors.textMuted }]}>
                        {task.sentCount} sent
                      </Text>
                    </>
                  )}
                </View>
              </View>

              {/* Action Buttons with fluid styling */}
              <View style={styles.actionsRow}>
                {task.status === 'RUNNING' && (
                  <TouchableOpacity
                    style={[styles.btnAction, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
                    onPress={() => handleTogglePause(task)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="pause" size={16} color={colors.text} />
                    <Text style={[styles.btnActionText, { color: colors.text }]}>Pause</Text>
                  </TouchableOpacity>
                )}

                {task.status === 'PAUSED' && (
                  <TouchableOpacity
                    style={[styles.btnAction, { borderColor: colors.primary, backgroundColor: colors.primary }]}
                    onPress={() => handleTogglePause(task)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="play-arrow" size={16} color="#ffffff" />
                    <Text style={[styles.btnActionText, { color: '#ffffff' }]}>Resume</Text>
                  </TouchableOpacity>
                )}

                {task.status === 'SCHEDULED' && (
                  <TouchableOpacity
                    style={[styles.btnAction, { borderColor: colors.primaryLight, backgroundColor: colors.primaryContainer }]}
                    onPress={() => handleRunNow(task)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="play-arrow" size={16} color={colors.primaryDark} />
                    <Text style={[styles.btnActionText, { color: colors.primaryDark }]}>Run Now</Text>
                  </TouchableOpacity>
                )}

                {task.status === 'COMPLETED' && (
                  <TouchableOpacity
                    style={[styles.btnAction, { borderColor: colors.primaryLight, backgroundColor: colors.primaryContainer }]}
                    onPress={() => handleRunNow(task)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="replay" size={16} color={colors.primaryDark} />
                    <Text style={[styles.btnActionText, { color: colors.primaryDark }]}>Run Again</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.btnAction, { borderColor: colors.primaryLight, backgroundColor: colors.primaryContainer }]}
                  onPress={() => handleOpenEdit(task)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="edit" size={16} color={colors.primaryDark} />
                  <Text style={[styles.btnActionText, { color: colors.primaryDark }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnAction, styles.btnDelete, { borderColor: colors.errorBg, backgroundColor: colors.errorBg }]}
                  onPress={() => handleDelete(task.id)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </Card>
          );
        })
      )}

      <EditTaskModal
        visible={isEditModalVisible}
        task={editingTask}
        onClose={() => {
          setIsEditModalVisible(false);
          setEditingTask(null);
        }}
        onSave={handleSaveEdit}
      />

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
    paddingVertical: 12,
    marginBottom: 4,
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
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#002521',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statLeft: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  statNum: {
    fontSize: 22,
    fontFamily: 'Sora_700Bold',
    marginTop: 2,
    includeFontPadding: false,
  },
  statNote: {
    fontSize: 11.5,
    fontFamily: 'Sora_400Regular',
    marginTop: 3,
    includeFontPadding: false,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    marginBottom: 14,
    gap: 3,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 999,
    gap: 4,
  },
  activeTabPill: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  activeTabLabel: {
    fontFamily: 'Sora_700Bold',
  },
  countPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  countPillText: {
    fontSize: 10,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  taskCard: {
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskInfoRow: {
    flex: 1,
    marginRight: 8,
  },
  scheduleLine: {
    fontSize: 13.5,
    fontFamily: 'Sora_700Bold',
    marginBottom: 4,
    includeFontPadding: false,
  },
  freqBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  freqText: {
    fontSize: 10.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  msgPreview: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 12.5,
    fontFamily: 'Sora_400Regular',
    minHeight: 48,
    textAlignVertical: 'top',
    includeFontPadding: false,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statSub: {
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnAction: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  btnDelete: {
    flex: 0.35,
  },
  btnActionText: {
    fontSize: 12.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 32,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontFamily: 'Sora_700Bold',
    marginBottom: 5,
    textAlign: 'center',
    includeFontPadding: false,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    includeFontPadding: false,
  },
  batteryTipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  batteryTipTitle: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
    marginBottom: 2,
  },
  batteryTipBody: {
    fontSize: 10.5,
    fontFamily: 'Sora_400Regular',
    lineHeight: 14.5,
    includeFontPadding: false,
  },
  batteryTipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  batteryTipBtnText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
});
