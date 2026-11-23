import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import { useAlert } from '../../context/AlertContext';
import { MaterialIcons } from '@expo/vector-icons';

interface AddRecipientModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (recipient: { name: string; phone: string }) => void;
}

export const AddRecipientModal: React.FC<AddRecipientModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleAdd = () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 3) {
      showAlert('Invalid Number', 'Please enter a valid phone number.', undefined, 'warning');
      return;
    }

    onAdd({
      name: name.trim() || 'Manual Contact',
      phone: cleanPhone,
    });

    setName('');
    setPhone('');
    onClose();
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="person-add" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Add Recipient</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <View style={styles.content}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Contact Name (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceSunken, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Contact name (optional)"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>Phone Number</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceSunken, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Enter phone number..."
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
          </View>

          {/* Action Buttons */}
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.btnCancel, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnAdd, { backgroundColor: colors.primary }]}
              onPress={handleAdd}
              activeOpacity={0.8}
            >
              <Text style={styles.btnAddText}>Add Recipient</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxWidth: 420,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Sora_700Bold',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 13.5,
    fontFamily: 'Sora_600SemiBold',
  },
  btnAdd: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAddText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontFamily: 'Sora_700Bold',
  },
});
