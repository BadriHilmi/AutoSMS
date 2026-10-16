import React, { useState, useEffect, useMemo } from 'react';
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
import { StatusBadge } from '../components/StatusBadge';
import { getAllLogs, updateLogStatus } from '../../db/queries/logs';
import { MessageLog } from '../../db/schema';
import { MessageDetailModal } from '../components/MessageDetailModal';
import { MaterialIcons } from '@expo/vector-icons';
import { haptics } from '../../utils/haptics';

interface HistoryScreenProps {
  onNavigateToCompose?: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onNavigateToCompose }) => {
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
    haptics.impactMedium();
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

  // Group logs chronologically by Date
  const groupedLogs = useMemo(() => {
    const groups: { [dateLabel: string]: MessageLog[] } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    logsList.forEach((log) => {
      const d = new Date(log.sentAt);
      const dZero = new Date(d);
      dZero.setHours(0, 0, 0, 0);

      let label = '';
      if (dZero.getTime() === today.getTime()) {
        label = 'Today';
      } else if (dZero.getTime() === yesterday.getTime()) {
        label = 'Yesterday';
      } else {
        label = d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
      }

      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(log);
    });

    return Object.entries(groups).map(([dateLabel, items]) => ({
      dateLabel,
      items,
    }));
  }, [logsList]);

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
              onPress={() => {
                haptics.selection();
                setStatusFilter(f.key as any);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: isActive ? colors.primaryDark : colors.text },
                  isActive && styles.activeFilterText,
                ]}
              >
                {f.label} ({f.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* History Date Grouped List */}
      {logsList.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryContainer }]}>
            <MaterialIcons name="history" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No delivery records found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            {searchQuery
              ? 'No messages matched your filter or search query.'
              : 'Messages sent via automated campaigns or direct SMS will appear here with live delivery receipts.'}
          </Text>
          {onNavigateToCompose && (
            <TouchableOpacity
              style={[styles.emptyCtaBtn, { backgroundColor: colors.primary }]}
              onPress={onNavigateToCompose}
              activeOpacity={0.8}
            >
              <MaterialIcons name="edit" size={15} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCtaBtnText}>Compose New Message</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        groupedLogs.map(({ dateLabel, items }) => (
          <View key={dateLabel} style={styles.dateGroupSection}>
            <View style={styles.dateHeaderRow}>
              <Text style={[styles.dateHeaderText, { color: colors.textMuted }]}>
                {dateLabel.toUpperCase()}
              </Text>
              <Text style={[styles.dateHeaderCount, { color: colors.textSubtle }]}>
                {items.length} {items.length === 1 ? 'message' : 'messages'}
              </Text>
            </View>

            <View style={[styles.groupCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              {items.map((log, index) => {
                const isFailed = log.status === 'FAILED';
                const isLast = index === items.length - 1;

                return (
                  <View key={log.id}>
                    <TouchableOpacity
                      style={styles.logRow}
                      activeOpacity={0.7}
                      onPress={() => handleShowDetails(log)}
                    >
                      {/* Avatar with status tint */}
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: isFailed ? colors.errorBg : colors.primaryContainer },
                        ]}
                      >
                        <Text
                          style={[
                            styles.avatarText,
                            { color: isFailed ? colors.error : colors.primaryDark },
                          ]}
                        >
                          {(log.contactName || log.phoneNumber)[0].toUpperCase()}
                        </Text>
                      </View>

                      {/* Content column */}
                      <View style={styles.logInfo}>
                        <View style={styles.logTitleRow}>
                          <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
                            {log.contactName || log.phoneNumber}
                          </Text>
                          <Text style={[styles.timeText, { color: colors.textSubtle }]}>
                            {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>

                        <Text style={[styles.msgPreview, { color: colors.textMuted }]} numberOfLines={1}>
                          {log.messageContent}
                        </Text>

                        <View style={styles.metaRow}>
                          <View style={[styles.simTag, { backgroundColor: colors.surfaceSunken }]}>
                            <Text style={[styles.simTagText, { color: colors.textSubtle }]}>
                              SIM {log.simSlot + 1}
                            </Text>
                          </View>
                          {log.contactName ? (
                            <Text style={[styles.phoneSubText, { color: colors.textSubtle }]}>
                              {log.phoneNumber}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Status / Action column */}
                      <View style={styles.logRight}>
                        {isFailed ? (
                          <TouchableOpacity
                            style={[styles.retryBtn, { backgroundColor: colors.errorBg }]}
                            onPress={() => handleRetry(log)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialIcons name="refresh" size={13} color={colors.error} />
                            <Text style={[styles.retryText, { color: colors.error }]}>Retry</Text>
                          </TouchableOpacity>
                        ) : (
                          <StatusBadge status={log.status} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {!isLast && (
                      <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))
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
    paddingVertical: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 6 : 10,
    gap: 8,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
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
    marginBottom: 16,
  },
  filterPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  activeFilterText: {
    fontFamily: 'Sora_700Bold',
  },
  dateGroupSection: {
    marginBottom: 16,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  dateHeaderCount: {
    fontSize: 12,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  logInfo: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactName: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  msgPreview: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    lineHeight: 16,
    marginBottom: 4,
    includeFontPadding: false,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  simTagText: {
    fontSize: 11,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
  phoneSubText: {
    fontSize: 11,
    fontFamily: 'Sora_400Regular',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  logRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 11,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  },
  rowDivider: {
    height: 1,
    marginLeft: 62, // align with content next to avatar
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    marginBottom: 4,
    textAlign: 'center',
    includeFontPadding: false,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
    includeFontPadding: false,
    marginBottom: 16,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyCtaBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  },
});
