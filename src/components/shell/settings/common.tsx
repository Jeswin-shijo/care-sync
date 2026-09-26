import React from 'react';
import { ScrollView, ScrollViewProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../context/ToastContext';
import { canAccess, ROLE_LABEL } from '../../../logic/access';
import { spacing } from '../../../constants/theme';
import { NoticeBanner } from '../Controls';
import { useScrollBottomPadding } from '../layout';

/** Standard scroll body for a settings page (gutters + safe bottom padding). */
export const SectionScroll: React.FC<ScrollViewProps & { children: React.ReactNode }> = ({ children, contentContainerStyle, ...rest }) => {
  const bottom = useScrollBottomPadding();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      {...rest}
      contentContainerStyle={[sectionStyles.scroll, { paddingBottom: bottom }, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );
};

/** Hospital-wide settings are editable by administrators only (RBAC). */
export const useHospitalEditAccess = () => {
  const { activeRole, setActiveRole } = useApp();
  const { showToast } = useToast();
  const canEdit = canAccess(activeRole, 'settings');
  const switchToAdmin = () => {
    setActiveRole('admin');
    showToast({ type: 'info', title: 'Switched to Administrator', message: 'You can now edit hospital settings. The switch is in the audit trail.' });
  };
  return { canEdit, roleLabel: ROLE_LABEL[activeRole], switchToAdmin };
};

export const ViewOnlyNotice: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const { canEdit, roleLabel, switchToAdmin } = useHospitalEditAccess();
  if (canEdit) return null;
  return (
    <NoticeBanner
      tone="warning"
      icon="lock-closed"
      title={`View only for ${roleLabel}`}
      message="Hospital-wide settings can only be changed by an Administrator."
      actionLabel="Switch to Administrator"
      onAction={switchToAdmin}
      style={[styles.notice, style]}
    />
  );
};

export const sectionStyles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
});

const styles = StyleSheet.create({
  notice: {
    marginBottom: spacing.md,
  },
});
