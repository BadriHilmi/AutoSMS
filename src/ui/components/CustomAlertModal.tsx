import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
  icon?: keyof typeof MaterialIcons.glyphMap;
  buttons?: AlertButton[];
  onDismiss: () => void;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  title,
  message,
  type,
  icon,
  buttons = [{ text: 'OK' }],
  onDismiss,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  // Derive smart type & icon if not explicitly provided
  const lowerTitle = title.toLowerCase();
  const lowerMsg = (message || '').toLowerCase();
  const hasDestructive = buttons.some((b) => b.style === 'destructive');

  let resolvedType: 'info' | 'success' | 'warning' | 'danger' = type || 'info';
  if (!type) {
    if (hasDestructive || lowerTitle.includes('delete') || lowerTitle.includes('failed') || lowerTitle.includes('error')) {
      resolvedType = 'danger';
    } else if (lowerTitle.includes('warning') || lowerTitle.includes('conflict') || lowerTitle.includes('battery') || lowerTitle.includes('optimization')) {
      resolvedType = 'warning';
    } else if (lowerTitle.includes('saved') || lowerTitle.includes('success') || lowerTitle.includes('created') || lowerTitle.includes('imported') || lowerTitle.includes('exported')) {
      resolvedType = 'success';
    }
  }

  let resolvedIcon: keyof typeof MaterialIcons.glyphMap = icon || 'info-outline';
  if (!icon) {
    if (resolvedType === 'danger') {
      resolvedIcon = lowerTitle.includes('delete') ? 'delete-outline' : 'error-outline';
    } else if (resolvedType === 'warning') {
      resolvedIcon = lowerTitle.includes('battery') ? 'battery-alert' : 'warning-amber';
    } else if (resolvedType === 'success') {
      resolvedIcon = 'check-circle-outline';
    } else if (lowerTitle.includes('run') || lowerTitle.includes('send')) {
      resolvedIcon = 'play-arrow';
    }
  }

  // Theme-aware colors for icon badge
  const iconBg =
    resolvedType === 'danger'
      ? colors.errorBg
      : resolvedType === 'warning'
      ? colors.pendingBg
      : resolvedType === 'success'
      ? colors.successBg
      : colors.primaryContainer;

  const iconColor =
    resolvedType === 'danger'
      ? colors.error
      : resolvedType === 'warning'
      ? colors.pending
      : resolvedType === 'success'
      ? colors.success
      : colors.primaryDark;

  const isMultiButton = buttons.length > 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceCard,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Icon Badge */}
              <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
                <MaterialIcons name={resolvedIcon} size={28} color={iconColor} />
              </View>

              {/* Title & Message */}
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {Boolean(message) && (
                <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
              )}

              {/* Buttons Row / Column */}
              <View style={[styles.buttonContainer, isMultiButton ? styles.buttonRow : styles.buttonSingle]}>
                {buttons.map((btn, idx) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';

                  let btnBg = colors.surfaceSunken;
                  let btnBorder = colors.border;
                  let textColor = colors.text;

                  if (isDestructive) {
                    btnBg = colors.error;
                    btnBorder = colors.error;
                    textColor = '#ffffff';
                  } else if (!isCancel && (isMultiButton || buttons.length === 1)) {
                    // Primary confirm button
                    btnBg = colors.primary;
                    btnBorder = colors.primary;
                    textColor = '#ffffff';
                  }

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.btn,
                        isMultiButton && styles.btnFlex,
                        {
                          backgroundColor: btnBg,
                          borderColor: btnBorder,
                        },
                      ]}
                      activeOpacity={0.75}
                      onPress={() => {
                        onDismiss();
                        if (btn.onPress) {
                          btn.onPress();
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          { color: textColor },
                          (isDestructive || !isCancel) && styles.btnTextBold,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16.5,
    fontFamily: 'Sora_700Bold',
    textAlign: 'center',
    marginBottom: 8,
    includeFontPadding: false,
  },
  message: {
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    includeFontPadding: false,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonSingle: {
    flexDirection: 'column',
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  btnFlex: {
    flex: 1,
  },
  btnText: {
    fontSize: 13.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  btnTextBold: {
    fontFamily: 'Sora_700Bold',
  },
});
