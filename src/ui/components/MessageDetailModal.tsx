import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme';
import { MessageLog } from '../../db/schema';
import { StatusBadge } from './StatusBadge';
import { MaterialIcons } from '@expo/vector-icons';

interface MessageDetailModalProps {
  visible: boolean;
  log: MessageLog | null;
  onClose: () => void;
  onRetry?: (log: MessageLog) => void;
}

export const MessageDetailModal: React.FC<MessageDetailModalProps> = ({
  visible,
  log,
  onClose,
  onRetry,
}) => {
  const { colors } = useTheme();

  if (!log) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.avatarText, { color: colors.primaryDark }]}>
                  {(log.contactName || log.phoneNumber)[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>
                  {log.contactName || 'Recipient'}
                </Text>
                <Text style={[styles.phoneSub, { color: colors.textMuted }]}>
                  {log.phoneNumber}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 10 }}>
            {/* Status & SIM banner */}
            <View style={[styles.infoBanner, { backgroundColor: colors.surfaceSunken }]}>
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Delivery Status</Text>
                <View style={{ marginTop: 4 }}>
                  <StatusBadge status={log.status as any} />
                </View>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Carrier SIM</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  SIM {log.simSlot + 1}
                </Text>
              </View>
            </View>

            {/* Error banner if failed */}
            {log.errorReason && (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorBg }]}>
                <MaterialIcons name="error-outline" size={18} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {log.errorReason}
                </Text>
              </View>
            )}

            {/* Message Content */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Message Sent</Text>
            <View
              style={[
                styles.messageBox,
                { backgroundColor: colors.surfaceSunken, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.messageText, { color: colors.text }]}>
                {log.messageContent}
              </Text>
            </View>

            {/* Timeline */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>Timeline</Text>
            <View style={[styles.timelineCard, { backgroundColor: colors.surfaceSunken }]}>
              <View style={styles.timelineRow}>
                <Text style={[styles.timelineKey, { color: colors.textMuted }]}>Sent Time</Text>
                <Text style={[styles.timelineVal, { color: colors.text }]}>
                  {new Date(log.sentAt).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </Text>
              </View>

              {log.deliveredAt && (
                <View style={[styles.timelineRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }]}>
                  <Text style={[styles.timelineKey, { color: colors.textMuted }]}>Delivered</Text>
                  <Text style={[styles.timelineVal, { color: colors.success }]}>
                    {new Date(log.deliveredAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {log.status === 'FAILED' && onRetry && (
              <TouchableOpacity
                style={[styles.btnRetry, { backgroundColor: colors.primary }]}
                onPress={() => {
                  onClose();
                  onRetry(log);
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="refresh" size={18} color="#ffffff" />
                <Text style={styles.btnRetryText}>Retry Sending</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btnClose, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnCloseText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#002521',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Sora_700Bold',
  },
  title: {
    fontSize: 15,
    fontFamily: 'Sora_700Bold',
  },
  phoneSub: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: 'Sora_500Medium',
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  messageBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  messageText: {
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    lineHeight: 19,
  },
  timelineCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineKey: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
  },
  timelineVal: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  btnRetry: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnRetryText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontFamily: 'Sora_700Bold',
  },
  btnClose: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCloseText: {
    fontSize: 13.5,
    fontFamily: 'Sora_600SemiBold',
  },
});
