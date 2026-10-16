import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';
import {
  CustomRecurrenceRule,
  RecurrenceUnit,
  RecurrenceEndType,
  DAY_NAMES_SHORT,
  formatRecurrenceLabel,
} from '../../domain/scheduler';
import { DatePickerModal } from './DateTimePickerModal';

interface CustomRecurrenceModalProps {
  visible: boolean;
  initialRule?: CustomRecurrenceRule | null;
  startDate?: Date;
  onSave: (rule: CustomRecurrenceRule) => void;
  onClose: () => void;
}

export const CustomRecurrenceModal: React.FC<CustomRecurrenceModalProps> = ({
  visible,
  initialRule,
  startDate = new Date(),
  onSave,
  onClose,
}) => {
  const { colors } = useTheme();

  const [interval, setIntervalVal] = useState<number>(1);
  const [unit, setUnit] = useState<RecurrenceUnit>('WEEKS');
  const [selectedDays, setSelectedDays] = useState<number[]>([startDate.getDay()]);
  const [endType, setEndType] = useState<RecurrenceEndType>('NEVER');
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + 3);
    return d;
  });
  const [occurrenceCount, setOccurrenceCount] = useState<number>(5);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialRule) {
        setIntervalVal(Math.max(1, initialRule.interval || 1));
        setUnit(initialRule.unit || 'WEEKS');
        setSelectedDays(
          initialRule.daysOfWeek && initialRule.daysOfWeek.length > 0
            ? initialRule.daysOfWeek
            : [startDate.getDay()]
        );
        setEndType(initialRule.endType || 'NEVER');
        if (initialRule.endDate) {
          setEndDate(new Date(initialRule.endDate));
        }
        if (initialRule.occurrenceCount) {
          setOccurrenceCount(initialRule.occurrenceCount);
        }
      } else {
        setIntervalVal(1);
        setUnit('WEEKS');
        setSelectedDays([startDate.getDay()]);
        setEndType('NEVER');
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + 3);
        setEndDate(d);
        setOccurrenceCount(5);
      }
    }
  }, [visible, initialRule, startDate]);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayIndex)) {
        if (prev.length === 1) return prev; // Keep at least one day selected
        return prev.filter((d) => d !== dayIndex).sort((a, b) => a - b);
      } else {
        return [...prev, dayIndex].sort((a, b) => a - b);
      }
    });
  };

  const handleSelectWeekdays = () => setSelectedDays([1, 2, 3, 4, 5]);
  const handleSelectWeekends = () => setSelectedDays([0, 6]);
  const handleSelectAllDays = () => setSelectedDays([0, 1, 2, 3, 4, 5, 6]);

  const previewRule: CustomRecurrenceRule = useMemo(() => {
    return {
      interval,
      unit,
      daysOfWeek: unit === 'WEEKS' ? selectedDays : undefined,
      endType,
      endDate: endType === 'ON_DATE' ? endDate.getTime() : undefined,
      occurrenceCount: endType === 'AFTER_OCCURRENCES' ? occurrenceCount : undefined,
      currentOccurrence: initialRule?.currentOccurrence ?? 0,
    };
  }, [interval, unit, selectedDays, endType, endDate, occurrenceCount, initialRule]);

  const summaryText = useMemo(() => {
    return formatRecurrenceLabel('CUSTOM', previewRule);
  }, [previewRule]);

  const handleApply = () => {
    onSave(previewRule);
    onClose();
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Custom Recurrence</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Configure your custom automated repeat schedule
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <View style={[styles.closeBadge, { backgroundColor: colors.surfaceSunken }]}>
                <MaterialIcons name="close" size={18} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Section 1: Repeat Every [Number] [Unit] */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Repeat every</Text>
            <View style={styles.repeatRow}>
              {/* Stepper */}
              <View style={[styles.stepperContainer, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setIntervalVal((v) => Math.max(1, v - 1))}
                  disabled={interval <= 1}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="remove"
                    size={18}
                    color={interval <= 1 ? colors.border : colors.primaryDark}
                  />
                </TouchableOpacity>
                <View style={styles.stepperValueBox}>
                  <Text style={[styles.stepperValueText, { color: colors.text }]}>{interval}</Text>
                </View>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setIntervalVal((v) => Math.min(99, v + 1))}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="add" size={18} color={colors.primaryDark} />
                </TouchableOpacity>
              </View>

              {/* Unit Selector */}
              <View style={[styles.unitSelector, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
                {(['DAYS', 'WEEKS', 'MONTHS'] as RecurrenceUnit[]).map((u) => {
                  const isSel = unit === u;
                  const label = u === 'DAYS' ? (interval === 1 ? 'Day' : 'Days') :
                                u === 'WEEKS' ? (interval === 1 ? 'Week' : 'Weeks') :
                                (interval === 1 ? 'Month' : 'Months');
                  return (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.unitPill,
                        isSel && [styles.unitPillActive, { backgroundColor: colors.primaryContainer }],
                      ]}
                      onPress={() => setUnit(u)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.unitPillText,
                          { color: isSel ? colors.primaryDark : colors.textMuted },
                          isSel && styles.unitPillTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 2: Repeat on days (when unit is WEEKS) */}
            {unit === 'WEEKS' && (
              <View style={styles.daysSection}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Repeat on days</Text>
                <View style={styles.daysRow}>
                  {DAY_NAMES_SHORT.map((name, idx) => {
                    const isSel = selectedDays.includes(idx);
                    return (
                      <TouchableOpacity
                        key={name}
                        style={[
                          styles.dayCircle,
                          { borderColor: isSel ? colors.primary : colors.border },
                          isSel
                            ? { backgroundColor: colors.primary }
                            : { backgroundColor: colors.surfaceSunken },
                        ]}
                        onPress={() => toggleDay(idx)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayCircleText,
                            { color: isSel ? '#ffffff' : colors.text },
                          ]}
                        >
                          {name[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Day Quick Presets */}
                <View style={styles.dayPresetsRow}>
                  <TouchableOpacity
                    style={[styles.smallPresetChip, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
                    onPress={handleSelectWeekdays}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.smallPresetText, { color: colors.text }]}>Mon-Fri</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallPresetChip, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
                    onPress={handleSelectWeekends}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.smallPresetText, { color: colors.text }]}>Weekends</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallPresetChip, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
                    onPress={handleSelectAllDays}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.smallPresetText, { color: colors.text }]}>All 7 Days</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Section 3: Ends */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 14 }]}>Ends</Text>
            <View style={styles.endOptionsCol}>
              {/* Option 1: Never */}
              <TouchableOpacity
                style={[
                  styles.endOptionCard,
                  { borderColor: endType === 'NEVER' ? colors.primary : colors.border },
                  endType === 'NEVER' && { backgroundColor: colors.primaryContainer + '30' },
                ]}
                onPress={() => setEndType('NEVER')}
                activeOpacity={0.7}
              >
                <View style={styles.radioOuter}>
                  {endType === 'NEVER' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.endOptionLabel, { color: colors.text }]}>Never</Text>
                <Text style={[styles.endOptionSub, { color: colors.textMuted }]}>Repeats indefinitely</Text>
              </TouchableOpacity>

              {/* Option 2: On Date */}
              <TouchableOpacity
                style={[
                  styles.endOptionCard,
                  { borderColor: endType === 'ON_DATE' ? colors.primary : colors.border },
                  endType === 'ON_DATE' && { backgroundColor: colors.primaryContainer + '30' },
                ]}
                onPress={() => setEndType('ON_DATE')}
                activeOpacity={0.7}
              >
                <View style={styles.radioOuter}>
                  {endType === 'ON_DATE' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.endOptionLabel, { color: colors.text }]}>On date</Text>
                  <Text style={[styles.endOptionSub, { color: colors.textMuted }]}>
                    Ends on {endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                {endType === 'ON_DATE' && (
                  <TouchableOpacity
                    style={[styles.datePickBadge, { backgroundColor: colors.primaryContainer, borderColor: colors.primaryLight }]}
                    onPress={() => setIsEndDatePickerOpen(true)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="edit-calendar" size={14} color={colors.primaryDark} />
                    <Text style={[styles.datePickBadgeText, { color: colors.primaryDark }]}>Pick Date</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Option 3: After Occurrences */}
              <TouchableOpacity
                style={[
                  styles.endOptionCard,
                  { borderColor: endType === 'AFTER_OCCURRENCES' ? colors.primary : colors.border },
                  endType === 'AFTER_OCCURRENCES' && { backgroundColor: colors.primaryContainer + '30' },
                ]}
                onPress={() => setEndType('AFTER_OCCURRENCES')}
                activeOpacity={0.7}
              >
                <View style={styles.radioOuter}>
                  {endType === 'AFTER_OCCURRENCES' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.endOptionLabel, { color: colors.text }]}>After</Text>
                  <Text style={[styles.endOptionSub, { color: colors.textMuted }]}>
                    Stops after {occurrenceCount} {occurrenceCount === 1 ? 'time' : 'times'}
                  </Text>
                </View>
                {endType === 'AFTER_OCCURRENCES' && (
                  <View style={[styles.miniStepper, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={styles.miniStepperBtn}
                      onPress={() => setOccurrenceCount((c) => Math.max(1, c - 1))}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="remove" size={14} color={colors.primaryDark} />
                    </TouchableOpacity>
                    <Text style={[styles.miniStepperVal, { color: colors.text }]}>{occurrenceCount}</Text>
                    <TouchableOpacity
                      style={styles.miniStepperBtn}
                      onPress={() => setOccurrenceCount((c) => Math.min(99, c + 1))}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="add" size={14} color={colors.primaryDark} />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
              <View style={[styles.summaryIconBox, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="event-repeat" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryTitle, { color: colors.textMuted }]}>Schedule summary</Text>
                <Text style={[styles.summaryDetail, { color: colors.text }]}>
                  {summaryText}
                </Text>
              </View>
            </View>

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
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Text style={styles.btnSaveText}>Apply Recurrence</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker Modal for End Date */}
        <DatePickerModal
          visible={isEndDatePickerOpen}
          selectedDate={endDate}
          onSelect={(d) => setEndDate(d)}
          onClose={() => setIsEndDatePickerOpen(false)}
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    paddingTop: 14,
  },
  sectionLabel: {
    fontSize: 12.5,
    fontFamily: 'Sora_600SemiBold',
    marginBottom: 8,
  },
  repeatRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 4,
    height: 44,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueBox: {
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 15,
    fontFamily: 'Sora_700Bold',
  },
  unitSelector: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
    height: 44,
  },
  unitPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  unitPillActive: {},
  unitPillText: {
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
  },
  unitPillTextActive: {
    fontFamily: 'Sora_700Bold',
  },
  daysSection: {
    marginBottom: 10,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleText: {
    fontSize: 13,
    fontFamily: 'Sora_700Bold',
  },
  dayPresetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallPresetText: {
    fontSize: 11,
    fontFamily: 'Sora_500Medium',
  },
  endOptionsCol: {
    gap: 8,
    marginBottom: 14,
  },
  endOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#028090',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  endOptionLabel: {
    fontSize: 13.5,
    fontFamily: 'Sora_600SemiBold',
  },
  endOptionSub: {
    fontSize: 11.5,
    fontFamily: 'Sora_400Regular',
    marginTop: 1,
  },
  datePickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  datePickBadgeText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
  },
  miniStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 2,
    height: 32,
  },
  miniStepperBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStepperVal: {
    paddingHorizontal: 6,
    fontSize: 12.5,
    fontFamily: 'Sora_700Bold',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    marginBottom: 2,
  },
  summaryDetail: {
    fontSize: 12.5,
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
});
