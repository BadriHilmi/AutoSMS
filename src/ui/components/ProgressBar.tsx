import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, style }) => {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceSunken }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
            backgroundColor: colors.primary,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
    marginVertical: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
});
