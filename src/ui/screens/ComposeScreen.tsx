import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import { useTheme } from '../../theme';
import { Card } from '../components/Card';
import { SegmentedControl } from '../components/SegmentedControl';
import { RecipientRow } from '../components/RecipientChip';
import { calculateSmsSegments } from '../../domain/smsCounter';
import { AVAILABLE_TOKENS } from '../../domain/tokenizer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Contacts from 'expo-contacts';
import { parseContactsCsv } from '../../domain/csvImporter';
import { createSchedule } from '../../db/queries/schedules';
import {
  FrequencyType,
  CustomRecurrenceRule,
  getNextRunTimestamp,
  formatRecurrenceLabel,
} from '../../domain/scheduler';
import { CustomRecurrenceModal } from '../components/CustomRecurrenceModal';
import SmsEngine from '../../../modules/sms-engine';
import { Template } from '../../db/schema';
import {
  getAllTemplates,
  saveTemplate,
  deleteTemplate,
  ensureDefaultTemplates,
} from '../../db/queries/templates';
import { DatePickerModal, TimePickerModal } from '../components/DateTimePickerModal';
import { AddRecipientModal } from '../components/AddRecipientModal';
import { ContactPickerModal } from '../components/ContactPickerModal';
import { CreateTemplateModal } from '../components/CreateTemplateModal';
import { TemplateManagerModal } from '../components/TemplateManagerModal';
import { CampaignScheduledModal } from '../components/CampaignScheduledModal';
import { useSimCards } from '../../hooks/useSimCards';
import { useAppSettings } from '../../context/AppSettingsContext';
import { MaterialIcons } from '@expo/vector-icons';
import { haptics } from '../../utils/haptics';

