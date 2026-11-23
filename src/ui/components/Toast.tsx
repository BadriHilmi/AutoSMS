import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';

export interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onDismiss: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  onDismiss,
  duration = 2600,
}) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
      translateY.setValue(-16);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -16,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const iconName =
    type === 'success'
      ? 'check-circle'
      : type === 'error'
      ? 'error'
      : type === 'warning'
      ? 'warning'
      : 'info';

  const iconColor =
    type === 'success'
      ? colors.success
      : type === 'error'
      ? colors.error
      : type === 'warning'
      ? colors.pending
      : colors.primary;

  const bgTone =
    type === 'success'
      ? colors.successBg
      : type === 'error'
      ? colors.errorBg
      : type === 'warning'
      ? colors.pendingBg
      : colors.primaryContainer;

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[
          styles.toastCard,
          {
            backgroundColor: colors.surfaceCard,
            borderColor: colors.border,
          },
        ]}
        onPress={handleDismiss}
        activeOpacity={0.9}
      >
        <MaterialIcons name={iconName} size={18} color={iconColor} />
        <Text style={[styles.toastText, { color: colors.text }]} numberOfLines={2}>
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: 56,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 99999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    maxWidth: 420,
    width: '100%',
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
});
