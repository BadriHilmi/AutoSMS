import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';

export type TabKey = 'compose' | 'tasks' | 'history' | 'settings';

interface BottomNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

interface NavTabItemProps {
  tabKey: TabKey;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  isActive: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

const NavTabItem: React.FC<NavTabItemProps> = ({
  label,
  icon,
  isActive,
  onPress,
  colors,
}) => {
  const animValue = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    const anim = Animated.timing(animValue, {
      toValue: isActive ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => {
      anim.stop();
    };
  }, [isActive, animValue]);

  // Smooth pill scale animation (0.75 -> 1.0)
  const pillScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });

  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <View style={styles.iconContainer}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicatorPill,
            {
              backgroundColor: colors.primaryContainer,
              opacity: animValue,
              transform: [{ scale: pillScale }],
            },
          ]}
        />
        <MaterialIcons
          name={icon}
          size={21}
          color={isActive ? colors.primary : colors.textMuted}
        />
      </View>

      <Text
        style={[
          styles.navLabel,
          { color: isActive ? colors.primary : colors.textMuted },
          isActive && styles.activeNavLabel,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

import { haptics } from '../../utils/haptics';

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const { colors } = useTheme();

  const tabs: { key: TabKey; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
    { key: 'compose', label: 'Compose', icon: 'edit' },
    { key: 'tasks', label: 'Tasks', icon: 'playlist-play' },
    { key: 'history', label: 'History', icon: 'history' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceCard,
          borderTopColor: colors.border,
        },
      ]}
    >
      {tabs.map((tab) => (
        <NavTabItem
          key={tab.key}
          tabKey={tab.key}
          label={tab.label}
          icon={tab.icon}
          isActive={activeTab === tab.key}
          onPress={() => {
            haptics.selection();
            onTabChange(tab.key);
          }}
          colors={colors}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 6,
  },
  navItem: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 4,
  },
  iconContainer: {
    width: 52,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  indicatorPill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
  },
  navLabel: {
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
    textAlign: 'center',
    includeFontPadding: false,
  },
  activeNavLabel: {
    fontFamily: 'Sora_600SemiBold',
  },
});
