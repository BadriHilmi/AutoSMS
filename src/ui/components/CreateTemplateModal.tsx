import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme';
import { useAlert } from '../../context/AlertContext';
import { MaterialIcons } from '@expo/vector-icons';
import { AVAILABLE_TOKENS } from '../../domain/tokenizer';
import { calculateSmsSegments } from '../../domain/smsCounter';

interface CreateTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, body: string) => Promise<void> | void;
  initialDraft?: string;
}

export const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  visible,
  onClose,
  onSave,
  initialDraft = '',
}) => {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setBody(initialDraft || '');
    }
  }, [visible, initialDraft]);

  const insertToken = (token: string) => {
    setBody((prev) => (prev ? `${prev} ${token}` : token));
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedBody = body.trim();

    if (!trimmedName) {
      showAlert('Missing Name', 'Please enter a name for this template.', undefined, 'warning');
      return;
    }

    if (!trimmedBody) {
      showAlert('Missing Message', 'Please enter the message body for this template.', undefined, 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(trimmedName, trimmedBody);
      setName('');
      setBody('');
      onClose();
    } catch (e: any) {
      showAlert('Error', e?.message || 'Could not save template.', undefined, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const smsMetrics = calculateSmsSegments(body);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconCircle, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="bookmark-add" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>New Custom Template</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
                  Save reusable message template
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {/* Template Name */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Template name</Text>
            <TextInput
              style={[
                styles.singleInput,
                { backgroundColor: colors.surfaceSunken, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="e.g. Generator Load Test"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={40}
              autoFocus={visible}
            />

            {/* Quick Draft Option */}
            {initialDraft.trim().length > 0 && body !== initialDraft && (
              <TouchableOpacity
                style={[styles.useDraftBtn, { backgroundColor: colors.primaryContainer }]}
                onPress={() => setBody(initialDraft)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="content-copy" size={14} color={colors.primaryDark} />
                <Text style={[styles.useDraftText, { color: colors.primaryDark }]}>
                  Copy current message text from compose box
                </Text>
              </TouchableOpacity>
            )}

            {/* Message Body */}
            <View style={styles.messageLabelRow}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Message body</Text>
              <Text style={[styles.counterText, { color: colors.textMuted }]}>
                {smsMetrics.charCount} chars • {smsMetrics.segmentCount} SMS
              </Text>
            </View>

            <TextInput
              style={[
                styles.msgInput,
                { backgroundColor: colors.surfaceSunken, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Notice: Scheduled maintenance will occur on {Date} at {Time}..."
              placeholderTextColor={colors.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={4}
            />

            {/* Token Chips */}
            <Text style={[styles.microLabel, { color: colors.textMuted }]}>Insert variable tags</Text>
            <View style={styles.tokensRow}>
              {AVAILABLE_TOKENS.map((item) => (
                <TouchableOpacity
                  key={item.token}
                  style={[styles.tokenChip, { backgroundColor: colors.primaryContainer }]}
                  onPress={() => insertToken(item.token)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tokenText, { color: colors.primaryDark }]}>{item.token}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <MaterialIcons name="check" size={16} color="#ffffff" />
              <Text style={styles.saveBtnText}>
                {isSubmitting ? 'Saving...' : 'Save Template'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#002521',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  sheetSubtitle: {
    fontSize: 11.5,
    fontFamily: 'Sora_400Regular',
    marginTop: 1,
    includeFontPadding: false,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontFamily: 'Sora_600SemiBold',
    marginBottom: 6,
    includeFontPadding: false,
  },
  messageLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  counterText: {
    fontSize: 10.5,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
  },
  singleInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13.5,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  useDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  useDraftText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  msgInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
    fontFamily: 'Sora_400Regular',
    minHeight: 100,
    textAlignVertical: 'top',
    includeFontPadding: false,
  },
  microLabel: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    marginTop: 12,
    marginBottom: 6,
    includeFontPadding: false,
  },
  tokensRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  tokenChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tokenText: {
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  saveBtn: {
    flex: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
});
