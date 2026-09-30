import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { getAllLogs, updateLogStatus } from '../../db/queries/logs';
import { MessageLog } from '../../db/schema';
import { MessageDetailModal } from '../components/MessageDetailModal';
import { MaterialIcons } from '@expo/vector-icons';

export const HistoryScreen: React.FC = () => {
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SENT' | 'FAILED'>('ALL');
  const [selectedLog, setSelectedLog] = useState<MessageLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [logsList, setLogsList] = useState<MessageLog[]>([]);

  const loadLogs = async () => {
    try {
      const logs = await getAllLogs(searchQuery, statusFilter);
      setLogsList(logs);
    } catch (e) {
      console.log('Failed to load logs:', e);
      setLogsList([]);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [searchQuery, statusFilter]);

  const handleRetry = async (log: MessageLog) => {
    try {
      await updateLogStatus(log.id, 'SENT', Date.now());
      setLogsList((prev) =>
        prev.map((l) => (l.id === log.id ? { ...l, status: 'SENT', errorReason: null } : l))
      );
      Alert.alert('Retrying', `Resending SMS to ${log.phoneNumber}...`);
    } catch (e) {
      console.log('Retry error:', e);
    }
  };

  const handleShowDetails = (log: MessageLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const totalSent = logsList.filter((l) => l.status === 'SENT' || l.status === 'DELIVERED').length;
  const totalFailed = logsList.filter((l) => l.status === 'FAILED').length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Page Title */}
      <View style={styles.pageTitleBlock}>
        <Text style={[styles.title, { color: colors.text }]}>History</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {totalSent} sent successfully • {totalFailed} failed
        </Text>
      </View>

      {/* Modern Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <MaterialIcons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name, number, or text..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <MaterialIcons name="cancel" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Fluid Filter Pills */}
      <View style={styles.filterRow}>
        {[
          { key: 'ALL', label: 'All Logs', count: logsList.length },
          { key: 'SENT', label: 'Sent', count: totalSent },
          { key: 'FAILED', label: 'Failed', count: totalFailed },
        ].map((f) => {
          const isActive = statusFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterPill,
                {
                  backgroundColor: isActive ? colors.primaryContainer : colors.surfaceCard,
                  borderColor: isActive ? colors.primaryLight : colors.border,
                },
              ]}
              onPress={() => setStatusFilter(f.key as any)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: isActive ? colors.primaryDark : colors.text },
                  isActive && styles.activeFilterText,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* History Cards List */}
      {logsList.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryContainer }]}>
            <MaterialIcons name="history" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No delivery records found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Messages sent via automated campaigns or direct SMS will appear here with live delivery receipts.
          </Text>
        </View>
      ) : (
        logsList.map((log) => {
          const isFailed = log.status === 'FAILED';
          return (
            <TouchableOpacity
              key={log.id}
              activeOpacity={0.85}
              onPress={() => handleShowDetails(log)}
            >
              <Card style={styles.historyCard}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <View style={[styles.avatar, { backgroundColor: isFailed ? colors.errorBg : colors.primaryContainer }]}>
                      <Text style={[styles.avatarText, { color: isFailed ? colors.error : colors.primaryDark }]}>
                        {(log.contactName || log.phoneNumber)[0].toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.contactName, { color: colors.text }]}>
                        {log.contactName || 'Recipient'}
                      </Text>
                      <Text style={[styles.numberText, { color: colors.textMuted }]}>
                        {log.phoneNumber}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge status={log.status} />
                </View>

                <View style={[styles.msgContainer, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
                  <Text style={[styles.msgPreview, { color: colors.text }]} numberOfLines={2}>
                    {log.messageContent}
                  </Text>
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.metaRow}>
                    <View style={styles.timeWrapper}>
                      <MaterialIcons name="schedule" size={13} color={colors.textMuted} />
                      <Text style={[styles.timeText, { color: colors.textMuted }]}>
                        {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={[styles.simTag, { backgroundColor: colors.surfaceSunken }]}>
                      <Text style={[styles.simTagText, { color: colors.textMuted }]}>
                        SIM {log.simSlot + 1}
                      </Text>
                    </View>
                  </View>

                  {isFailed ? (
                    <TouchableOpacity
                      style={[styles.actionBadge, { backgroundColor: colors.errorBg }]}
                      onPress={() => handleRetry(log)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <MaterialIcons name="refresh" size={14} color={colors.error} />
                      <Text style={[styles.actionText, { color: colors.error }]}>Retry</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.detailsBtn}>
                      <Text style={[styles.detailsText, { color: colors.primary }]}>Details</Text>
                      <MaterialIcons name="chevron-right" size={16} color={colors.primary} />
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })
      )}

      <MessageDetailModal
        visible={isDetailModalOpen}
        log={selectedLog}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedLog(null);
        }}
        onRetry={handleRetry}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pageTitleBlock: {
    paddingVertical: 10,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 4 : 8,
    gap: 8,
    marginBottom: 12,
    shadowColor: '#002521',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
    paddingVertical: 0,
    includeFontPadding: false,
  },
  clearBtn: {
    padding: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  activeFilterText: {
    fontFamily: 'Sora_700Bold',
  },
  historyCard: {
    marginBottom: 10,
    padding: 13,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  contactName: {
    fontSize: 13.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  numberText: {
    fontSize: 11.5,
    fontFamily: 'Sora_400Regular',
    marginTop: 1,
    includeFontPadding: false,
  },
  msgContainer: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 9,
    marginBottom: 8,
  },
  msgPreview: {
    fontSize: 12.5,
    fontFamily: 'Sora_400Regular',
    lineHeight: 18,
    includeFontPadding: false,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11.5,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  simTag: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  simTagText: {
    fontSize: 10.5,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 11.5,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  detailsText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 32,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontFamily: 'Sora_700Bold',
    marginBottom: 5,
    textAlign: 'center',
    includeFontPadding: false,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    includeFontPadding: false,
  },
});
