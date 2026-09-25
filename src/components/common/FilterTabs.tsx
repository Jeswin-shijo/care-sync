import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';

interface FilterTabsProps {
  tabs: string[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  style?: ViewStyle;
  tabStyle?: ViewStyle;
  activeTabStyle?: ViewStyle;
  tabTextStyle?: TextStyle;
  activeTabTextStyle?: TextStyle;
  scrollable?: boolean;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  tabs,
  activeTab,
  onSelectTab,
  style,
  tabStyle,
  activeTabStyle,
  tabTextStyle,
  activeTabTextStyle,
  scrollable = true,
}) => {
  const content = (
    <>
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            activeOpacity={0.75}
            onPress={() => onSelectTab(tab)}
            style={[
              styles.tab,
              !scrollable && styles.fixedTab,
              tabStyle,
              isActive && [styles.activeTab, activeTabStyle],
            ]}
          >
            <Text
              style={[
                styles.tabText,
                tabTextStyle,
                isActive && [styles.activeTabText, activeTabTextStyle],
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </>
  );

  const containerStyle = StyleSheet.flatten([
    styles.wrapper,
    style,
    // Ensure generous bottom space is maintained even if parent sets small marginVertical
    {
      marginBottom: Math.max(
        spacing.md,
        ((style as any)?.marginBottom ?? (style as any)?.marginVertical ?? spacing.md)
      ),
    },
  ]);

  if (scrollable) {
    return (
      <View style={containerStyle}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scroll}
        >
          {content}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[containerStyle, styles.fixedContainer]}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: spacing.md,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    paddingVertical: 2,
    alignItems: 'center',
  },
  fixedContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    alignItems: 'center',
  },
  fixedTab: {
    flex: 1,
    paddingHorizontal: 6,
  },
  tab: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.semiBold,
  },
});
