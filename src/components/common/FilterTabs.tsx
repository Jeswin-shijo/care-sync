import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';

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
            activeOpacity={0.8}
            onPress={() => onSelectTab(tab)}
            style={[
              styles.tab,
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

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, style]}
      >
        {content}
      </ScrollView>
    );
  }

  return <ScrollView horizontal={false} style={[styles.fixedContainer, style]}>{content}</ScrollView>;
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  fixedContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
  },
});
