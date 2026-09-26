import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ExportAction } from '../../utils/pdfGenerator';
import { colors, radius, shadows, spacing, typography } from '../../constants/theme';
import { Button } from '../common/Button';
import type { IconName } from './invoiceUtils';

const META: Record<ExportAction, { label: string; icon: IconName }> = {
  download: { label: 'Download PDF', icon: 'download-outline' },
  share: { label: 'Share', icon: 'share-social-outline' },
  print: { label: 'Print', icon: 'print-outline' },
};

interface ExportActionsProps {
  onExport: (action: ExportAction) => Promise<boolean>;
  /**
   * stack — full-width primary "Download PDF" with Share / Print below (receipt design).
   * row — three compact buttons side by side (sticky footers).
   */
  layout?: 'stack' | 'row';
  /** In `stack` layout, render the download button as outline (when another action is primary). */
  secondaryDownload?: boolean;
  labels?: Partial<Record<ExportAction, string>>;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** PDF / Share / Print buttons with a per-action loading state; blocks double taps while exporting. */
export const ExportActions: React.FC<ExportActionsProps> = ({
  onExport,
  layout = 'stack',
  secondaryDownload = false,
  labels,
  disabled = false,
  style,
}) => {
  const [busy, setBusy] = useState<ExportAction | null>(null);
  const running = useRef(false);

  const run = async (action: ExportAction) => {
    if (running.current || disabled) return;
    running.current = true;
    setBusy(action);
    try {
      await onExport(action);
    } finally {
      running.current = false;
      setBusy(null);
    }
  };

  const label = (a: ExportAction) => labels?.[a] ?? META[a].label;

  const tile = (a: ExportAction, extra?: StyleProp<ViewStyle>) => (
    <TouchableOpacity
      key={a}
      style={[styles.tile, extra, (disabled || (busy && busy !== a)) && styles.dim]}
      activeOpacity={0.75}
      onPress={() => run(a)}
      disabled={disabled || !!busy}
      accessibilityRole="button"
      accessibilityLabel={label(a)}
      accessibilityState={{ busy: busy === a, disabled: disabled || !!busy }}
    >
      {busy === a ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name={META[a].icon} size={18} color={colors.primary} />
      )}
      <Text style={styles.tileText} numberOfLines={1}>
        {busy === a ? (a === 'print' ? 'Opening…' : 'Preparing…') : label(a)}
      </Text>
    </TouchableOpacity>
  );

  if (layout === 'row') {
    return (
      <View style={[styles.row, style]}>
        {tile('print')}
        {tile('share')}
        <Button
          title={busy === 'download' ? 'Preparing…' : label('download')}
          onPress={() => run('download')}
          loading={busy === 'download'}
          disabled={disabled || (!!busy && busy !== 'download')}
          icon={<Ionicons name="download-outline" size={18} color="#FFFFFF" />}
          style={styles.rowPrimary}
        />
      </View>
    );
  }

  return (
    <View style={[styles.stack, style]}>
      {secondaryDownload ? (
        tile('download', styles.fullTile)
      ) : (
        <Button
          title={label('download')}
          onPress={() => run('download')}
          loading={busy === 'download'}
          disabled={disabled || (!!busy && busy !== 'download')}
          icon={<Ionicons name="download-outline" size={20} color="#FFFFFF" />}
          fullWidth
          size="lg"
          style={styles.primary}
        />
      )}
      <View style={styles.row}>
        {tile('share')}
        {tile('print')}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  primary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  rowPrimary: {
    flex: 1.4,
    paddingHorizontal: 10,
  },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  fullTile: {
    flex: 0,
    alignSelf: 'stretch',
  },
  dim: {
    opacity: 0.5,
  },
  tileText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
});
