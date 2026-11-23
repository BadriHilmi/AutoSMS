import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  dotIcon?: string; // Legacy fallback
  headerRight?: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  iconName,
  dotIcon,
  headerRight,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceCard,
          borderColor: colors.border,
          borderRadius: colors.cardRadius,
        },
        style,
      ]}
    >
      {title && (
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            {iconName ? (
              <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name={iconName} size={16} color={colors.primaryDark} />
              </View>
            ) : dotIcon ? (
              <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.dotText, { color: colors.primaryDark }]}>{dotIcon}</Text>
              </View>
            ) : null}
            <Text style={[styles.titleText, { color: colors.text }]}>{title}</Text>
          </View>
          {headerRight}
        </View>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontSize: 12,
  },
  titleText: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
});

