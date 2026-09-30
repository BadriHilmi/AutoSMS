import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';

interface RecipientRowProps {
  label: string;
  subLabel?: string;
  onRemove?: () => void;
}

export const RecipientRow: React.FC<RecipientRowProps> = ({ label, subLabel, onRemove }) => {
  const { colors } = useTheme();
  const initial = (subLabel || label || 'C')[0].toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
      <View style={[styles.avatarBadge, { backgroundColor: colors.primaryContainer }]}>
        <Text style={[styles.avatarText, { color: colors.primaryDark }]}>{initial}</Text>
      </View>
      <View style={styles.textWrapper}>
        <Text style={[styles.labelText, { color: colors.text }]} numberOfLines={1}>
          {subLabel || 'Contact'}
        </Text>
        <Text style={[styles.subLabelText, { color: colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.removeBtn, { backgroundColor: colors.surfaceCard }]}
          activeOpacity={0.7}
        >
          <MaterialIcons name="close" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 7,
    borderWidth: 1,
    gap: 10,
  },
  avatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  textWrapper: {
    flex: 1,
  },
  labelText: {
    fontSize: 13.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  subLabelText: {
    fontSize: 12,
    marginTop: 1,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

