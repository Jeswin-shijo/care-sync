import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Medicine } from '../../data/mockData';
import { LOW_STOCK_THRESHOLD } from '../../data/mockData';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { dosageIcon, expiryLabel, medicineStatus, medicineUnit } from './inventory';
import { cardStyle } from './OpsUI';

interface Props {
  medicine: Medicine;
  onIndent: () => void;
  onReceive: () => void;
}

export const MedicineRow: React.FC<Props> = ({ medicine: m, onIndent, onReceive }) => {
  const s = medicineStatus(m);
  const expiry = expiryLabel(s);
  const stockColor = s.out ? colors.danger : s.low ? colors.warningText : colors.text;
  const flagged = s.out || s.expired;
  const needsStock = s.out || s.low;

  return (
    <View style={[styles.card, flagged && styles.cardFlagged]}>
      <View
        style={styles.top}
        accessible
        accessibilityLabel={`${m.name}, ${m.stock} in stock${s.out ? ', out of stock' : s.low ? ', low stock' : ''}${expiry ? `, ${expiry}` : ''}${
          m.onOrder ? `, ${m.onOrder} on order` : ''
        }`}
      >
        <View style={[styles.icon, flagged && { backgroundColor: colors.dangerLight }]}>
          <Ionicons name={dosageIcon(m.dosageForm)} size={20} color={flagged ? colors.danger : '#0D9488'} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {m.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {m.category} • {m.dosageForm} • {formatCurrency(m.price, { decimals: 2 })}
          </Text>
          <View style={styles.badges}>
            {s.out && <Badge label="Out of stock" variant="danger" size="sm" />}
            {s.low && <Badge label={`Low • ≤${LOW_STOCK_THRESHOLD}`} variant="warning" size="sm" />}
            {!!expiry && <Badge label={expiry} variant={s.expired ? 'danger' : 'warning'} size="sm" />}
            <Text style={styles.expiry}>Exp {m.expiry}</Text>
          </View>
        </View>
        <View style={styles.stock}>
          <Text style={[styles.stockValue, { color: stockColor }]}>{m.stock.toLocaleString('en-IN')}</Text>
          <Text style={styles.stockUnit} numberOfLines={1}>
            {medicineUnit(m, m.stock)}
          </Text>
        </View>
      </View>

      {!!m.onOrder && (
        <View style={styles.onOrder}>
          <Ionicons name="time-outline" size={13} color={colors.infoText} />
          <Text style={styles.onOrderText} numberOfLines={1}>
            On order • {m.onOrder.toLocaleString('en-IN')} {medicineUnit(m, m.onOrder)} from the pharmacy distributor
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        {m.onOrder ? (
          <>
            <View style={styles.flex} />
            <Button title="Indent more" variant="ghost" size="sm" onPress={onIndent} style={styles.btn} />
            <Button
              title={`Receive ${m.onOrder.toLocaleString('en-IN')}`}
              size="sm"
              onPress={onReceive}
              style={styles.btn}
              icon={<Ionicons name="download-outline" size={15} color="#FFFFFF" />}
            />
          </>
        ) : (
          <>
            <Text style={styles.hint} numberOfLines={1}>
              {needsStock ? 'Reorder now to avoid a stock-out' : 'Stock is healthy'}
            </Text>
            <Button
              title="Raise indent"
              size="sm"
              variant={needsStock ? 'primary' : 'outline'}
              onPress={onIndent}
              style={styles.btn}
              icon={<Ionicons name="cart-outline" size={15} color={needsStock ? '#FFFFFF' : colors.primary} />}
            />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    ...cardStyle,
    padding: spacing.md,
  },
  cardFlagged: {
    borderColor: colors.danger + '40',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: '#F0FDFA',
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
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  expiry: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  stock: {
    alignItems: 'flex-end',
    minWidth: 48,
  },
  stockValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extraBold,
    letterSpacing: -0.4,
  },
  stockUnit: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  hint: {
    flex: 1,
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
  },
  onOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 4,
    backgroundColor: colors.infoLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: spacing.md,
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
