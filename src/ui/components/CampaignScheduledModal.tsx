import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { haptics } from '../../utils/haptics';

interface CampaignScheduledModalProps {
  visible: boolean;
  campaignTitle: string;
  recipientsCount: number;
  scheduledTimeText: string;
  frequencyText: string;
  sendDelay: number;
  onViewTasks: () => void;
  onClose: () => void;
}

export const CampaignScheduledModal: React.FC<CampaignScheduledModalProps> = ({
  visible,
  campaignTitle,
  recipientsCount,
  scheduledTimeText,
  frequencyText,
  sendDelay,
  onViewTasks,
  onClose,
}) => {
  const { colors } = useTheme();

  const animFade = useRef(new Animated.Value(0)).current;
  const animSlide = useRef(new Animated.Value(100)).current;
  const animScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      haptics.notificationSuccess();

      Animated.parallel([
        Animated.timing(animFade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(animSlide, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.spring(animScale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      animFade.setValue(0);
      animSlide.setValue(100);
      animScale.setValue(0.5);
    }
  }, [visible, animFade, animSlide, animScale]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: animFade }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.surfaceCard,
                  borderColor: colors.border,
                  transform: [{ translateY: animSlide }],
                },
              ]}
            >
              {/* Handle bar */}
              <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

              {/* Celebratory Icon with halo */}
              <Animated.View
                style={[
                  styles.iconHalo,
                  {
                    backgroundColor: colors.primaryContainer,
                    transform: [{ scale: animScale }],
                  },
                ]}
              >
                <View style={[styles.iconInner, { backgroundColor: colors.primary }]}>
                  <MaterialIcons name="check" size={28} color="#ffffff" />
                </View>
              </Animated.View>

              {/* Header Title & Subtitle */}
              <Text style={[styles.title, { color: colors.text }]}>Campaign Scheduled!</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Your automated SMS dispatch is locked and ready.
              </Text>

              {/* Summary Breakdown Box */}
              <View
                style={[
                  styles.summaryBox,
                  { backgroundColor: colors.surfaceSunken, borderColor: colors.border },
                ]}
              >
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Campaign</Text>
                  <Text style={[styles.summaryVal, { color: colors.text }]} numberOfLines={1}>
                    {campaignTitle || 'SMS Campaign'}
                  </Text>
                </View>

                <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Recipients</Text>
                  <Text style={[styles.summaryVal, { color: colors.text }]}>
                    {recipientsCount} {recipientsCount === 1 ? 'contact' : 'contacts'}
                  </Text>
                </View>

                <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Send Time</Text>
                  <Text style={[styles.summaryVal, { color: colors.primaryDark }]}>
                    {scheduledTimeText}
                  </Text>
                </View>

                <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Frequency</Text>
                  <View style={[styles.badgePill, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={[styles.badgePillText, { color: colors.primaryDark }]}>
                      {frequencyText}
                    </Text>
                  </View>
                </View>

                <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Throttle Delay</Text>
                  <Text style={[styles.summaryVal, { color: colors.textMuted }]}>
                    {sendDelay}s per message
                  </Text>
                </View>
              </View>

              {/* Action Buttons in Thumb Zone */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  haptics.impactMedium();
                  onClose();
                  onViewTasks();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>View in Tasks</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                onPress={() => {
                  haptics.selection();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Done</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 20, 18, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: 'center',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  iconHalo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Sora_700Bold',
    marginBottom: 4,
    textAlign: 'center',
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Sora_400Regular',
    textAlign: 'center',
    marginBottom: 16,
    includeFontPadding: false,
  },
  summaryBox: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
  },
  summaryVal: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    maxWidth: '60%',
  },
  rowDivider: {
    height: 1,
    width: '100%',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgePillText: {
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  primaryBtn: {
    flexDirection: 'row',
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  secondaryBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
});
