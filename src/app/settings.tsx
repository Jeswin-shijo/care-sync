import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { HOSPITAL_CONFIG } from '../constants/config';
import { Header } from '../components/common/Header';

export default function SettingsRoute() {
  const [pushEnabled, setPushEnabled] = useState(true);

  const handleProfilePress = () => {
    Alert.alert(
      HOSPITAL_CONFIG.name,
      `Address: ${HOSPITAL_CONFIG.address}\nGSTIN: ${HOSPITAL_CONFIG.gstin}\nPhone: ${HOSPITAL_CONFIG.phone}\nEmail: ${HOSPITAL_CONFIG.email}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  const handleBillingPress = () => {
    Alert.alert(
      'Billing & GST Settings',
      'Configured: Standard 18% GST on room suites above ₹5,000. Exempt on OPD consultation fees and essential medicines.',
      [{ text: 'OK' }]
    );
  };

  const handleBranchPress = () => {
    Alert.alert(
      'Hospital Branches',
      '1. City Care Main Multispecialty (Kakkanad, Kochi - Active)\n2. City Care Clinic (Marine Drive, Kochi - Active)',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Settings" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hospital Settings Section */}
        <Text style={styles.sectionHeader}>Hospital Settings</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.settingItem} onPress={handleProfilePress}>
            <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="business" size={18} color="#1E6BFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Hospital Profile</Text>
              <Text style={styles.settingSub}>Name, address, GST, logo</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/receipt-templates')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="receipt" size={18} color="#8B5CF6" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Receipt Templates</Text>
              <Text style={styles.settingSub}>Customize templates & numbering</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingItem} onPress={handleBillingPress}>
            <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="card" size={18} color="#10B981" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Billing Settings</Text>
              <Text style={styles.settingSub}>Tax, GST, payment methods</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() =>
              Alert.alert(
                'Departments',
                'General Medicine, Cardiology, Orthopedics, Gynecology, Pediatrics, Dermatology, ICU, Pathology, Radiology.'
              )
            }
          >
            <View style={[styles.iconBox, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="medical" size={18} color="#F59E0B" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Departments</Text>
              <Text style={styles.settingSub}>Manage departments & services</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() =>
              Alert.alert(
                'Users & Staff Roles',
                '1. Dr. Priya Menon (Chief Medical Officer / Admin)\n2. Dr. Arjun Nair (Consultant Cardiologist)\n3. Staff Nurse Desk (OPD Billing & Triage)'
              )
            }
          >
            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="people" size={18} color="#6366F1" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Users & Roles</Text>
              <Text style={styles.settingSub}>Staff access & permissions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingItem} onPress={handleBranchPress}>
            <View style={[styles.iconBox, { backgroundColor: '#F0FDFA' }]}>
              <Ionicons name="git-branch" size={18} color="#0D9488" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Branches</Text>
              <Text style={styles.settingSub}>Multi-branch management</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* App Settings Section */}
        <Text style={styles.sectionHeader}>App Settings</Text>
        <View style={styles.cardGroup}>
          <View style={styles.settingItem}>
            <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="notifications" size={18} color="#1E6BFF" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingSub}>Payment alerts, appointment reminders</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={pushEnabled ? colors.primary : '#FFFFFF'}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() =>
              Alert.alert('Language', 'CareSync currently operates in English (US/UK). Regional Indian languages support in roadmap.')
            }
          >
            <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="globe" size={18} color="#64748B" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Language</Text>
              <Text style={styles.settingSub}>English (Default)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() =>
              Alert.alert(
                'Help & Support',
                '24/7 CareSync SaaS Technical Desk: support@caresync.health\nToll Free: 1800 234 5678'
              )
            }
          >
            <View style={[styles.iconBox, { backgroundColor: '#FDF2F8' }]}>
              <Ionicons name="help-buoy" size={18} color="#EC4899" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Help & Support</Text>
              <Text style={styles.settingSub}>Documentation, chat support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* App Version Info */}
        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>CareSync SaaS v1.0.0 (Build 57)</Text>
          <Text style={styles.versionSub}>Google DeepMind Agentic Edition • Cloud Ready</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  settingSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 56,
  },
  versionFooter: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  versionText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.textSecondary,
  },
  versionSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
