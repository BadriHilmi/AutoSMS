import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';

export interface DeviceContact {
  id: string;
  name: string;
  phone: string;
}

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectContacts: (selected: Array<{ name: string; phone: string }>) => void;
  existingPhones?: string[];
}

export const ContactPickerModal: React.FC<ContactPickerModalProps> = ({
  visible,
  onClose,
  onSelectContacts,
  existingPhones = [],
}) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (visible) {
      loadContacts();
      setSearchQuery('');
      setSelectedIds(new Set());
    }
  }, [visible]);

  const loadContacts = async () => {
    setLoading(true);
    setPermissionDenied(false);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setContacts([]);
        setLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
        sort: Contacts.SortTypes.FirstName,
      });

      const parsed: DeviceContact[] = [];
      const seenPhones = new Set<string>();

      data.forEach((c) => {
        if (c.phoneNumbers && c.phoneNumbers.length > 0) {
          c.phoneNumbers.forEach((p, idx) => {
            const rawNumber = p.number?.trim();
            if (rawNumber && !seenPhones.has(rawNumber)) {
              seenPhones.add(rawNumber);
              parsed.push({
                id: c.id ? `${c.id}_${idx}` : `${rawNumber}_${idx}`,
                name: c.name || 'Unnamed Contact',
                phone: rawNumber,
              });
            }
          });
        }
      });

      setContacts(parsed);
    } catch (err) {
      console.warn('Failed to fetch device contacts:', err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().replace(/[\s\-\(\)]/g, '').includes(q.replace(/[\s\-\(\)]/g, ''))
    );
  }, [contacts, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const handleConfirmAdd = () => {
    const chosen = contacts
      .filter((c) => selectedIds.has(c.id))
      .map((c) => ({
        name: c.name,
        phone: c.phone,
      }));

    if (chosen.length > 0) {
      onSelectContacts(chosen);
    }
    onClose();
  };

  const renderItem = ({ item }: { item: DeviceContact }) => {
    const isSelected = selectedIds.has(item.id);
    const isAlreadyAdded = existingPhones.includes(item.phone);
    const initial = (item.name[0] || '?').toUpperCase();

    return (
      <TouchableOpacity
        style={[
          styles.contactRow,
          { borderBottomColor: colors.border },
          isSelected && { backgroundColor: colors.surfaceSunken },
        ]}
        onPress={() => toggleSelect(item.id)}
        activeOpacity={0.7}
      >
        {/* Contact Avatar */}
        <View style={[styles.avatarCircle, { backgroundColor: colors.primaryContainer }]}>
          <Text style={[styles.avatarText, { color: colors.primaryDark }]}>{initial}</Text>
        </View>

        {/* Name & Phone */}
        <View style={styles.contactDetails}>
          <View style={styles.nameRow}>
            <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {isAlreadyAdded && (
              <View style={[styles.alreadyBadge, { backgroundColor: colors.surfaceSunken }]}>
                <Text style={[styles.alreadyText, { color: colors.textMuted }]}>In List</Text>
              </View>
            )}
          </View>
          <Text style={[styles.contactPhone, { color: colors.textMuted }]}>{item.phone}</Text>
        </View>

        {/* Checkbox Icon */}
        <View style={styles.checkIconBox}>
          <MaterialIcons
            name={isSelected ? 'check-box' : 'check-box-outline-blank'}
            size={24}
            color={isSelected ? colors.primary : colors.textMuted}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.modalCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBadge, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="contacts" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Contacts</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Select contacts to add to this campaign
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
              <MaterialIcons name="search" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name or phone number..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="cancel" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sub-bar: Actions & Counter */}
          <View style={[styles.statusBar, { borderBottomColor: colors.border }]}>
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              Showing {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
              {selectedIds.size > 0 ? ` • ${selectedIds.size} selected` : ''}
            </Text>
            <TouchableOpacity onPress={handleSelectAll} activeOpacity={0.7} style={styles.selectAllBtn}>
              <Text style={[styles.selectAllText, { color: colors.primary }]}>
                {selectedIds.size > 0 && selectedIds.size === filteredContacts.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* List Content */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading contacts...</Text>
            </View>
          ) : filteredContacts.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialIcons name="person-search" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {permissionDenied ? 'Permission Needed' : 'No contacts found'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {permissionDenied
                  ? 'Please grant Contacts permission in Settings to select contacts.'
                  : searchQuery
                  ? `No results matching "${searchQuery}"`
                  : 'No phone contacts available.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              style={styles.contactList}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={15}
              maxToRenderPerBatch={20}
            />
          )}

          {/* Footer CTA */}
          <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.btnCancel, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btnAdd,
                { backgroundColor: selectedIds.size > 0 ? colors.primary : colors.surfaceSunken },
              ]}
              onPress={handleConfirmAdd}
              disabled={selectedIds.size === 0}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="person-add"
                size={18}
                color={selectedIds.size > 0 ? '#ffffff' : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.btnAddText,
                  { color: selectedIds.size > 0 ? '#ffffff' : colors.textMuted },
                ]}
              >
                Add Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  modalSubtitle: {
    fontSize: 11.5,
    fontFamily: 'Sora_400Regular',
    marginTop: 2,
    includeFontPadding: false,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 4 : 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    paddingVertical: 0,
    includeFontPadding: false,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  statusText: {
    fontSize: 11.5,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  selectAllBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  selectAllText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  contactList: {
    maxHeight: 360,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  contactDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactName: {
    fontSize: 13.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  alreadyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alreadyText: {
    fontSize: 9.5,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  contactPhone: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    marginTop: 2,
    includeFontPadding: false,
  },
  checkIconBox: {
    marginLeft: 10,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontFamily: 'Sora_700Bold',
    marginBottom: 4,
    includeFontPadding: false,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  btnCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  btnAdd: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#002521',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  btnAddText: {
    fontSize: 13,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
});