export const ComposeScreen: React.FC<{ onNavigateToTasks?: () => void }> = ({ onNavigateToTasks }) => {
  const { colors } = useTheme();
  const { isDualSim, simOptions } = useSimCards();

  const [campaignTitle, setCampaignTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [scheduledSummaryData, setScheduledSummaryData] = useState({
    title: '',
    recipientsCount: 0,
    timeText: '',
    frequencyText: '',
    delay: 5,
  });
  const [templatesList, setTemplatesList] = useState<Template[]>([]);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isManageTemplatesOpen, setIsManageTemplatesOpen] = useState(false);
  const [recipients, setRecipients] = useState<Array<{ name: string; phone: string }>>([]);
  const [simSlot, setSimSlot] = useState<number>(0);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [timeOfDay, setTimeOfDay] = useState('10:00 AM');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isAddRecipientOpen, setIsAddRecipientOpen] = useState(false);
  const [isContactPickerOpen, setIsContactPickerOpen] = useState(false);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');
  const [showAllRecipients, setShowAllRecipients] = useState(false);
  const [recurrence, setRecurrence] = useState<FrequencyType>('DAILY');
  const [customRule, setCustomRule] = useState<CustomRecurrenceRule | null>(null);
  const [isCustomRecurrenceOpen, setIsCustomRecurrenceOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { sendDelay, setSendDelay, notificationsEnabled, preAlertEnabled } = useAppSettings();

  const smsMetrics = calculateSmsSegments(message);

  const previewRecipientName = recipients.length > 0 ? (recipients[0].name || recipients[0].phone) : 'Alex Morgan';
  const previewRecipientPhone = recipients.length > 0 ? recipients[0].phone : '+1 (555) 019-2834';
  const previewSegments = useMemo(() => {
    if (!message) return [];
    const tokenRegex = /(\{(?:name|phone|date|time|custom)\})/gi;
    const parts = message.split(tokenRegex);
    return parts.map((part, index) => {
      const lower = part.toLowerCase();
      if (lower === '{name}') {
        return { isToken: true, text: previewRecipientName, key: `tok_${index}` };
      }
      if (lower === '{phone}') {
        return { isToken: true, text: previewRecipientPhone, key: `tok_${index}` };
      }
      if (lower === '{date}') {
        return {
          isToken: true,
          text: startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          key: `tok_${index}`,
        };
      }
      if (lower === '{time}') {
        return { isToken: true, text: timeOfDay, key: `tok_${index}` };
      }
      if (lower === '{custom}') {
        return { isToken: true, text: '[Custom Info]', key: `tok_${index}` };
      }
      return { isToken: false, text: part, key: `txt_${index}` };
    });
  }, [message, previewRecipientName, previewRecipientPhone, startDate, timeOfDay]);

  const loadTemplates = useCallback(async () => {
    try {
      const items = await ensureDefaultTemplates();
      setTemplatesList(items);
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSaveCustomTemplate = async (name: string, body: string) => {
    await saveTemplate('', name, body);
    const updated = await getAllTemplates();
    setTemplatesList(updated);
    setMessage(body);
    Alert.alert('Template Saved', `"${name}" is ready for use.`);
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteTemplate(id);
    const updated = await getAllTemplates();
    setTemplatesList(updated);
  };

  const handleTemplateLongPress = (tmpl: Template) => {
    Alert.alert(
      tmpl.name,
      'Choose an action for this template:',
      [
        { text: 'Use in Message', onPress: () => setMessage(tmpl.body) },
        {
          text: 'Delete Template',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Template',
              `Are you sure you want to delete "${tmpl.name}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => handleDeleteTemplate(tmpl.id),
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const filteredRecipients = useMemo(() => {
    const q = recipientSearchQuery.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone.toLowerCase().replace(/[\s\-\(\)]/g, '').includes(q.replace(/[\s\-\(\)]/g, ''))
    );
  }, [recipients, recipientSearchQuery]);

  const insertToken = (token: string) => {
    setMessage((prev) => `${prev} ${token}`);
  };

  const handlePickContacts = () => {
    setIsContactPickerOpen(true);
  };

  const handleAddContactsFromPicker = (chosen: Array<{ name: string; phone: string }>) => {
    setRecipients((prev) => {
      const existingPhones = new Set(prev.map((r) => r.phone.replace(/[\s\-\(\)]/g, '')));
      const newUnique = chosen.filter(
        (c) => !existingPhones.has(c.phone.replace(/[\s\-\(\)]/g, ''))
      );
      if (newUnique.length < chosen.length) {
        Alert.alert(
          'Contacts Added',
          `Added ${newUnique.length} new ${newUnique.length === 1 ? 'contact' : 'contacts'} (${chosen.length - newUnique.length} already in list).`
        );
      } else {
        Alert.alert('Success', `Added ${newUnique.length} ${newUnique.length === 1 ? 'contact' : 'contacts'} to campaign.`);
      }
      return [...prev, ...newUnique];
    });
  };

  const handlePickCsv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const fileContent = await FileSystem.readAsStringAsync(res.assets[0].uri);
        const parsed = parseContactsCsv(fileContent);
        if (parsed.length > 0) {
          setRecipients((prev) => [
            ...prev,
            ...parsed.map((p) => ({ name: p.name, phone: p.phoneNumber })),
          ]);
          Alert.alert('Success', `Imported ${parsed.length} contacts from CSV.`);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Could not read CSV file.');
    }
  };

  const removeRecipient = (index: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleScheduleCampaign = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message.');
      return;
    }
    if (recipients.length === 0) {
      Alert.alert('Error', 'Please add at least one recipient.');
      return;
    }

    if (Platform.OS === 'android') {
      try {
        const permissionsToRequest: any[] = [
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        ];
        if (Number(Platform.Version) >= 33) {
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }

        const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);
        const smsGranted = results[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED;

        if (!smsGranted) {
          Alert.alert(
            'SMS Permission Required',
            'AutoSMS requires SMS permission to send campaigns. Please enable SMS access in device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
            ]
          );
          return;
        }
      } catch (err) {
        console.log('Permission request error:', err);
      }
    }

    const effectiveDaysOfWeek = recurrence === 'CUSTOM' && customRule?.daysOfWeek?.length
      ? customRule.daysOfWeek
      : [1, 2, 3, 4, 5];

    const runTimestamp = getNextRunTimestamp({
      frequency: recurrence,
      startDateTimestamp: startDate.getTime(),
      timeOfDay,
      daysOfWeek: effectiveDaysOfWeek,
      customRule: recurrence === 'CUSTOM' ? (customRule ?? undefined) : undefined,
    });

    if (runTimestamp === null) {
      Alert.alert('Invalid Schedule', 'The selected custom recurrence has already reached its end condition or has no upcoming run.');
      return;
    }

    const customRuleStr = recurrence === 'CUSTOM' && customRule ? JSON.stringify(customRule) : null;
    const scheduleId = `sched_${Date.now()}`;
    await createSchedule({
      id: scheduleId,
      title: campaignTitle || 'SMS Campaign',
      messageBody: message,
      groupId: null,
      targetNumbers: JSON.stringify(recipients),
      frequency: recurrence,
      startDate: runTimestamp,
      timeOfDay,
      daysOfWeek: JSON.stringify(effectiveDaysOfWeek),
      customRule: customRuleStr,
      intervalDelaySec: sendDelay,
      simSlot,
      status: 'SCHEDULED',
      totalRecipients: recipients.length,
      sentCount: 0,
      createdAt: Date.now(),
    });

    // Schedule exact alarm with Android AlarmManager
    try {
      await SmsEngine.scheduleAlarmTask({
        taskId: scheduleId,
        title: campaignTitle || 'SMS Campaign',
        timestamp: runTimestamp,
        message: message,
        recipientsJson: JSON.stringify(recipients),
        intervalDelaySec: sendDelay,
        simSlot: simSlot,
        frequency: recurrence,
        customRule: customRuleStr || undefined,
        notificationsEnabled,
        preAlertEnabled,
      });
      console.log(`Campaign ${scheduleId} alarm scheduled for timestamp: ${runTimestamp} (${new Date(runTimestamp).toLocaleString()})`);
    } catch (schedErr) {
      console.log('Alarm schedule error:', schedErr);
    }

    // If the scheduled time is due now (or within 5 seconds), trigger immediate start
    if (runTimestamp <= Date.now() + 5000) {
      try {
        await SmsEngine.runCampaignNow({
          taskId: scheduleId,
          title: campaignTitle || 'SMS Campaign',
          message: message,
          recipientsJson: JSON.stringify(recipients),
          intervalDelaySec: sendDelay,
          simSlot: simSlot,
          frequency: recurrence,
          customRule: customRuleStr || undefined,
          notificationsEnabled,
          preAlertEnabled,
        });
      } catch (runErr) {
        console.log('Direct run error:', runErr);
      }
    }

    const formattedTime = new Date(runTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = new Date(runTimestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    setScheduledSummaryData({
      title: campaignTitle.trim() || 'SMS Campaign',
      recipientsCount: recipients.length,
      timeText: `${formattedDate} @ ${formattedTime}`,
      frequencyText: formatRecurrenceLabel(recurrence, customRule),
      delay: sendDelay,
    });
    setIsCelebrationOpen(true);
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.surface }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <View style={styles.pageTitleBlock}>
          <Text style={[styles.title, { color: colors.text }]}>New campaign</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Compose, select contacts, and set automated schedule.
          </Text>
        </View>

      {/* Primary Hero: Message & Campaign Composer */}
      <Card title="Message" iconName="edit-note">
        {/* Campaign Title Input */}
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Campaign title (optional)</Text>
        <TextInput
          style={[
            styles.singleInput,
            { backgroundColor: colors.surfaceSunken, borderColor: colors.border, color: colors.text, marginBottom: 14 },
          ]}
          value={campaignTitle}
          onChangeText={setCampaignTitle}
          placeholder="e.g. Scheduled System Maintenance"
          placeholderTextColor={colors.textMuted}
        />

        {/* Templates Header */}
        <View style={styles.templateSectionHeader}>
          <Text style={[styles.microLabel, { color: colors.textMuted }]}>Templates</Text>
          <TouchableOpacity
            style={styles.manageTemplatesLink}
            onPress={() => setIsManageTemplatesOpen(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="tune" size={13} color={colors.primary} />
            <Text style={[styles.manageTemplatesLinkText, { color: colors.primary }]}>Manage</Text>
          </TouchableOpacity>
        </View>

        {/* Templates Carousel */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
          <TouchableOpacity
            style={[styles.templateChipNew, { backgroundColor: colors.primaryContainer, borderColor: colors.primaryLight }]}
            onPress={() => setIsCreateTemplateOpen(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={14} color={colors.primaryDark} />
            <Text style={[styles.templateChipTextNew, { color: colors.primaryDark }]}>New</Text>
          </TouchableOpacity>

          {templatesList.map((tmpl) => (
            <TouchableOpacity
              key={tmpl.id}
              style={[styles.templateChip, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
              onPress={() => {
                setMessage(tmpl.body);
                if (!campaignTitle) setCampaignTitle(tmpl.name);
              }}
              onLongPress={() => handleTemplateLongPress(tmpl)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="auto-awesome" size={12} color={colors.primary} />
              <Text style={[styles.templateChipText, { color: colors.text }]}>{tmpl.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          style={[
            styles.msgBox,
            {
              backgroundColor: colors.surfaceSunken,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          multiline
          numberOfLines={4}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message here..."
          placeholderTextColor={colors.textMuted}
        />

        {/* Token Insertion Chips & Save Draft Link */}
        <View style={styles.tokenAndDraftRow}>
          <View style={styles.chipRow}>
            {AVAILABLE_TOKENS.map((item) => (
              <TouchableOpacity
                key={item.token}
                style={[styles.chip, { backgroundColor: colors.primaryContainer }]}
                onPress={() => insertToken(item.token)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: colors.primaryDark }]}>{item.token}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {message.trim().length > 0 && !templatesList.some((t) => t.body === message.trim()) && (
            <TouchableOpacity
              style={styles.saveDraftLink}
              onPress={() => setIsCreateTemplateOpen(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="bookmark-add" size={13} color={colors.primary} />
              <Text style={[styles.saveDraftLinkText, { color: colors.primary }]}>
                Save as template
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Fluid Capacity & Segment Gauge */}
        {(() => {
          const maxCapacity = (smsMetrics.segmentCount || 1) * smsMetrics.maxCharsCurrentSegment;
          const displaySegments = smsMetrics.segmentCount === 0 ? 1 : smsMetrics.segmentCount;
          const gaugePercent = maxCapacity > 0 ? Math.min(100, (smsMetrics.charCount / maxCapacity) * 100) : 0;
          return (
            <View style={[styles.gaugeBox, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
              <View style={styles.gaugeHeader}>
                <View style={styles.gaugeLeft}>
                  <Text style={[styles.gaugeCount, { color: colors.text }]}>
                    {smsMetrics.charCount}
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      {' '}/ {maxCapacity} chars
                    </Text>
                  </Text>
                </View>

                <View style={[styles.gaugeBadge, { backgroundColor: colors.primaryContainer }]}>
                  <Text style={[styles.gaugeBadgeText, { color: colors.primaryDark }]}>
                    {displaySegments} SMS • {smsMetrics.encoding}
                  </Text>
                </View>
              </View>

              {/* Progress bar line */}
              <View style={[styles.meterTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.meterFill,
                    {
                      backgroundColor:
                        smsMetrics.charCount > smsMetrics.maxCharsCurrentSegment * 0.9
                          ? colors.pending
                          : colors.primary,
                      width: `${gaugePercent}%`,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })()}

        {/* Live Outgoing SMS Preview Bubble */}
        {message.trim().length > 0 && (
          <View style={[styles.previewSection, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
            <View style={styles.previewHeaderRow}>
              <View style={styles.previewHeaderLeft}>
                <MaterialIcons name="smartphone" size={14} color={colors.primary} />
                <Text style={[styles.previewHeaderLabel, { color: colors.textMuted }]}>
                  Live recipient preview
                </Text>
              </View>
              <Text style={[styles.previewTargetText, { color: colors.textSubtle }]}>
                to {previewRecipientName}
              </Text>
            </View>

            <View style={styles.bubbleRow}>
              <View style={[styles.smsBubble, { backgroundColor: colors.primaryContainer, borderColor: colors.primaryLight }]}>
                <Text style={[styles.smsBubbleText, { color: colors.text }]}>
                  {previewSegments.map((seg) =>
                    seg.isToken ? (
                      <Text
                        key={seg.key}
                        style={[
                          styles.tokenResolvedText,
                          { color: colors.primaryDark },
                        ]}
                      >
                        {seg.text}
                      </Text>
                    ) : (
                      <Text key={seg.key}>{seg.text}</Text>
                    )
                  )}
                </Text>
                <View style={styles.bubbleMeta}>
                  <Text style={[styles.bubbleTime, { color: colors.textSubtle }]}>
                    {timeOfDay} • SMS
                  </Text>
                  <MaterialIcons name="done-all" size={12} color={colors.primary} />
                </View>
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* Recipients Card */}
      <Card
        title="Recipients"
        iconName="people-alt"
        headerRight={
          <View style={[styles.chip, { backgroundColor: colors.primaryContainer }]}>
            <Text style={[styles.chipText, { color: colors.primaryDark }]}>
              {recipients.length} total
            </Text>
          </View>
        }
      >
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primaryContainer, borderColor: colors.primaryLight }]}
            onPress={() => setIsAddRecipientOpen(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="person-add" size={15} color={colors.primaryDark} />
            <Text style={[styles.actionBtnText, { color: colors.primaryDark }]}>Add single</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
            onPress={handlePickContacts}
            activeOpacity={0.7}
          >
            <MaterialIcons name="contacts" size={15} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Contacts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
            onPress={handlePickCsv}
            activeOpacity={0.7}
          >
            <MaterialIcons name="upload-file" size={15} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Recipient Search Filter */}
        <View style={[styles.recipientSearchBox, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.recipientSearchInput, { color: colors.text }]}
            placeholder="Filter recipients by name or phone..."
            placeholderTextColor={colors.textMuted}
            value={recipientSearchQuery}
            onChangeText={setRecipientSearchQuery}
          />
          {recipientSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setRecipientSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Recipients List Rendering */}
        {filteredRecipients.length === 0 ? (
          <View style={styles.noMatchBox}>
            <MaterialIcons name="person-search" size={28} color={colors.textMuted} />
            <Text style={[styles.noMatchText, { color: colors.textMuted }]}>
              {recipientSearchQuery ? 'No recipients matched your search.' : 'No recipients selected yet.'}
            </Text>
          </View>
        ) : (
          <>
            {(showAllRecipients ? filteredRecipients : filteredRecipients.slice(0, 5)).map((r, index) => (
              <RecipientRow
                key={`${r.phone}_${index}`}
                label={r.phone}
                subLabel={r.name}
                onRemove={() => removeRecipient(index)}
              />
            ))}

            {filteredRecipients.length > 5 && (
              <TouchableOpacity
                style={[styles.expandBtn, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
                onPress={() => setShowAllRecipients(!showAllRecipients)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={showAllRecipients ? 'expand-less' : 'expand-more'}
                  size={18}
                  color={colors.primaryDark}
                />
                <Text style={[styles.expandBtnText, { color: colors.primaryDark }]}>
                  {showAllRecipients
                    ? 'Collapse list'
                    : `View all ${filteredRecipients.length} recipients (${filteredRecipients.length - 5} more)`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </Card>

      {/* Schedule & Delivery Card */}
      <Card title="Schedule & Delivery" iconName="schedule">
        <View style={styles.dateTimeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Start date</Text>
            <TouchableOpacity
              style={[styles.pickerTriggerCompact, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
              onPress={() => setIsDatePickerOpen(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="calendar-today" size={16} color={colors.primary} />
              <Text style={[styles.pickerTriggerTextCompact, { color: colors.text }]} numberOfLines={1}>
                {startDate.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Send time</Text>
            <TouchableOpacity
              style={[styles.pickerTriggerCompact, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
              onPress={() => setIsTimePickerOpen(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="access-time" size={16} color={colors.primary} />
              <Text style={[styles.pickerTriggerTextCompact, { color: colors.text }]} numberOfLines={1}>
                {timeOfDay}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Recurrence</Text>
        <SegmentedControl
          options={[
            { label: 'One-time', value: 'ONE_TIME' },
            { label: 'Daily', value: 'DAILY' },
            { label: 'Weekly', value: 'WEEKLY' },
            { label: 'Custom', value: 'CUSTOM' },
          ]}
          selectedValue={recurrence}
          onSelect={(val) => {
            const nextFreq = val as FrequencyType;
            setRecurrence(nextFreq);
            if (nextFreq === 'CUSTOM') {
              setIsCustomRecurrenceOpen(true);
            }
          }}
          style={{ marginBottom: recurrence === 'CUSTOM' ? 8 : 12 }}
        />

        {recurrence === 'CUSTOM' && (
          <TouchableOpacity
            style={[styles.customRuleBanner, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
            onPress={() => setIsCustomRecurrenceOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.customRuleLeft}>
              <MaterialIcons name="tune" size={17} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.customRuleTitle, { color: colors.text }]}>
                  {formatRecurrenceLabel('CUSTOM', customRule)}
                </Text>
                <Text style={[styles.customRuleSub, { color: colors.textMuted }]}>
                  Tap to customize interval, days & end date
                </Text>
              </View>
            </View>
            <View style={[styles.iconBadge, { backgroundColor: colors.primaryContainer }]}>
              <Text style={[styles.iconBadgeText, { color: colors.primaryDark }]}>Edit</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Collapsible Advanced Options (SIM & Throttle Delay) */}
        <TouchableOpacity
          style={[styles.advancedAccordionHeader, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
          onPress={() => setIsAdvancedOpen(!isAdvancedOpen)}
          activeOpacity={0.7}
        >
          <View style={styles.advancedAccordionLeft}>
            <MaterialIcons name="settings-suggest" size={16} color={colors.primary} />
            <Text style={[styles.advancedAccordionTitle, { color: colors.text }]}>
              Advanced Options
            </Text>
            <Text style={[styles.advancedAccordionSub, { color: colors.textMuted }]}>
              {isDualSim ? `SIM ${simSlot + 1} • ` : ''}{sendDelay}s delay
            </Text>
          </View>
          <MaterialIcons
            name={isAdvancedOpen ? 'expand-less' : 'expand-more'}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        {isAdvancedOpen && (
          <View style={[styles.advancedBox, { borderColor: colors.border }]}>
            {isDualSim && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Send via SIM</Text>
                <SegmentedControl
                  options={simOptions}
                  selectedValue={simSlot}
                  onSelect={setSimSlot}
                  style={{ marginBottom: 12 }}
                />
              </>
            )}

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Pacing delay between messages</Text>
            <SegmentedControl
              options={[
                { label: '5s', value: 5 },
                { label: '10s', value: 10 },
                { label: '15s', value: 15 },
                { label: '30s', value: 30 },
              ]}
              selectedValue={sendDelay}
              onSelect={(val) => setSendDelay(Number(val))}
              style={{ marginBottom: 4 }}
            />
          </View>
        )}

        {/* Non-blocking Carrier Safety Tip */}
        <View style={[styles.safetyTipBanner, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
          <MaterialIcons name="shield" size={16} color={colors.primary} style={{ marginTop: 1 }} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.safetyTipTitle, { color: colors.text }]}>Carrier safety note</Text>
            <Text style={[styles.safetyTipBody, { color: colors.textMuted }]}>
              {recipients.length > 20 && sendDelay <= 5
                ? 'High volume detected. A 10s–15s delay is recommended to avoid telecom carrier throttling.'
                : 'Telecom providers throttle rapid automated SMS. 10s+ intervals protect your SIM from spam filters.'}
            </Text>
          </View>
        </View>

      </Card>
      </ScrollView>

      {/* Docked Sticky Bottom CTA Bar in the Thumb Zone */}
      <View
        style={[
          styles.dockedBar,
          {
            backgroundColor: colors.surfaceCard,
            borderTopColor: colors.border,
            shadowColor: colors.primaryDark,
          },
        ]}
      >
        <View style={styles.dockedSummaryRow}>
          <View style={styles.dockedSummaryLeft}>
            <MaterialIcons name="textsms" size={15} color={colors.primary} />
            <Text style={[styles.dockedSummaryText, { color: colors.text }]}>
              {recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'}
              {message.trim() ? ` • ${smsMetrics.segmentCount} SMS` : ''}
            </Text>
          </View>
          <View style={[styles.dockedPill, { backgroundColor: colors.primaryContainer }]}>
            <Text style={[styles.dockedPillText, { color: colors.primaryDark }]}>
              {formatRecurrenceLabel(recurrence, customRule)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.ctaPrimary, { backgroundColor: colors.primary }]}
          onPress={handleScheduleCampaign}
          activeOpacity={0.8}
        >
          <MaterialIcons name="send" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.ctaText}>Schedule Campaign</Text>
        </TouchableOpacity>
      </View>

      <DatePickerModal
        visible={isDatePickerOpen}
        selectedDate={startDate}
        onSelect={(newDate) => setStartDate(newDate)}
        onClose={() => setIsDatePickerOpen(false)}
      />

      <TimePickerModal
        visible={isTimePickerOpen}
        selectedTime={timeOfDay}
        onSelect={(newTime) => setTimeOfDay(newTime)}
        onClose={() => setIsTimePickerOpen(false)}
      />

      <AddRecipientModal
        visible={isAddRecipientOpen}
        onClose={() => setIsAddRecipientOpen(false)}
        onAdd={(newRecipient) => setRecipients((prev) => [...prev, newRecipient])}
      />

      <ContactPickerModal
        visible={isContactPickerOpen}
        onClose={() => setIsContactPickerOpen(false)}
        onSelectContacts={handleAddContactsFromPicker}
        existingPhones={recipients.map((r) => r.phone)}
      />

      <CreateTemplateModal
        visible={isCreateTemplateOpen}
        onClose={() => setIsCreateTemplateOpen(false)}
        onSave={handleSaveCustomTemplate}
        initialDraft={message}
      />

      <TemplateManagerModal
        visible={isManageTemplatesOpen}
        templates={templatesList}
        onClose={() => setIsManageTemplatesOpen(false)}
        onSelectTemplate={(tmpl) => setMessage(tmpl.body)}
        onDeleteTemplate={handleDeleteTemplate}
        onCreateNew={() => {
          setIsManageTemplatesOpen(false);
          setIsCreateTemplateOpen(true);
        }}
      />

      <CustomRecurrenceModal
        visible={isCustomRecurrenceOpen}
        initialRule={customRule}
        startDate={startDate}
        onSave={(rule) => setCustomRule(rule)}
        onClose={() => setIsCustomRecurrenceOpen(false)}
      />

      <CampaignScheduledModal
        visible={isCelebrationOpen}
        campaignTitle={scheduledSummaryData.title}
        recipientsCount={scheduledSummaryData.recipientsCount}
        scheduledTimeText={scheduledSummaryData.timeText}
        frequencyText={scheduledSummaryData.frequencyText}
        sendDelay={scheduledSummaryData.delay}
        onViewTasks={() => {
          setIsCelebrationOpen(false);
          if (onNavigateToTasks) onNavigateToTasks();
        }}
        onClose={() => setIsCelebrationOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  pageTitleBlock: {
    paddingVertical: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  singleInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  templateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  manageTemplatesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  manageTemplatesLinkText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  microLabel: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  templateScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  templateChipNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  templateChipTextNew: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  templateChipText: {
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
  },
  tokenAndDraftRow: {
    marginTop: 8,
    gap: 8,
  },
  saveDraftLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  saveDraftLinkText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  msgBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Sora_400Regular',
    minHeight: 88,
    textAlignVertical: 'top',
    includeFontPadding: false,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
  },
  gaugeBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gaugeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gaugeCount: {
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  gaugeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  gaugeBadgeText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  meterTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    marginTop: 8,
    marginBottom: 4,
    includeFontPadding: false,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerTriggerCompact: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerTriggerTextCompact: {
    fontSize: 13,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
    flex: 1,
  },
  pickerTrigger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerTriggerText: {
    fontSize: 14,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
  },
  iconBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  iconBadgeText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  delayPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  delayChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  advancedAccordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  advancedAccordionTitle: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  advancedAccordionSub: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  advancedBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  recipientSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 4 : 8,
    gap: 8,
    marginBottom: 12,
  },
  recipientSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    paddingVertical: 0,
    includeFontPadding: false,
  },
  noMatchBox: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMatchText: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    fontStyle: 'italic',
    includeFontPadding: false,
  },
  expandBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  expandBtnText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  customRuleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  customRuleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customRuleTitle: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  customRuleSub: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    marginTop: 2,
    includeFontPadding: false,
  },
  safetyTipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  safetyTipTitle: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
    marginBottom: 2,
  },
  safetyTipBody: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    lineHeight: 16,
    includeFontPadding: false,
  },
  // Docked CTA Bar in Thumb Zone
  dockedBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  dockedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dockedSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dockedSummaryText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  dockedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  dockedPillText: {
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  ctaPrimary: {
    flexDirection: 'row',
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#002521',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  // Live SMS Preview Bubble
  previewSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewHeaderLabel: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  previewTargetText: {
    fontSize: 11,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  smsBubble: {
    maxWidth: '92%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    borderWidth: 1,
  },
  smsBubbleText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 10,
    fontFamily: 'Sora_500Medium',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  tokenResolvedText: {
    fontFamily: 'Sora_700Bold',
    textDecorationLine: 'underline',
  },
});
