import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing, typography } from '../constants/theme';
import { HOSPITAL_CONFIG } from '../constants/config';
import { FadeInView, PressableScale, useReducedMotion } from '../components/common/Motion';
import { SplashIllustration } from '../components/shell/SplashIllustration';

export default function SplashScreen() {
  const { hospitalProfile } = useApp();
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const compact = height < 700;

  // Logo pops in (scale + fade) before the staggered text and illustration.
  const logo = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      logo.setValue(1);
      return;
    }
    const a = Animated.spring(logo, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 10 });
    a.start();
    return () => a.stop();
  }, [reduced]);

  const logoSize = compact ? 48 : 60;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#FFFFFF', '#F3F8FF', '#E8F1FF']} style={StyleSheet.absoluteFill} />
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.brand}>
          <Animated.View
            style={[
              styles.logoBadge,
              { width: logoSize, height: logoSize, borderRadius: logoSize * 0.3 },
              {
                opacity: logo,
                transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
              },
            ]}
          >
            <Ionicons name="add" size={logoSize * 0.6} color="#FFFFFF" />
          </Animated.View>
          <FadeInView delay={160}>
            <Text style={[styles.brandTitle, compact && styles.brandTitleCompact]} accessibilityRole="header">
              CareSync
            </Text>
          </FadeInView>
          <FadeInView delay={260}>
            <Text style={styles.brandSubtitle}>Hospital Management System</Text>
          </FadeInView>
          <FadeInView delay={340}>
            <Text style={styles.brandMotto}>{HOSPITAL_CONFIG.motto}</Text>
          </FadeInView>
        </View>

        <FadeInView delay={420} offset={40} duration={560} style={styles.illustrationWrap}>
          <SplashIllustration hospitalName={hospitalProfile.name} style={styles.illustration} />
        </FadeInView>

        <FadeInView delay={620} style={styles.actions}>
          <PressableScale
            haptic
            scaleTo={0.96}
            onPress={() => router.replace('/(tabs)')}
            style={styles.ctaShadow}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
            accessibilityHint={`Opens the ${hospitalProfile.name} dashboard`}
          >
            <LinearGradient
              colors={[colors.primary, '#165BEB']}
              style={styles.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </PressableScale>
          <Text style={styles.footerTagline}>Secure • Reliable • All-in-One</Text>
        </FadeInView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
  },
  containerCompact: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  brand: {
    alignItems: 'center',
  },
  logoBadge: {
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
    fontSize: 34,
    fontWeight: typography.fontWeights.extraBold,
    color: '#0B3B8C',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  brandTitleCompact: {
    fontSize: 28,
  },
  brandSubtitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.primary,
    marginTop: 2,
    textAlign: 'center',
  },
  brandMotto: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  illustrationWrap: {
    flex: 1,
    minHeight: 170,
    maxHeight: 460,
    marginVertical: spacing.lg,
    // iOS shadow lives on the wrapper because the card clips its drawing.
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  illustration: {
    flex: 1,
    elevation: 4,
  },
  actions: {
    alignItems: 'center',
  },
  ctaShadow: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.md + 1,
    fontWeight: typography.fontWeights.bold,
  },
  footerTagline: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
    letterSpacing: 0.5,
  },
});
