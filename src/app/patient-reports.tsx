import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { LabSample, RadiologyOrder } from '../data/mockData';
import { HOSPITAL_LOCATIONS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { explainForPatient, parameterFlag } from '../logic/clinical';
import { exportDocument } from '../utils/pdfGenerator';
import { formatDisplayDate, relativeDayLabel } from '../utils/dates';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Badge, statusVariant } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';
import { FadeInView, PressableScale, PulseDot, stagger } from '../components/common/Motion';
import { CardAction } from '../components/portals/CardAction';
import { CountTabs } from '../components/portals/CountTabs';
import { ParamTable } from '../components/portals/ParamTable';
import { labReportSpec, radiologyReportSpec } from '../components/portals/documents';

type Tab = 'all' | 'lab' | 'imaging' | 'pending';

const LAB_COLLECTION = HOSPITAL_LOCATIONS.find((l) => /laboratory/i.test(l.name));
const RADIOLOGY = HOSPITAL_LOCATIONS.find((l) => /radiology/i.test(l.name));
const shortTest = (name: string) => name.split('(')[0].trim();

export default function PatientReportsRoute() {
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const paramPid = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;
  const { patientAppUser, getPatient, getLabResults, getLabOrders, getRadiologyOrders, hospitalProfile, sendPatientAiMessage } = useApp();
  const insets = useSafeAreaInsets();
  const patient = (paramPid ? getPatient(paramPid) : undefined) ?? patientAppUser;
  const [tab, setTab] = useState<Tab>('all');
  const [sharing, setSharing] = useState<string | null>(null);

  const results = useMemo(() => (patient ? getLabResults(patient.id) : []), [patient, getLabResults]);
  const pending = useMemo(
    () => (patient ? getLabOrders(patient.id).filter((s) => s.status === 'New' || s.status === 'Processing') : []),
    [patient, getLabOrders]
  );
  const scans = useMemo(() => (patient ? getRadiologyOrders(patient.id) : []), [patient, getRadiologyOrders]);
  const reportedScans = scans.filter((s) => s.status === 'Reported');
  const upcomingScans = scans.filter((s) => s.status !== 'Reported');

  if (!patient) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <Header title="My Reports" />
        <EmptyState
          icon="person-circle-outline"
          title="No patient signed in"
          description="Open the Patient App and choose a patient to see their reports."
          actionTitle="Open Patient App"
          onActionPress={() => router.replace('/patient-portal')}
          style={styles.flex}
        />
      </SafeAreaView>
    );
  }

  const counts = {
    all: results.length + reportedScans.length + pending.length + upcomingScans.length,
    lab: results.length,
    imaging: reportedScans.length,
    pending: pending.length + upcomingScans.length,
  };
  const abnormalCount = results.filter((r) => r.status === 'Abnormal').length;

  const shareLab = async (s: LabSample) => {
    setSharing(s.id);
    await exportDocument(labReportSpec(s, hospitalProfile, { patient, forPatient: true }), `${shortTest(s.testName)} report.pdf`, 'share');
    setSharing(null);
  };
  const shareScan = async (o: RadiologyOrder) => {
    setSharing(o.id);
    await exportDocument(radiologyReportSpec(o, hospitalProfile, patient), `${o.scanName} report.pdf`, 'share');
    setSharing(null);
  };
  const askAssistant = () => {
    sendPatientAiMessage('Explain my latest report');
    router.push('/patient-assistant');
  };
  const directions = (id?: string) => id && router.push({ pathname: '/hospital-navigation', params: { focus: id } });

  const showLab = tab === 'all' || tab === 'lab';
  const showImaging = tab === 'all' || tab === 'imaging';
  const showPending = tab === 'all' || tab === 'pending';
  let index = 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="My Reports" subtitle={`${patient.name} • ${patient.uhid}`} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <FadeInView>
          <View style={styles.summary}>
            <View style={styles.summaryIcon}>
              <Ionicons name="document-text" size={20} color="#EC4899" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.summaryTitle}>
                {results.length + reportedScans.length} report{results.length + reportedScans.length === 1 ? '' : 's'} ready
                {counts.pending ? ` • ${counts.pending} pending` : ''}
              </Text>
              <Text style={styles.summarySub}>
                {abnormalCount
                  ? `${abnormalCount} lab report${abnormalCount > 1 ? 's have' : ' has'} values outside the normal range — your doctor will review ${abnormalCount > 1 ? 'them' : 'it'} with you.`
                  : 'Plain-language explanations are shown with every report.'}
              </Text>
            </View>
          </View>
          {results.length > 0 && (
            <PressableScale style={styles.askRow} onPress={askAssistant} accessibilityRole="button" accessibilityLabel="Ask the assistant to explain my latest report">
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={styles.askText}>Ask the assistant to explain my latest report</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </PressableScale>
          )}
        </FadeInView>

        <CountTabs<Tab>
          scrollable
          tabs={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'lab', label: 'Lab', count: counts.lab, tone: abnormalCount ? 'danger' : 'default' },
            { key: 'imaging', label: 'Imaging', count: counts.imaging },
            { key: 'pending', label: 'Pending', count: counts.pending, tone: 'warning' },
          ]}
          active={tab}
          onChange={setTab}
          style={styles.tabs}
        />

        <View key={tab}>
          {showPending && counts.pending > 0 && (
            <>
              <SectionHeader title="In progress" meta={`${counts.pending}`} style={styles.sectionTight} />
              {pending.map((s) => (
                <FadeInView key={s.id} delay={stagger(index++)}>
                  <View style={[styles.card, styles.pendingCard]}>
                    <View style={styles.cardTop}>
                      <View style={[styles.typeIcon, { backgroundColor: colors.warningLight }]}>
                        <Ionicons name="flask-outline" size={17} color={colors.warning} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {s.testName}
                        </Text>
                        <Text style={styles.cardMeta}>
                          Ordered {relativeDayLabel(s.date ?? '')} • {s.orderedBy ?? 'your doctor'}
                        </Text>
                      </View>
                      <View style={styles.liveTag}>
                        <PulseDot color={colors.warning} size={6} />
                        <Text style={styles.liveText}>{s.status === 'New' ? 'Sample due' : 'Processing'}</Text>
                      </View>
                    </View>
                    <Text style={styles.pendingText}>
                      {s.status === 'New'
                        ? `Please give your sample at ${LAB_COLLECTION ? `${LAB_COLLECTION.name} (${LAB_COLLECTION.floor}, ${LAB_COLLECTION.block})` : 'the laboratory'}. We'll notify you when the report is ready.`
                        : "Your sample is being analysed. We'll notify you as soon as the report is verified."}
                    </Text>
                    {s.status === 'New' && LAB_COLLECTION && (
                      <View style={styles.actions}>
                        <CardAction label="Directions to lab" icon="navigate-outline" variant="outline" onPress={() => directions(LAB_COLLECTION.id)} />
                      </View>
                    )}
                  </View>
                </FadeInView>
              ))}
              {upcomingScans.map((o) => (
                <FadeInView key={o.id} delay={stagger(index++)}>
                  <View style={[styles.card, styles.pendingCard]}>
                    <View style={styles.cardTop}>
                      <View style={[styles.typeIcon, { backgroundColor: colors.purpleLight }]}>
                        <Ionicons name="scan-outline" size={17} color={colors.purple} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {o.scanName}
                        </Text>
                        <Text style={styles.cardMeta}>
                          {relativeDayLabel(o.date)} • {o.time} • {o.orderedBy}
                        </Text>
                      </View>
                      <Badge label={o.status} variant={statusVariant(o.status)} size="sm" />
                    </View>
                    <Text style={styles.pendingText}>
                      {o.status === 'Scheduled' ? 'Please arrive 15 minutes before your scan time and bring any previous films.' : 'Your scan is being reported by the radiologist.'}
                    </Text>
                    {o.status === 'Scheduled' && RADIOLOGY && (
                      <View style={styles.actions}>
                        <CardAction label="Directions to Radiology" icon="navigate-outline" variant="outline" onPress={() => directions(RADIOLOGY.id)} />
                      </View>
                    )}
                  </View>
                </FadeInView>
              ))}
            </>
          )}

          {showLab && results.length > 0 && (
            <>
              <SectionHeader title="Lab reports" meta={`${results.length}`} style={styles.sectionTight} />
              {results.map((s) => {
                const abnormal = s.parameters?.some((p) => parameterFlag(p)) ?? s.status === 'Abnormal';
                return (
                  <FadeInView key={s.id} delay={stagger(index++)}>
                    <View style={[styles.card, abnormal && styles.cardAbnormal]}>
                      <View style={styles.cardTop}>
                        <View style={[styles.typeIcon, { backgroundColor: abnormal ? colors.dangerLight : colors.successLight }]}>
                          <Ionicons name="flask" size={17} color={abnormal ? colors.danger : colors.success} />
                        </View>
                        <View style={styles.flex}>
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {s.testName}
                          </Text>
                          <Text style={styles.cardMeta}>
                            {relativeDayLabel(s.date ?? '')}
                            {s.collectedAt && s.collectedAt !== '—' ? ` • ${s.collectedAt}` : ''} • {s.sampleCode}
                          </Text>
                        </View>
                        <Badge label={abnormal ? 'Needs review' : 'All normal'} variant={abnormal ? 'danger' : 'success'} size="sm" />
                      </View>
                      {!!s.parameters?.length && (
                        <View style={styles.table}>
                          <ParamTable parameters={s.parameters} friendly />
                        </View>
                      )}
                      <View style={[styles.explain, abnormal ? styles.explainWarn : styles.explainOk]}>
                        <Ionicons name={abnormal ? 'information-circle' : 'happy-outline'} size={16} color={abnormal ? colors.warningText : colors.successText} />
                        <View style={styles.flex}>
                          <Text style={[styles.explainTitle, { color: abnormal ? colors.warningText : colors.successText }]}>What this means</Text>
                          <Text style={styles.explainText}>{explainForPatient(s)}</Text>
                        </View>
                      </View>
                      <View style={styles.footer}>
                        <Text style={styles.footerText} numberOfLines={1}>
                          Ordered by {s.orderedBy ?? 'your doctor'}
                        </Text>
                        <CardAction label="Share PDF" icon="share-social-outline" variant="outline" onPress={() => shareLab(s)} loading={sharing === s.id} accessibilityLabel={`Share ${shortTest(s.testName)} report as PDF`} />
                      </View>
                    </View>
                  </FadeInView>
                );
              })}
            </>
          )}

          {showImaging && reportedScans.length > 0 && (
            <>
              <SectionHeader title="Imaging reports" meta={`${reportedScans.length}`} style={styles.sectionTight} />
              {reportedScans.map((o) => (
                <FadeInView key={o.id} delay={stagger(index++)}>
                  <View style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={[styles.typeIcon, { backgroundColor: colors.purpleLight }]}>
                        <Ionicons name="scan" size={17} color={colors.purple} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {o.scanName}
                        </Text>
                        <Text style={styles.cardMeta}>
                          {relativeDayLabel(o.date)} • {formatDisplayDate(o.date)} • {o.category}
                        </Text>
                      </View>
                      <Badge label="Reported" variant="completed" size="sm" />
                    </View>
                    {!!o.findings && (
                      <View style={styles.block}>
                        <Text style={styles.blockLabel}>Findings</Text>
                        <Text style={styles.blockText}>{o.findings}</Text>
                      </View>
                    )}
                    {!!o.impression && (
                      <View style={[styles.explain, styles.explainInfo]}>
                        <Ionicons name="information-circle" size={16} color={colors.infoText} />
                        <View style={styles.flex}>
                          <Text style={[styles.explainTitle, { color: colors.infoText }]}>Impression</Text>
                          <Text style={styles.explainText}>{o.impression} Your doctor will explain what this means for your treatment.</Text>
                        </View>
                      </View>
                    )}
                    <View style={styles.footer}>
                      <Text style={styles.footerText} numberOfLines={1}>
                        Ordered by {o.orderedBy}
                      </Text>
                      <CardAction label="Share PDF" icon="share-social-outline" variant="outline" onPress={() => shareScan(o)} loading={sharing === o.id} accessibilityLabel={`Share ${o.scanName} report as PDF`} />
                    </View>
                  </View>
                </FadeInView>
              ))}
            </>
          )}

          {((tab === 'all' && counts.all === 0) || (tab === 'lab' && !results.length) || (tab === 'imaging' && !reportedScans.length) || (tab === 'pending' && !counts.pending)) && (
            <EmptyState
              icon={tab === 'pending' ? 'hourglass-outline' : tab === 'imaging' ? 'scan-outline' : 'document-text-outline'}
              title={tab === 'pending' ? 'Nothing pending' : tab === 'imaging' ? 'No imaging reports yet' : tab === 'lab' ? 'No lab reports yet' : 'No reports yet'}
              description={
                tab === 'pending'
                  ? 'Tests and scans that are still in progress appear here.'
                  : 'Reports appear here as soon as they are verified. Book a consultation if you need tests.'
              }
              actionTitle={tab === 'pending' ? undefined : 'Book appointment'}
              onActionPress={tab === 'pending' ? undefined : () => router.push({ pathname: '/book-appointment', params: { patientId: patient.id, mode: 'patient' } })}
              style={styles.empty}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  flex: { flex: 1 },
  summary: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.sm,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  summarySub: {
    fontSize: typography.fontSizes.xs + 0.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  askRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  askText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.primaryDark,
    fontWeight: typography.fontWeights.semiBold,
  },
  tabs: {
    marginTop: spacing.md,
  },
  sectionTight: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardAbnormal: {
    borderColor: colors.danger + '44',
  },
  pendingCard: {
    borderStyle: 'dashed',
    borderColor: colors.warning + '88',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  cardMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.warningLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveText: {
    fontSize: 10.5,
    color: colors.warningText,
    fontWeight: typography.fontWeights.bold,
  },
  pendingText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: spacing.sm,
  },
  table: {
    marginTop: spacing.md,
  },
  explain: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  explainOk: {
    backgroundColor: colors.successLight,
  },
  explainWarn: {
    backgroundColor: colors.warningLight,
  },
  explainInfo: {
    backgroundColor: colors.infoLight,
  },
  explainTitle: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
  },
  explainText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
    lineHeight: 18,
    marginTop: 2,
  },
  block: {
    marginTop: spacing.md,
  },
  blockLabel: {
    fontSize: 10.5,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  blockText: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.text,
    lineHeight: 18,
    marginTop: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  empty: {
    paddingVertical: spacing.xl,
  },
});
