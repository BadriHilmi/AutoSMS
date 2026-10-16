import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import { Schedule } from '../../db/schema';
import { SegmentedControl } from './SegmentedControl';
import { DatePickerModal, TimePickerModal } from './DateTimePickerModal';
import { calculateSmsSegments } from '../../domain/smsCounter';
import { AVAILABLE_TOKENS } from '../../domain/tokenizer';
import {
  FrequencyType,
  CustomRecurrenceRule,
  getNextRunTimestamp,
  parseCustomRule,
  formatRecurrenceLabel,
} from '../../domain/scheduler';
import { CustomRecurrenceModal } from './CustomRecurrenceModal';
import { useSimCards } from '../../hooks/useSimCards';
import { MaterialIcons } from '@expo/vector-icons';

interface EditTaskModalProps {
  visible: boolean;
  task: Schedule | null;
  onClose: () => void;
  onSave: (updatedTask: Schedule) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  visible,
  task,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();
  const { isDualSim, simOptions } = useSimCards();

  const [title, setTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [frequency, setFrequency] = useState<FrequencyType>('DAILY');
  const [customRule, setCustomRule] = useState<CustomRecurrenceRule | null>(null);
  const [isCustomRecurrenceOpen, setIsCustomRecurrenceOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [timeOfDay, setTimeOfDay] = useState('10:00 AM');
  const [simSlot, setSimSlot] = useState<number>(0);
  const [intervalDelaySec, setIntervalDelaySec] = useState<number>(10);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setMessageBody(task.messageBody);
      setFrequency((task.frequency as FrequencyType) || 'DAILY');
      setCustomRule(parseCustomRule(task.customRule));
      setStartDate(task.startDate ? new Date(task.startDate) : new Date());
      setTimeOfDay(task.timeOfDay || '10:00 AM');
      setSimSlot(task.simSlot ?? 0);
      setIntervalDelaySec(task.intervalDelaySec ?? 10);
    }
  }, [task, visible]);

  if (!task) return null;

  const smsMetrics = calculateSmsSegments(messageBody);

  const insertToken = (token: string) => {
    setMessageBody((prev) => `${prev} ${token}`);
  };

  const handleSave = () => {
    const effectiveDaysOfWeek = frequency === 'CUSTOM' && customRule?.daysOfWeek?.length
      ? customRule.daysOfWeek
      : [1, 2, 3, 4, 5];

    const runTimestamp = getNextRunTimestamp({
      frequency,
      startDateTimestamp: startDate.getTime(),
      timeOfDay,
      daysOfWeek: effectiveDaysOfWeek,
      customRule: frequency === 'CUSTOM' ? (customRule ?? undefined) : undefined,
    });

    const updated: Schedule = {
      ...task,
      title: title.trim() || task.title,
      messageBody: messageBody.trim() || task.messageBody,
      frequency,
      startDate: runTimestamp ?? task.startDate,
      timeOfDay,
      daysOfWeek: JSON.stringify(effectiveDaysOfWeek),
      customRule: frequency === 'CUSTOM' && customRule ? JSON.stringify(customRule) : null,
      simSlot,
      intervalDelaySec,
    };
    onSave(updated);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Campaign</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Update schedule settings & message
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
              <View style={[styles.closeBadge, { backgroundColor: colors.surfaceSunken }]}>
                <MaterialIcons name="close" size={18} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Campaign title</Text>
            <TextInput
              style={[
                styles.inputField,
                { borderColor: colors.border, backgroundColor: colors.surfaceSunken, color: colors.text },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Daily maintenance reminder"
              placeholderTextColor={colors.textMuted}
            />

            {/* Message Body */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Message body</Text>
            <TextInput
              style={[
                styles.msgInput,
                { borderColor: colors.border, backgroundColor: colors.surfaceSunken, color: colors.text },
              ]}
              multiline
              numberOfLines={4}
              value={messageBody}
              onChangeText={setMessageBody}
              placeholder="Enter message text..."
              placeholderTextColor={colors.textMuted}
            />

            {/* Token Chips */}
            <View style={styles.chipRow}>
              {AVAILABLE_TOKENS.map((t) => (
                <TouchableOpacity
                  key={t.token}
                  style={[styles.chip, { backgroundColor: colors.primaryContainer }]}
                  onPress={() => insertToken(t.token)}
                >
                  <Text style={[styles.chipText, { color: colors.primaryDark }]}>{t.token}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* SMS Metrics */}
            <View style={styles.charCountRow}>
              <Text style={[styles.countText, { color: colors.textMuted }]}>
                {smsMetrics.charCount} / {smsMetrics.encoding === 'GSM-7' ? 160 : 70} chars
              </Text>
              <Text style={[styles.countText, { color: colors.textMuted }]}>
                {smsMetrics.segmentCount} SMS {smsMetrics.segmentCount === 1 ? 'segment' : 'segments'} ({smsMetrics.encoding})
              </Text>
            </View>

            {/* Frequency */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Recurrence</Text>
            <SegmentedControl
              options={[
                { label: 'One-time', value: 'ONE_TIME' },
                { label: 'Daily', value: 'DAILY' },
                { label: 'Weekly', value: 'WEEKLY' },
                { label: 'Custom', value: 'CUSTOM' },
              ]}
              selectedValue={frequency}
              onSelect={(val) => {
                const nextFreq = val as FrequencyType;
                setFrequency(nextFreq);
                if (nextFreq === 'CUSTOM') {
                  setIsCustomRecurrenceOpen(true);
                }
              }}
              style={{ marginBottom: frequency === 'CUSTOM' ? 8 : 12 }}
            />

            {frequency === 'CUSTOM' && (
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

            {/* Date and Time Triggers */}
            <View style={styles.rowTwoCols}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Start date</Text>
                <TouchableOpacity
                  style={[styles.pickerTrigger, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
                  onPress={() => setIsDatePickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerTriggerText, { color: colors.text }]}>
                    {startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </Text>
                  <MaterialIcons name="calendar-today" size={15} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Send time</Text>
                <TouchableOpacity
                  style={[styles.pickerTrigger, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
                  onPress={() => setIsTimePickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerTriggerText, { color: colors.text }]}>
                    {timeOfDay}
                  </Text>
                  <MaterialIcons name="access-time" size={15} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* SIM Slot */}
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

            {/* Interval Delay */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Send delay between messages</Text>
            <SegmentedControl
              options={[
                { label: '5s', value: 5 },
                { label: '10s', value: 10 },
                { label: '15s', value: 15 },
                { label: '30s', value: 30 },
              ]}
              selectedValue={intervalDelaySec}
              onSelect={(val) => setIntervalDelaySec(Number(val))}
              style={{ marginBottom: 12 }}
            />

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.actionBtnRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.btnCancel, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSave, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.btnSaveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date and Time Picker Modals */}
        <DatePickerModal
          visible={isDatePickerOpen}
          selectedDate={startDate}
          onSelect={(d) => setStartDate(d)}
          onClose={() => setIsDatePickerOpen(false)}
        />

        <TimePickerModal
          visible={isTimePickerOpen}
          selectedTime={timeOfDay}
          onSelect={(t) => setTimeOfDay(t)}
          onClose={() => setIsTimePickerOpen(false)}
        />

        <CustomRecurrenceModal
          visible={isCustomRecurrenceOpen}
          initialRule={customRule}
          startDate={startDate}
          onSave={(rule) => setCustomRule(rule)}
          onClose={() => setIsCustomRecurrenceOpen(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    maxHeight: '90%',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    marginTop: 2,
  },
  closeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
    marginTop: 8,
    marginBottom: 6,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    fontFamily: 'Sora_400Regular',
    marginBottom: 8,
  },
  msgInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontFamily: 'Sora_400Regular',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },
  countText: {
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  pickerTrigger: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
  },
  delayPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  delayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delayText: {
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  btnCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
  },
  btnSave: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },
  customRuleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
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
    fontSize: 12.5,
    fontFamily: 'Sora_600SemiBold',
  },
  customRuleSub: {
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    marginTop: 2,
  },
  iconBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  iconBadgeText: {
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
  },
});
