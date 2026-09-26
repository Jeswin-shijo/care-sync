import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { BottomSheet } from '../../common/BottomSheet';
import { Button } from '../../common/Button';
import { FadeInView, stagger } from '../../common/Motion';

interface ArchitectureSheetProps {
  visible: boolean;
  onClose: () => void;
  protocolCount: number;
  auditCount: number;
}

const LAYERS: Array<{ icon: keyof typeof Ionicons.glyphMap; color: string; title: string; items: string[] }> = [
  { icon: 'lock-closed', color: '#0EA5E9', title: 'Secure access layer', items: ['Doctor login (MFA)', 'API gateway (HTTPS)', 'Web application firewall', 'Role-based access (RBAC)'] },
  { icon: 'git-network', color: colors.primary, title: 'AI orchestrator', items: ['Intent detection', 'Context manager', 'Tool / function calling', 'Prompt manager', 'Response synthesizer'] },
  { icon: 'person', color: '#2563EB', title: 'Patient context engine', items: ['Patient data aggregation', 'Medical timeline', 'Previous visits', 'Lab & imaging summary'] },
  { icon: 'medkit', color: colors.danger, title: 'Clinical rules engine', items: ['Drug interaction check', 'Allergy check', 'Dosage validation', 'Clinical guidelines (CDSS)'] },
  { icon: 'library', color: colors.success, title: 'RAG over hospital knowledge', items: ['Hospital SOPs', 'Clinical protocols', 'Drug formulary', 'Policies & guidelines'] },
  { icon: 'shield-checkmark', color: colors.orange, title: 'AI output guardrails', items: ['Medical safety filters', 'Hallucination prevention', 'Source citations', 'Human confirmation (doctor approval)'] },
  { icon: 'sparkles', color: colors.purple, title: 'LLM layer — GPT-6 Astro API (planned integration)', items: ['Used through controlled tools & structured prompts', 'No direct database access'] },
  { icon: 'cloud-offline', color: colors.textSecondary, title: 'Zero data retention', items: ['No PHI stored by the AI provider (enterprise mode)', 'Encrypted in transit & at rest'] },
];

/** What "MediOS AI" means on this screen — and, honestly, what this build actually runs. */
export const ArchitectureSheet: React.FC<ArchitectureSheetProps> = ({ visible, onClose, protocolCount, auditCount }) => (
  <BottomSheet
    visible={visible}
    onClose={onClose}
    title="MediOS AI Doctor Copilot"
    subtitle="Built for doctors. Connected to your hospital systems."
    maxHeight={0.9}
    footer={<Button title="Got it" onPress={onClose} fullWidth />}
  >
    <View style={styles.mode}>
      <Ionicons name="phone-portrait-outline" size={18} color={colors.warningText} />
      <View style={{ flex: 1 }}>
        <Text style={styles.modeTitle}>This build: simulated on-device engine</Text>
        <Text style={styles.modeText}>
          Answers, drafts and insights are computed on this device from CareSync mock data — no LLM is called and no data leaves the phone. The
          production design routes the same flow through the layers below.
        </Text>
      </View>
    </View>

    <View style={styles.live}>
      <View style={styles.liveItem}>
        <Text style={styles.liveValue}>{protocolCount}</Text>
        <Text style={styles.liveLabel}>SOPs indexed</Text>
      </View>
      <View style={styles.liveItem}>
        <Text style={styles.liveValue}>5 + 3</Text>
        <Text style={styles.liveLabel}>DDI + allergy rules</Text>
      </View>
      <View style={styles.liveItem}>
        <Text style={styles.liveValue}>{auditCount}</Text>
        <Text style={styles.liveLabel}>Audit entries</Text>
      </View>
    </View>

    {LAYERS.map((layer, i) => (
      <FadeInView key={layer.title} delay={stagger(i, 45)} offset={8} style={styles.layer}>
        <View style={styles.rail}>
          <View style={[styles.icon, { backgroundColor: `${layer.color}18` }]}>
            <Ionicons name={layer.icon} size={16} color={layer.color} />
          </View>
          {i < LAYERS.length - 1 && <View style={styles.connector} />}
        </View>
        <View style={styles.layerBody}>
          <Text style={styles.layerTitle}>{layer.title}</Text>
          <View style={styles.items}>
            {layer.items.map((item) => (
              <View key={item} style={styles.item}>
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </FadeInView>
    ))}
  </BottomSheet>
);

const styles = StyleSheet.create({
  mode: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  modeTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.warningText,
  },
  modeText: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.warningText,
    lineHeight: 17,
    marginTop: 2,
  },
  live: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.base,
  },
  liveItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.cardMuted,
  },
  liveValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extraBold,
    color: colors.text,
  },
  liveLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
    textAlign: 'center',
  },
  layer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    alignItems: 'center',
    width: 34,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderLight,
    marginVertical: 2,
  },
  layerBody: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  layerTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 7,
  },
  items: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  item: {
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.cardMuted,
  },
  itemText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
});
