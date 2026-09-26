import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useReducedMotion } from '../common/Motion';

interface SplashIllustrationProps {
  hospitalName: string;
  style?: StyleProp<ViewStyle>;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** A slow back-and-forth drift, started after `delay`. */
const useDrift = (duration: number, delay: number, enabled: boolean) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) {
      v.setValue(0.5);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: ease, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, easing: ease, useNativeDriver: true }),
        ])
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, [enabled]);
  return v;
};

const Cloud: React.FC<{ width: number; top: number; left: number; drift: Animated.Value; range: number; opacity?: number }> = ({
  width,
  top,
  left,
  drift,
  range,
  opacity = 0.9,
}) => {
  const h = width * 0.36;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left,
        width,
        height: h * 1.5,
        opacity,
        transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-range, range] }) }],
      }}
    >
      <View style={[styles.cloudPart, { left: 0, bottom: 0, width, height: h, borderRadius: h / 2 }]} />
      <View style={[styles.cloudPart, { left: width * 0.18, bottom: h * 0.35, width: width * 0.42, height: width * 0.42, borderRadius: width * 0.21 }]} />
      <View style={[styles.cloudPart, { left: width * 0.46, bottom: h * 0.25, width: width * 0.32, height: width * 0.32, borderRadius: width * 0.16 }]} />
    </Animated.View>
  );
};

/**
 * Hand-drawn hospital scene for the splash screen. It measures its own box, so
 * the building scales with whatever space the layout leaves it.
 */
export const SplashIllustration: React.FC<SplashIllustrationProps> = ({ hospitalName, style }) => {
  const reduced = useReducedMotion();
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const d1 = useDrift(4200, 0, !reduced);
  const d2 = useDrift(5200, 600, !reduced);
  const d3 = useDrift(6000, 1200, !reduced);

  const w = box?.w ?? 0;
  const h = box?.h ?? 0;
  const ground = clamp(h * 0.14, 26, 46);
  const bh = clamp(h * 0.56, 90, h - ground - 36);
  const bw = clamp(Math.min(w * 0.58, bh * 1.35), 150, w * 0.7);
  const bx = (w - bw) / 2;
  const wingW = w * 0.17;
  const wingH = bh * 0.5;
  // Space left for windows once the sign (top) and entrance (bottom) are drawn.
  const windowSpace = Math.max(0, bh - 72);
  const rows = clamp(Math.floor(windowSpace / 26), 1, 4);
  const windowH = clamp(windowSpace / rows - 10, 8, 18);
  const tree = clamp(w * 0.085, 22, 38);
  const lit = new Set([1, 6, 9]);

  return (
    <View
      style={[styles.card, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!box || Math.abs(box.w - width) > 1 || Math.abs(box.h - height) > 1) setBox({ w: width, h: height });
      }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Illustration of ${hospitalName}`}
    >
      <LinearGradient colors={['#E0F2FE', '#BAE6FD', '#93C5FD']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} />
      {box && (
        <>
          <View style={[styles.sun, { width: w * 0.2, height: w * 0.2, borderRadius: w * 0.1, top: h * 0.07, right: w * 0.08 }]} />
          <Cloud width={w * 0.2} top={h * 0.08} left={w * 0.08} drift={d1} range={10} />
          <Cloud width={w * 0.26} top={h * 0.16} left={w * 0.56} drift={d2} range={14} opacity={0.8} />
          <Cloud width={w * 0.14} top={h * 0.3} left={w * 0.3} drift={d3} range={8} opacity={0.65} />

          {/* Side wings */}
          {[bx - wingW + 8, bx + bw - 8].map((left, i) => (
            <View key={i} style={[styles.wing, { left, width: wingW, height: wingH, bottom: ground - 2 }]}>
              {Array.from({ length: 4 }).map((_, j) => (
                <View key={j} style={styles.wingWindow} />
              ))}
            </View>
          ))}

          {/* Main block */}
          <View style={[styles.building, { left: bx, width: bw, height: bh, bottom: ground - 2 }]}>
            <View style={styles.roof}>
              <View style={styles.helipad}>
                <Text style={styles.heliText}>H</Text>
              </View>
            </View>
            <View style={styles.sign}>
              <Ionicons name="medical" size={12} color={colors.primary} />
              <Text style={styles.signText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {hospitalName.toUpperCase()}
              </Text>
            </View>
            <View style={styles.windows}>
              {Array.from({ length: rows }).map((_, r) => (
                <View key={r} style={styles.windowRow}>
                  {Array.from({ length: 4 }).map((__, c) => (
                    <View key={c} style={[styles.window, { height: windowH }, lit.has(r * 4 + c) && styles.windowLit]} />
                  ))}
                </View>
              ))}
            </View>
            <View style={styles.entrance}>
              <View style={styles.cross}>
                <Ionicons name="add" size={12} color="#FFFFFF" />
              </View>
              <View style={styles.door}>
                <View style={styles.doorGlass} />
                <View style={styles.doorGlass} />
              </View>
            </View>
          </View>

          {/* Ground */}
          <View style={[styles.lawn, { height: ground }]}>
            <View style={[styles.road, { height: ground * 0.38 }]} />
          </View>
          {[w * 0.04, w * 0.14, w * 0.8, w * 0.9].map((left, i) => (
            <View
              key={i}
              style={[
                styles.tree,
                {
                  left,
                  bottom: ground * 0.55,
                  width: tree * (i % 2 ? 0.8 : 1),
                  height: tree * (i % 2 ? 0.8 : 1),
                  borderRadius: tree,
                },
              ]}
            />
          ))}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#BAE6FD',
  },
  sun: {
    position: 'absolute',
    backgroundColor: 'rgba(254, 243, 199, 0.85)',
  },
  cloudPart: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  wing: {
    position: 'absolute',
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 8,
    paddingTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  wingWindow: {
    width: '42%',
    height: 12,
    borderRadius: 2,
    backgroundColor: '#A5C8F9',
  },
  building: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: '6%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  roof: {
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
  helipad: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heliText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.danger,
  },
  sign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  signText: {
    flexShrink: 1,
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  windows: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-evenly',
    marginBottom: 34,
  },
  windowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  window: {
    flex: 1,
    height: 16,
    backgroundColor: '#93C5FD',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  windowLit: {
    backgroundColor: '#FDE68A',
    borderColor: '#FBBF24',
  },
  entrance: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  cross: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  door: {
    width: 46,
    height: 28,
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 2,
    paddingTop: 4,
  },
  doorGlass: {
    width: 18,
    height: 22,
    backgroundColor: '#60A5FA',
    opacity: 0.85,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  lawn: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#10B981',
    justifyContent: 'flex-end',
  },
  road: {
    backgroundColor: '#475569',
  },
  tree: {
    position: 'absolute',
    backgroundColor: '#059669',
  },
});
