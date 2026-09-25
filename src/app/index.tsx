import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '../constants/theme';
import { HOSPITAL_CONFIG } from '../constants/config';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const handleGetStarted = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>CareSync</Text>
          <Text style={styles.brandSubtitle}>Hospital Management System</Text>
          <Text style={styles.brandMotto}>Better Care. Smarter Tomorrow.</Text>
        </View>

        {/* 3D Hospital Graphic Card */}
        <View style={styles.illustrationCard}>
          <LinearGradient
            colors={['#E0F2FE', '#BAE6FD', '#7DD3FC']}
            style={styles.buildingContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Sky */}
            <View style={styles.skyArea}>
              <View style={[styles.cloud, { top: 20, left: 30 }]} />
              <View style={[styles.cloud, { top: 35, right: 40, width: 60 }]} />
            </View>

            {/* Building structure */}
            <View style={styles.buildingWrapper}>
              <View style={styles.buildingMain}>
                <View style={styles.buildingRoof}>
                  <View style={styles.heliPad}>
                    <Text style={styles.heliText}>H</Text>
                  </View>
                </View>
                <View style={styles.hospitalLogoSign}>
                  <Ionicons name="medical" size={20} color="#1E6BFF" />
                  <Text style={styles.signText}>CITY CARE HOSPITAL</Text>
                </View>
                {/* Windows Grid */}
                <View style={styles.windowsGrid}>
                  {[...Array(12)].map((_, i) => (
                    <View key={i} style={styles.windowItem} />
                  ))}
                </View>
                <View style={styles.entranceDoor}>
                  <View style={styles.doorGlass} />
                </View>
              </View>
            </View>

            {/* Trees & Lawn */}
            <View style={styles.groundLawn}>
              <View style={styles.treeCircle} />
              <View style={[styles.treeCircle, { left: 40 }]} />
              <View style={[styles.treeCircle, { right: 20 }]} />
              <View style={styles.roadStripe} />
            </View>
          </LinearGradient>
        </View>

        {/* Bottom Action Area */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, '#165BEB']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerTagline}>Secure • Reliable • All-in-One</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  brandMotto: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    marginTop: 6,
  },
  illustrationCard: {
    width: '100%',
    height: width * 0.85,
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginVertical: spacing.md,
  },
  buildingContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  skyArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  cloud: {
    position: 'absolute',
    width: 48,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  buildingWrapper: {
    alignItems: 'center',
    zIndex: 2,
  },
  buildingMain: {
    width: width * 0.65,
    height: 200,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingTop: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  buildingRoof: {
    position: 'absolute',
    top: -16,
    width: 70,
    height: 16,
    backgroundColor: '#E2E8F0',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heliPad: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heliText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  hospitalLogoSign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 10,
  },
  signText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  windowsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '85%',
    gap: 8,
  },
  windowItem: {
    width: '21%',
    height: 22,
    backgroundColor: '#93C5FD',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  entranceDoor: {
    position: 'absolute',
    bottom: 0,
    width: 44,
    height: 32,
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorGlass: {
    width: 32,
    height: 24,
    backgroundColor: '#60A5FA',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    opacity: 0.8,
  },
  groundLawn: {
    height: 36,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  treeCircle: {
    position: 'absolute',
    top: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
  },
  roadStripe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#475569',
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  getStartedButton: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.md + 1,
    fontWeight: typography.fontWeights.bold,
  },
  buttonIcon: {
    marginLeft: spacing.sm,
  },
  footerTagline: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
    letterSpacing: 0.5,
  },
});
