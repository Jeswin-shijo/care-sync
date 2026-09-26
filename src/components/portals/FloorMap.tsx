import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HospitalLocation } from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { PulseDot } from '../common/Motion';

type IconName = keyof typeof Ionicons.glyphMap;

/** Vertical order of floors on the map (top → bottom). */
const FLOOR_AXIS = ['4th Floor', '3rd Floor', '2nd Floor', '1st Floor', 'Ground Floor', 'Lower Ground'];
const FLOOR_SHORT: Record<string, string> = {
  '4th Floor': '4',
  '3rd Floor': '3',
  '2nd Floor': '2',
  '1st Floor': '1',
  'Ground Floor': 'G',
  'Lower Ground': 'LG',
};

/** Building outlines; floors that hold a mapped location are added automatically. */
const BLOCK_SHAPES: Array<{ block: string; short: string; icon: IconName; color: string; floors: string[]; gate?: string }> = [
  { block: 'Main Block', short: 'Main', icon: 'business-outline', color: colors.primary, floors: ['3rd Floor', '2nd Floor', '1st Floor', 'Ground Floor'], gate: 'Main gate' },
  { block: 'Diagnostics Wing', short: 'Diagnostics', icon: 'flask-outline', color: colors.purple, floors: ['1st Floor', 'Ground Floor', 'Lower Ground'] },
  { block: 'Emergency Block', short: 'Emergency', icon: 'medkit-outline', color: colors.danger, floors: ['1st Floor', 'Ground Floor'], gate: 'East gate' },
];

export const iconFor = (loc: HospitalLocation): IconName =>
  (loc.icon in Ionicons.glyphMap ? loc.icon : 'location') as IconName;

const floorRank = (f: string) => {
  const i = FLOOR_AXIS.indexOf(f);
  return i === -1 ? FLOOR_AXIS.length : i;
};

interface FloorMapProps {
  locations: HospitalLocation[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

/**
 * Stylised campus section: one column per block, one cell per floor, with a
 * pin for every mapped department. The selected destination pulses.
 */
export const FloorMap: React.FC<FloorMapProps> = ({ locations, selectedId, onSelect }) => {
  const knownBlocks = BLOCK_SHAPES.map((b) => b.block);
  const extraBlocks = Array.from(new Set(locations.map((l) => l.block))).filter((b) => !knownBlocks.includes(b));
  const blocks = [
    ...BLOCK_SHAPES,
    ...extraBlocks.map((b) => ({ block: b, short: b.split(' ')[0], icon: 'business-outline' as IconName, color: colors.teal, floors: [] as string[], gate: undefined })),
  ].map((b) => ({
    ...b,
    floors: Array.from(new Set([...b.floors, ...locations.filter((l) => l.block === b.block).map((l) => l.floor)])),
  }));
  const axis = Array.from(new Set([...FLOOR_AXIS, ...locations.map((l) => l.floor)])).sort((a, b) => floorRank(a) - floorRank(b));
  const usedAxis = axis.filter((f) => blocks.some((b) => b.floors.includes(f)));
  const selected = locations.find((l) => l.id === selectedId);

  return (
    <View>
      <View style={styles.columns}>
        {blocks.map((b) => {
          const activeBlock = selected?.block === b.block;
          return (
            <View key={b.block} style={styles.column}>
              <View style={[styles.blockHead, activeBlock && { backgroundColor: b.color + '1A' }]}>
                <Ionicons name={b.icon} size={13} color={b.color} />
                <Text style={[styles.blockName, { color: activeBlock ? b.color : colors.textSecondary }]} numberOfLines={1}>
                  {b.short}
                </Text>
              </View>
              {usedAxis.map((floor) => {
                const has = b.floors.includes(floor);
                if (!has) return <View key={floor} style={styles.cellSpacer} />;
                const pins = locations.filter((l) => l.block === b.block && l.floor === floor);
                const isTarget = !!selected && selected.block === b.block && selected.floor === floor;
                const below = floor === 'Lower Ground';
                return (
                  <View
                    key={floor}
                    style={[
                      styles.cell,
                      below && styles.cellBelow,
                      isTarget && { backgroundColor: b.color, borderColor: b.color },
                      floor === 'Ground Floor' && styles.groundCell,
                    ]}
                  >
                    <Text style={[styles.floorTag, isTarget && styles.floorTagOn]}>{FLOOR_SHORT[floor] ?? floor.slice(0, 2)}</Text>
                    <View style={styles.pins}>
                      {pins.map((l) => {
                        const on = l.id === selectedId;
                        return (
                          <Pressable
                            key={l.id}
                            onPress={() => onSelect(l.id)}
                            hitSlop={10}
                            style={[styles.pin, on ? styles.pinOn : isTarget ? styles.pinOnCell : { backgroundColor: b.color + '1F' }]}
                            accessibilityRole="button"
                            accessibilityLabel={`${l.name}, ${l.floor}, ${l.block}`}
                            accessibilityState={{ selected: on }}
                          >
                            <Ionicons name={iconFor(l)} size={13} color={on ? b.color : isTarget ? '#FFFFFF' : b.color} />
                            {on && <PulseDot color="#FFFFFF" size={6} style={styles.pinPulse} />}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
              <View style={styles.gateRow}>
                {b.gate ? (
                  <>
                    <Ionicons name={b.block === 'Main Block' ? 'walk-outline' : 'enter-outline'} size={12} color={b.block === 'Main Block' ? colors.success : colors.textMuted} />
                    <Text style={[styles.gateText, b.block === 'Main Block' && { color: colors.successText }]} numberOfLines={1}>
                      {b.block === 'Main Block' ? 'You are here' : b.gate}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Destination</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="walk-outline" size={12} color={colors.success} />
          <Text style={styles.legendText}>Main gate (you)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendBelow]} />
          <Text style={styles.legendText}>Below ground</Text>
        </View>
      </View>
    </View>
  );
};

const CELL_H = 44;

const styles = StyleSheet.create({
  columns: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  column: {
    flex: 1,
    gap: 4,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  blockName: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  cellSpacer: {
    height: CELL_H,
  },
  cell: {
    height: CELL_H,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 6,
    gap: 4,
  },
  cellBelow: {
    backgroundColor: '#EEF2F7',
    borderStyle: 'dashed',
  },
  groundCell: {
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
  },
  floorTag: {
    fontSize: 10,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.textMuted,
    minWidth: 14,
  },
  floorTagOn: {
    color: '#FFFFFF',
  },
  pins: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'flex-end',
  },
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinOn: {
    backgroundColor: '#FFFFFF',
  },
  pinOnCell: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  pinPulse: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  gateRow: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  gateText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semiBold,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendBelow: {
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 10.5,
    color: colors.textSecondary,
  },
});
