import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';

export type BadgeStatus = 'SENT' | 'FAILED' | 'RUNNING' | 'SCHEDULED' | 'PAUSED' | 'PENDING' | 'DELIVERED' | 'COMPLETED';

interface StatusBadgeProps {
  status: BadgeStatus | string;
  customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, customLabel }) => {
  const { colors } = useTheme();

  const getStatusConfig = (): {
    bg: string;
    text: string;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  } => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return {
          bg: colors.successBg,
          text: colors.success,
          label: customLabel || 'Completed',
          icon: 'check-circle',
        };
      case 'SENT':
      case 'DELIVERED':
        return {
          bg: colors.successBg,
          text: colors.success,
          label: customLabel || 'Sent',
          icon: 'check-circle',
        };
      case 'FAILED':
        return {
          bg: colors.errorBg,
          text: colors.error,
          label: customLabel || 'Failed',
          icon: 'error-outline',
        };
      case 'RUNNING':
        return {
          bg: colors.successBg,
          text: colors.success,
          label: customLabel || 'Running',
          icon: 'sync',
        };
      case 'SCHEDULED':
      case 'PENDING':
        return {
          bg: colors.pendingBg,
          text: colors.pending,
          label: customLabel || 'Scheduled',
          icon: 'schedule',
        };
      case 'PAUSED':
      default:
        return {
          bg: colors.pausedBg,
          text: colors.paused,
          label: customLabel || 'Paused',
          icon: 'pause-circle-filled',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <MaterialIcons name={config.icon} size={13} color={config.text} style={styles.icon} />
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    gap: 4,
  },
  icon: {
    marginRight: 1,
  },
  badgeText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
});

