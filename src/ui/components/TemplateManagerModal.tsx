import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme';
import { MaterialIcons } from '@expo/vector-icons';
import { Template } from '../../db/schema';

interface TemplateManagerModalProps {
  visible: boolean;
  templates: Template[];
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
  onDeleteTemplate: (id: string) => Promise<void> | void;
  onCreateNew: () => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  visible,
  templates,
  onClose,
  onSelectTemplate,
  onDeleteTemplate,
  onCreateNew,
}) => {
  const { colors } = useTheme();

  const handleDelete = (item: Template) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDeleteTemplate(item.id);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete template.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconCircle, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="format-list-bulleted" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Manage Templates</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
                  Preview, use, or remove saved templates
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Sub-bar: Count & New Template Action */}
          <View style={styles.subBar}>
            <View style={[styles.countBadge, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
              <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>
                {templates.length} {templates.length === 1 ? 'template' : 'templates'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primaryContainer, borderColor: colors.primaryLight }]}
              onPress={onCreateNew}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={16} color={colors.primaryDark} />
              <Text style={[styles.addBtnText, { color: colors.primaryDark }]}>New Template</Text>
            </TouchableOpacity>
          </View>

          {/* Template List */}
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {templates.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
                <MaterialIcons name="dashboard-customize" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No templates saved</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Create your first custom message template for fast reuse.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyCta, { backgroundColor: colors.primary }]}
                  onPress={onCreateNew}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyCtaText}>Create Template</Text>
                </TouchableOpacity>
              </View>
            ) : (
              templates.map((item) => (
                <View
                  key={item.id}
                  style={[styles.itemCard, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.titleWithIcon}>
                      <MaterialIcons name="assignment" size={15} color={colors.primary} />
                      <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      style={[styles.deleteBtn, { backgroundColor: colors.errorBg }]}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.itemBody, { color: colors.textMuted }]} numberOfLines={3}>
                    {item.body}
                  </Text>

                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={[styles.useBtn, { backgroundColor: colors.primaryContainer, borderColor: colors.primaryLight }]}
                      onPress={() => {
                        onSelectTemplate(item);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="check-circle" size={14} color={colors.primaryDark} />
                      <Text style={[styles.useBtnText, { color: colors.primaryDark }]}>Use Template</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer close button */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.doneBtnText, { color: colors.text }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    paddingBottom: 12,
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
  subBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  listScroll: {
    maxHeight: 380,
    marginVertical: 4,
  },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontFamily: 'Sora_700Bold',
    marginTop: 8,
    marginBottom: 4,
    includeFontPadding: false,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    includeFontPadding: false,
  },
  emptyCta: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyCtaText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    lineHeight: 17,
    marginBottom: 10,
    includeFontPadding: false,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  useBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  useBtnText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  sheetFooter: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  doneBtn: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
});
