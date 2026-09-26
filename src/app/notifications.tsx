import React, { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { AppNotification } from '../data/mockData';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';
import { FadeInView, PressableScale, PulseDot, stagger } from '../components/common/Motion';
import { CountTabs, NoticeBanner } from '../components/shell/Controls';
import { notificationVisual } from '../components/shell/notificationVisual';
import { isToday, relativeTime, useNow } from '../components/shell/time';
import { useScrollBottomPadding } from '../components/shell/layout';
import { openRoute } from '../utils/navigation';

type Tab = 'All' | AppNotification['category'];
const TABS: Tab[] = ['All', 'Appointments', 'Billing', 'System'];

const EMPTY_COPY: Record<Tab, string> = {
  All: 'You are all caught up. Appointment, billing and system alerts will appear here.',
  Appointments: 'No appointment updates. New bookings, admissions and follow-ups will show up here.',
  Billing: 'No billing updates. Payments received and pending bills will show up here.',
  System: 'No system alerts. Lab results, drug-safety flags and ambulance updates will show up here.',
};

export default function NotificationsRoute() {
  const {
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearReadNotifications,
    settings,
    updateSettings,
  } = useApp();
  const { showToast } = useToast();
  const now = useNow(30000);
  const bottomPad = useScrollBottomPadding();
  const [tab, setTab] = useState<Tab>('All');

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { All: notifications.length, Appointments: 0, Billing: 0, System: 0 };
    notifications.forEach((n) => {
      c[n.category] += 1;
    });
    return c;
  }, [notifications]);

  const readCount = notifications.length - unreadCount;
  const tabUnread = notifications.filter((n) => !n.read && (tab === 'All' || n.category === tab)).length;

  const sections = useMemo(() => {
    const list = notifications
      .filter((n) => tab === 'All' || n.category === tab)
      .slice()
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    // Notifications without a timestamp are treated as new.
    const today = list.filter((n) => !n.createdAt || isToday(n.createdAt, now));
    const earlier = list.filter((n) => n.createdAt && !isToday(n.createdAt, now));
    return [
      { title: 'Today', data: today },
      { title: 'Earlier', data: earlier },
    ].filter((s) => s.data.length > 0);
  }, [notifications, tab, now]);

  // Position of each item across both sections, for the entrance stagger.
  const order = useMemo(() => new Map(sections.flatMap((s) => s.data).map((n, i) => [n.id, i])), [sections]);

  const openNotification = (n: AppNotification) => {
    if (!n.read) markNotificationAsRead(n.id);
    if (n.route) openRoute(n.route, n.params);
  };

  const markAll = () => {
    const count = unreadCount;
    markAllNotificationsAsRead();
    showToast({ type: 'success', message: `Marked ${count} notification${count === 1 ? '' : 's'} as read` });
  };

  const clearRead = () => {
    Alert.alert('Confirm clear', `Remove ${readCount} read notification${readCount === 1 ? '' : 's'}? Unread items stay.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear read',
        style: 'destructive',
        onPress: () => {
          clearReadNotifications();
          showToast({ type: 'info', message: `Cleared ${readCount} read notification${readCount === 1 ? '' : 's'}` });
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Notifications"
        subtitle={counts.All ? `${counts.All} notification${counts.All === 1 ? '' : 's'} • ${unreadCount ? `${unreadCount} new` : 'all caught up'}` : 'All caught up'}
        showBack
      />

      <View style={styles.topArea}>
        <CountTabs
          tabs={TABS.map((key) => ({ key, label: key, count: counts[key] }))}
          active={tab}
          onChange={setTab}
        />
        <View style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            {tabUnread > 0 ? <PulseDot color={colors.primary} size={6} /> : <Ionicons name="checkmark-done" size={14} color={colors.success} />}
            <Text style={styles.toolbarText} numberOfLines={1}>
              {tabUnread > 0 ? `${tabUnread} unread${tab === 'All' ? '' : ` in ${tab}`}` : 'No unread'}
            </Text>
          </View>
          <Pressable
            onPress={markAll}
            disabled={unreadCount === 0}
            hitSlop={8}
            style={[styles.toolbarBtn, unreadCount === 0 && styles.toolbarBtnDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: unreadCount === 0 }}
            accessibilityLabel="Mark all notifications as read"
          >
            <Ionicons name="checkmark-done-outline" size={15} color={colors.primary} />
            <Text style={styles.toolbarBtnText}>Mark all read</Text>
          </Pressable>
          <Pressable
            onPress={clearRead}
            disabled={readCount === 0}
            hitSlop={8}
            style={[styles.toolbarBtn, readCount === 0 && styles.toolbarBtnDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: readCount === 0 }}
            accessibilityLabel="Clear read notifications"
          >
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
            <Text style={[styles.toolbarBtnText, { color: colors.danger }]}>Clear read</Text>
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(n) => n.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
        ListHeaderComponent={
          !settings.notificationsEnabled ? (
            <NoticeBanner
              tone="warning"
              icon="notifications-off"
              title="Notifications are paused"
              message="You won't get alerts for new appointments, payments or critical results until you turn them back on."
              actionLabel="Turn on"
              onAction={() => {
                updateSettings({ notificationsEnabled: true });
                showToast({ type: 'success', message: 'Notifications turned on' });
              }}
              style={styles.banner}
            />
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>
            {section.title} <Text style={styles.sectionCount}>• {section.data.length}</Text>
          </Text>
        )}
        renderItem={({ item }) => {
          const v = notificationVisual(item);
          return (
            <FadeInView delay={stagger(order.get(item.id) ?? 0, 45, 360)} offset={10}>
              <PressableScale
                onPress={() => openNotification(item)}
                scaleTo={0.98}
                style={[styles.card, !item.read && styles.cardUnread]}
                accessibilityRole="button"
                accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.description}. ${relativeTime(item.createdAt, now, item.timestamp)}`}
                accessibilityHint={item.route ? 'Opens the related record' : 'Marks as read'}
              >
                <View style={[styles.iconBox, { backgroundColor: v.bg }]}>
                  <Ionicons name={v.icon} size={20} color={v.color} />
                </View>
                <View style={styles.content}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.time, !item.read && styles.timeUnread]}>{relativeTime(item.createdAt, now, item.timestamp)}</Text>
                  </View>
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
                {!item.read ? <View style={styles.unreadDot} /> : item.route ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
              </PressableScale>
            </FadeInView>
          );
        }}
        ListEmptyComponent={
          <FadeInView>
            <EmptyState
              icon="notifications-off-outline"
              title={tab === 'All' ? 'No notifications' : `No ${tab.toLowerCase()} notifications`}
              description={EMPTY_COPY[tab]}
              actionTitle={tab !== 'All' && counts.All > 0 ? 'Show all' : undefined}
              onActionPress={tab !== 'All' && counts.All > 0 ? () => setTab('All') : undefined}
            />
          </FadeInView>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topArea: {
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
  },
  toolbarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolbarText: {
    flexShrink: 1,
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
  },
  toolbarBtnDisabled: {
    opacity: 0.35,
  },
  toolbarBtnText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  banner: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionCount: {
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardUnread: {
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FAFF',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 0.5,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  titleUnread: {
    fontWeight: typography.fontWeights.bold,
  },
  time: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  timeUnread: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
  },
  desc: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
