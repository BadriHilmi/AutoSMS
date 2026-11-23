import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { useSimCards } from '../../hooks/useSimCards';
import { MaterialIcons } from '@expo/vector-icons';

interface HeaderProps {
  onSettingsPress?: () => void;
  showSettingsIcon?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsPress, showSettingsIcon = false }) => {
  const { colors } = useTheme();
  const { isDualSim, simCards, singleSimLabel } = useSimCards();

  const simBadgeText = isDualSim
    ? 'Dual SIM'
    : (simCards.length > 0 ? singleSimLabel : 'SIM Ready');

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.brand}>
        <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
          <MaterialIcons name="textsms" size={16} color="#ffffff" />
        </View>
        <Text style={[styles.brandName, { color: colors.primaryDark }]}>AutoSMS</Text>
      </View>

      <View style={styles.headerRight}>
        <View style={[styles.simBadge, { backgroundColor: colors.primaryContainer, borderColor: colors.primaryLight }]}>
          <MaterialIcons name="sim-card" size={13} color={colors.primary} />
          <Text style={[styles.simBadgeText, { color: colors.primaryDark }]}>
            {simBadgeText}
          </Text>
        </View>

        {showSettingsIcon && (
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
            onPress={onSettingsPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="settings" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center', 
  },
  brandName: {
    fontSize: 17,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  simBadgeText: {
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
});

