import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { haptics } from '../../utils/haptics';

interface SegmentOption {
  label: string;
  value: string | number;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selectedValue: string | number;
  onSelect: (value: any) => void;
  style?: ViewStyle;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedValue,
  onSelect,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceSunken, borderColor: colors.border },
        style,
      ]}
    >
      {options.map((option) => {
        const isActive = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={String(option.value)}
            style={[
              styles.segmentButton,
              isActive && [styles.activeButton, { backgroundColor: colors.primary }],
            ]}
            onPress={() => {
              haptics.selection();
              onSelect(option.value);
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                { color: isActive ? '#ffffff' : colors.textMuted },
                isActive && styles.activeText,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    gap: 3,
  },
  segmentButton: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  activeButton: {
  },
  segmentText: {
    fontSize: 12.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  activeText: {
    fontFamily: 'Sora_700Bold',
  },
});

