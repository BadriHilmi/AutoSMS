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
import { useSimCards } from '../../hooks/useSimCards';
import { useAppSettings } from '../../context/AppSettingsContext';
import { MaterialIcons } from '@expo/vector-icons';

export const ComposeScreen: React.FC<{ onNavigateToTasks?: () => void }> = ({ onNavigateToTasks }) => {
  const { colors } = useTheme();
  const { isDualSim, simOptions } = useSimCards();

  const [campaignTitle, setCampaignTitle] = useState('');
  const [message, setMessage] = useState('');
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
  const { sendDelay, setSendDelay } = useAppSettings();

  const smsMetrics = calculateSmsSegments(message);

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
        timestamp: runTimestamp,
        message: message,
        recipientsJson: JSON.stringify(recipients),
        intervalDelaySec: sendDelay,
        simSlot: simSlot,
        frequency: recurrence,
        customRule: customRuleStr || undefined,
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
          message: message,
          recipientsJson: JSON.stringify(recipients),
          intervalDelaySec: sendDelay,
          simSlot: simSlot,
          frequency: recurrence,
          customRule: customRuleStr || undefined,
        });
      } catch (runErr) {
        console.log('Direct run error:', runErr);
      }
    }

    const formattedTime = new Date(runTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    Alert.alert('Campaign Scheduled', `Your SMS campaign has been scheduled for ${formattedTime}!`, [
      { text: 'View Tasks', onPress: onNavigateToTasks },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Page Title */}
      <View style={styles.pageTitleBlock}>
        <Text style={[styles.title, { color: colors.text }]}>New campaign</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Compose, select contacts, and set automated schedule.
        </Text>
      </View>

      {/* Campaign Details Card */}
      <Card title="Campaign Info" iconName="campaign">
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Campaign Title</Text>
        <TextInput
          style={[
            styles.singleInput,
            { backgroundColor: colors.surfaceSunken, borderColor: colors.border, color: colors.text },
          ]}
          value={campaignTitle}
          onChangeText={setCampaignTitle}
          placeholder="e.g. Scheduled System Maintenance"
          placeholderTextColor={colors.textMuted}
        />
      </Card>

      {/* Message Card */}
      <Card title="Message" iconName="edit-note">
        {/* Templates Header */}
        <View style={styles.templateSectionHeader}>
          <Text style={[styles.microLabel, { color: colors.textMuted }]}>TEMPLATES</Text>
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
            <Text style={[styles.actionBtnText, { color: colors.primaryDark }]}>Add Single</Text>
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

      {/* Schedule Card */}
      <Card title="Schedule" iconName="schedule">
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Start date</Text>
        <TouchableOpacity
          style={[styles.pickerTrigger, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
          onPress={() => setIsDatePickerOpen(true)}
          activeOpacity={0.7}
        >
          <View style={styles.pickerLeft}>
            <MaterialIcons name="calendar-today" size={18} color={colors.primary} />
            <Text style={[styles.pickerTriggerText, { color: colors.text }]}>
              {startDate.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={[styles.iconBadge, { backgroundColor: colors.primaryContainer }]}>
            <Text style={[styles.iconBadgeText, { color: colors.primaryDark }]}>Change</Text>
          </View>
        </TouchableOpacity>

        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Send time</Text>
        <TouchableOpacity
          style={[styles.pickerTrigger, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
          onPress={() => setIsTimePickerOpen(true)}
          activeOpacity={0.7}
        >
          <View style={styles.pickerLeft}>
            <MaterialIcons name="access-time" size={18} color={colors.primary} />
            <Text style={[styles.pickerTriggerText, { color: colors.text }]}>
              {timeOfDay}
            </Text>
          </View>
          <View style={[styles.iconBadge, { backgroundColor: colors.primaryContainer }]}>
            <Text style={[styles.iconBadgeText, { color: colors.primaryDark }]}>Change</Text>
          </View>
        </TouchableOpacity>

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

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Send delay between messages</Text>
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
            <Text style={[styles.safetyTipTitle, { color: colors.text }]}>Carrier Safety Tip</Text>
            <Text style={[styles.safetyTipBody, { color: colors.textMuted }]}>
              {recipients.length > 20 && sendDelay <= 5
                ? 'High volume detected. A 10s–15s delay is recommended to avoid telecom carrier throttling.'
                : 'Telecom providers throttle rapid automated SMS. 10s+ intervals protect your SIM from spam filters.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.ctaPrimary, { backgroundColor: colors.primary, marginTop: 12 }]}
          onPress={handleScheduleCampaign}
          activeOpacity={0.8}
        >
          <MaterialIcons name="send" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.ctaText}>Schedule Campaign</Text>
        </TouchableOpacity>
      </Card>

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
    lineHeight: 18,
    includeFontPadding: false,
  },
  singleInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13.5,
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
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  manageTemplatesLinkText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  microLabel: {
    fontSize: 10.5,
    fontFamily: 'Sora_600SemiBold',
    letterSpacing: 0.5,
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
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  templateChipTextNew: {
    fontSize: 11.5,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  templateChipText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  tokenAndDraftRow: {
    marginTop: 10,
    gap: 8,
  },
  saveDraftLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 3,
  },
  saveDraftLinkText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  msgBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
    fontFamily: 'Sora_400Regular',
    minHeight: 90,
    textAlignVertical: 'top',
    includeFontPadding: false,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  gaugeBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
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
    fontSize: 12.5,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  gaugeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  gaugeBadgeText: {
    fontSize: 10.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  meterTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
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
    gap: 5,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 4,
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
    marginBottom: 6,
    includeFontPadding: false,
  },
  pickerTrigger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerTriggerText: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  iconBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  iconBadgeText: {
    fontSize: 11.5,
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
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 6,
  },
  advancedAccordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  advancedAccordionTitle: {
    fontSize: 12.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  advancedAccordionSub: {
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  advancedBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  ctaPrimary: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#002521',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  moreNote: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  recipientSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 4 : 8,
    gap: 8,
    marginBottom: 10,
  },
  recipientSearchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    paddingVertical: 0,
    includeFontPadding: false,
  },
  noMatchBox: {
    paddingVertical: 14,
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
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  customRuleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customRuleTitle: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  customRuleSub: {
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    marginTop: 2,
    includeFontPadding: false,
  },
  safetyTipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  safetyTipTitle: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
    marginBottom: 2,
  },
  safetyTipBody: {
    fontSize: 10.5,
    fontFamily: 'Sora_400Regular',
    lineHeight: 14.5,
    includeFontPadding: false,
  },
});
