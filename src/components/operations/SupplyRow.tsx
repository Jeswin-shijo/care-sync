import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SupplyItem } from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ProgressFill } from '../common/Motion';
import { needsReorder, SUPPLY_CATEGORY_META } from './inventory';
import { cardStyle } from './OpsUI';

interface Props {
  item: SupplyItem;
  onIndent: () => void;
  onReceive: () => void;
  delay?: number;
}

/** Store item: stock against its reorder level (bar = 2× reorder level, tick = reorder level). */
export const SupplyRow: React.FC<Props> = ({ item, onIndent, onReceive, delay = 0 }) => {
  const meta = SUPPLY_CATEGORY_META[item.category];
  const low = needsReorder(item);
  const severe = item.stock <= item.reorderLevel * 0.5;
  const tone = low ? (severe ? colors.danger : colors.warning) : colors.success;

  return (
    <View style={[styles.card, low && { borderColor: tone + '55' }]}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.category} • {item.supplier}
          </Text>
        </View>
        {low ? (
          <Badge label="Below reorder" variant={severe ? 'danger' : 'warning'} size="sm" />
        ) : (
          <Badge label="In stock" variant="success" size="sm" />
        )}
      </View>

      <View style={styles.levels}>
        <Text style={styles.stock}>
          <Text style={[styles.stockValue, { color: low ? tone : colors.text }]}>{item.stock.toLocaleString('en-IN')}</Text> {item.unit}
        </Text>
        <Text style={styles.reorder}>
          Reorder at {item.reorderLevel.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={styles.track}>
        <ProgressFill progress={item.stock / (item.reorderLevel * 2)} color={tone} height={8} delay={delay} />
        <View style={styles.tick} />
      </View>
      <Text style={styles.restocked}>Last restocked {item.lastRestocked}</Text>

      {!!item.onOrder && (
        <View style={styles.onOrder}>
          <Ionicons name="time-outline" size={13} color={colors.infoText} />
          <Text style={styles.onOrderText}>
            On order • {item.onOrder.toLocaleString('en-IN')} {item.unit} from {item.supplier}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        {item.onOrder ? (
          <>
            <Button title="Indent more" variant="ghost" size="sm" onPress={onIndent} style={styles.btn} />
            <Button
              title={`Receive ${item.onOrder.toLocaleString('en-IN')}`}
              size="sm"
              onPress={onReceive}
              style={styles.btn}
              icon={<Ionicons name="download-outline" size={15} color="#FFFFFF" />}
            />
          </>
        ) : (
          <Button
            title="Raise indent"
            size="sm"
            variant={low ? 'primary' : 'outline'}
            onPress={onIndent}
            style={styles.btn}
            icon={<Ionicons name="cart-outline" size={15} color={low ? '#FFFFFF' : colors.primary} />}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    padding: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  meta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  levels: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: 6,
  },
  stock: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
  },
  stockValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extraBold,
  },
  reorder: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  track: {
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    left: '50%',
    width: 2,
    height: 14,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: colors.textSecondary,
    opacity: 0.55,
  },
  restocked: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  onOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: colors.infoLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: spacing.sm,
    maxWidth: '100%',
  },
  onOrderText: {
    flexShrink: 1,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semiBold,
    color: colors.infoText,
  },
  btn: {
    minHeight: 40,
  },
});
