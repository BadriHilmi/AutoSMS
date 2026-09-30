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
                <MaterialIcons name={iconName} size={15} color={colors.primaryDark} />
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
    marginBottom: 12,
    shadowColor: '#002521',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontSize: 13,
  },
  titleText: {
    fontSize: 15,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
});

