import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { WardInfo } from '../../data/mockData';
import { colors, radius, typography } from '../../constants/theme';
import { BedKind, BedTile, bedDisplayNumber } from './beds';
import { initialsOf } from './utils';

export const BED_GAP = 6;

interface TileProps {
  tile: BedTile;
  size: number;
  display: number;
  onPress: (tile: BedTile) => void;
}

/**
 * Plain Pressable tiles (no Animated nodes) so a 110-bed ward renders and
 * re-renders instantly; the press state gives the tactile shrink.
 */
const Tile = memo(({ tile, size, display, onPress }: TileProps) => {
  const patient = tile.kind === 'patient' ? tile.patient : undefined;
  return (
    <Pressable
      onPress={() => onPress(tile)}
      style={({ pressed }) => [styles.tile, { width: size, height: size }, KIND_STYLE[tile.kind], pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={
        patient ? `Bed ${display}, ${patient.name}` : `Bed ${display}, ${tile.kind === 'occupied' ? 'occupied' : 'available'}`
      }
    >
      {patient ? (
        <>
          <Text style={styles.noOnPatient}>{display}</Text>
          <Text style={styles.initials} numberOfLines={1}>
            {initialsOf(patient.name)}
          </Text>
        </>
      ) : (
        <Text style={[styles.no, tile.kind === 'available' ? styles.noAvailable : styles.noOccupied]}>{display}</Text>
      )}
    </Pressable>
  );
});

interface GridProps {
  tiles: BedTile[];
  ward: WardInfo;
  /** Inner width the grid may use. */
  width: number;
  columns?: number;
  onPressTile: (tile: BedTile) => void;
}

export const BedGrid = memo(({ tiles, ward, width, columns = 6, onPressTile }: GridProps) => {
  const size = Math.max(38, Math.floor((width - BED_GAP * (columns - 1)) / columns));
  return (
    <View style={styles.grid}>
      {tiles.map((t) => (
        <Tile key={t.number} tile={t} size={size} display={bedDisplayNumber(ward, t.number)} onPress={onPressTile} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BED_GAP,
  },
  tile: {
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.92 }],
  },
  no: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  noAvailable: {
    color: colors.success,
  },
  noOccupied: {
    color: colors.textSecondary,
  },
  noOnPatient: {
    position: 'absolute',
    top: 3,
    left: 5,
    fontSize: 9,
    fontWeight: typography.fontWeights.bold,
    color: 'rgba(255,255,255,0.85)',
  },
  initials: {
    marginTop: 6,
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.extraBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

const KIND_STYLE = StyleSheet.create<Record<BedKind, ViewStyle>>({
  patient: {
    backgroundColor: colors.primary,
  },
  occupied: {
    backgroundColor: colors.border,
  },
  available: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.success,
  },
});
