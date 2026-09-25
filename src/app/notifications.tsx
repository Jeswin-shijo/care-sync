import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { FilterTabs } from '../components/common/FilterTabs';
import { EmptyState } from '../components/common/EmptyState';

export default function NotificationsRoute() {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useApp();

  const [activeTab, setActiveTab] = useState('All');

  const filteredNotifications = notifications.filter(
    (n) => activeTab === 'All' || n.category === activeTab
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Appointments':
        return { name: 'calendar' as const, color: '#1E6BFF', bg: '#EFF6FF' };
      case 'Billing':
        return { name: 'cash' as const, color: '#10B981', bg: '#ECFDF5' };
      default:
        return { name: 'notifications' as const, color: '#8B5CF6', bg: '#F5F3FF' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Notifications"
        showBack
        rightAction={
          <TouchableOpacity onPress={markAllNotificationsAsRead} style={styles.markReadBtn}>
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        }
      />

      <FilterTabs
        tabs={['All', 'Appointments', 'Billing', 'System']}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        style={styles.filterTabs}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="No Notifications"
            description="You are all caught up! No alerts in this category."
          />
        ) : (
          filteredNotifications.map((notif) => {
            const iconConfig = getCategoryIcon(notif.category);
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notifCard, !notif.read && styles.notifCardUnread]}
                activeOpacity={0.8}
                onPress={() => markNotificationAsRead(notif.id)}
              >
                <View style={[styles.iconBox, { backgroundColor: iconConfig.bg }]}>
                  <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
                </View>

                <View style={styles.contentCol}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.titleText, !notif.read && styles.titleTextUnread]}>
                      {notif.title}
                    </Text>
                    <Text style={styles.timeText}>{notif.timestamp}</Text>
                  </View>
                  <Text style={styles.descText}>{notif.description}</Text>
                </View>

                {!notif.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  markReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markReadText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
  },
  filterTabs: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    ...shadows.sm,
  },
  notifCardUnread: {
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
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  titleTextUnread: {
    fontWeight: typography.fontWeights.bold,
  },
  timeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  descText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
