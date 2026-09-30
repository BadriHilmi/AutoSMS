import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  selectedDate,
  onSelect,
  onClose,
}) => {
  const { colors, typography } = useTheme();

  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [tempDate, setTempDate] = useState(selectedDate);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handleDayPress = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day, tempDate.getHours(), tempDate.getMinutes());
    setTempDate(newDate);
  };

  const handleQuickSelect = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
    setTempDate(d);
  };

  const handleConfirm = () => {
    onSelect(tempDate);
    onClose();
  };

  const isSelected = (day: number) => {
    return (
      tempDate.getDate() === day &&
      tempDate.getMonth() === currentMonth &&
      tempDate.getFullYear() === currentYear
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Start Date</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Quick Preset Chips */}
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={[styles.presetChip, { backgroundColor: colors.primaryContainer }]}
              onPress={() => handleQuickSelect(0)}
            >
              <Text style={[styles.presetText, { color: colors.primaryDark }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, { backgroundColor: colors.primaryContainer }]}
              onPress={() => handleQuickSelect(1)}
            >
              <Text style={[styles.presetText, { color: colors.primaryDark }]}>Tomorrow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, { backgroundColor: colors.primaryContainer }]}
              onPress={() => handleQuickSelect(7)}
            >
              <Text style={[styles.presetText, { color: colors.primaryDark }]}>+1 Week</Text>
            </TouchableOpacity>
          </View>

          {/* Month Navigation */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <MaterialIcons name="chevron-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthYearText, { color: colors.text }]}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <MaterialIcons name="chevron-right" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day of Week Labels */}
          <View style={styles.weekLabelsRow}>
            {DAY_LABELS.map((lbl, idx) => (
              <Text key={idx} style={[styles.weekLabelText, { color: colors.textMuted }]}>
                {lbl}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty_${i}`} style={styles.dayCell} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const active = isSelected(day);
              return (
                <TouchableOpacity
                  key={`day_${day}`}
                  style={[
                    styles.dayCell,
                    active && [styles.activeDayCell, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => handleDayPress(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: active ? '#ffffff' : colors.text },
                      active && styles.activeDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.btnConfirm, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.btnConfirmText}>
              Set Date ({tempDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

interface TimePickerModalProps {
  visible: boolean;
  selectedTime: string; // e.g. "10:00 AM"
  onSelect: (timeStr: string) => void;
  onClose: () => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  selectedTime,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();

  const [isPM, setIsPM] = useState(selectedTime.toUpperCase().includes('PM'));
  const initialHour = parseInt(selectedTime.replace(/[^0-9:]/g, '').split(':')[0] || '10', 10);
  const initialMinute = parseInt(selectedTime.replace(/[^0-9:]/g, '').split(':')[1] || '0', 10);

  const [hour, setHour] = useState(initialHour > 12 ? initialHour - 12 : initialHour === 0 ? 12 : initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  const hoursList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const presets = [
    '09:00 AM',
    '10:00 AM',
    '02:00 PM',
    '05:00 PM',
  ];

  const handleConfirm = () => {
    const minStr = minute < 10 ? `0${minute}` : `${minute}`;
    const hrStr = hour < 10 ? `0${hour}` : `${hour}`;
    const result = `${hrStr}:${minStr} ${isPM ? 'PM' : 'AM'}`;
    onSelect(result);
    onClose();
  };

  const handlePresetSelect = (preset: string) => {
    onSelect(preset);
    onClose();
  };

  const formattedTime = `${hour < 10 ? `0${hour}` : hour}:${minute < 10 ? `0${minute}` : minute} ${isPM ? 'PM' : 'AM'}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Send Time</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Live Preview Display */}
          <View style={[styles.timePreviewCard, { backgroundColor: colors.surfaceSunken }]}>
            <TouchableOpacity onPress={() => setMode('hour')} style={[styles.timePartBtn, mode === 'hour' && { borderColor: colors.primary, borderWidth: 2 }]}>
              <Text style={[styles.timeLargeText, { color: mode === 'hour' ? colors.primary : colors.text }]}>
                {hour < 10 ? `0${hour}` : hour}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.timeColon, { color: colors.text }]}>:</Text>
            <TouchableOpacity onPress={() => setMode('minute')} style={[styles.timePartBtn, mode === 'minute' && { borderColor: colors.primary, borderWidth: 2 }]}>
              <Text style={[styles.timeLargeText, { color: mode === 'minute' ? colors.primary : colors.text }]}>
                {minute < 10 ? `0${minute}` : minute}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.ampmSwitchCompact}>
              <TouchableOpacity
                style={[styles.ampmBtnSmall, !isPM && { backgroundColor: colors.primary }]}
                onPress={() => setIsPM(false)}
              >
                <Text style={[styles.ampmTextSmall, { color: !isPM ? '#ffffff' : colors.textMuted }]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ampmBtnSmall, isPM && { backgroundColor: colors.primary }]}
                onPress={() => setIsPM(true)}
              >
                <Text style={[styles.ampmTextSmall, { color: isPM ? '#ffffff' : colors.textMuted }]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsRow}>
            {presets.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.presetChip, { backgroundColor: colors.primaryContainer }]}
                onPress={() => handlePresetSelect(p)}
              >
                <Text style={[styles.presetText, { color: colors.primaryDark }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selector Grid */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {mode === 'hour' ? 'Pick Hour (1 - 12)' : 'Pick Minute'}
          </Text>
          
          <View style={styles.gridContainer}>
            {mode === 'hour'
              ? hoursList.map((h) => {
                  const active = hour === h;
                  return (
                    <TouchableOpacity
                      key={`hour_${h}`}
                      style={[
                        styles.gridCell,
                        { borderColor: colors.border, backgroundColor: colors.surfaceSunken },
                        active && [styles.activeGridCell, { backgroundColor: colors.primary, borderColor: colors.primary }],
                      ]}
                      onPress={() => {
                        setHour(h);
                        setMode('minute'); // automatically jump to minute for fluid UX
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.gridCellText, { color: active ? '#ffffff' : colors.text }, active && styles.activeGridCellText]}>
                        {h < 10 ? `0${h}` : h}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              : minutesList.map((m) => {
                  const active = minute === m;
                  return (
                    <TouchableOpacity
                      key={`min_${m}`}
                      style={[
                        styles.gridCell,
                        { borderColor: colors.border, backgroundColor: colors.surfaceSunken },
                        active && [styles.activeGridCell, { backgroundColor: colors.primary, borderColor: colors.primary }],
                      ]}
                      onPress={() => setMinute(m)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.gridCellText, { color: active ? '#ffffff' : colors.text }, active && styles.activeGridCellText]}>
                        {m < 10 ? `0${m}` : m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
          </View>

          {/* Mode Switch Helper */}
          <View style={styles.modeSwitchRow}>
            <TouchableOpacity onPress={() => setMode('hour')}>
              <Text style={[styles.modeSwitchText, { color: mode === 'hour' ? colors.primary : colors.textMuted }]}>
                ● Hours
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('minute')}>
              <Text style={[styles.modeSwitchText, { color: mode === 'minute' ? colors.primary : colors.textMuted }]}>
                ● Minutes
              </Text>
            </TouchableOpacity>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.btnConfirm, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.btnConfirmText}>
              Set Time ({formattedTime})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  presetText: {
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  navBtn: {
    padding: 4,
  },
  monthYearText: {
    fontSize: 14.5,
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },
  weekLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekLabelText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
    width: 38,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  activeDayCell: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  dayText: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
  },
  activeDayText: {
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },
  btnConfirm: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnConfirmText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },
  timePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  timePartBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeLargeText: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },
  timeColon: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: -4,
  },
  ampmSwitchCompact: {
    flexDirection: 'column',
    gap: 3,
    marginLeft: 6,
  },
  ampmBtnSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ampmTextSmall: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
    marginBottom: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  gridCell: {
    width: '23%',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGridCell: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  gridCellText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
  },
  activeGridCellText: {
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },
  modeSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  modeSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Sora_600SemiBold',
  },
});
