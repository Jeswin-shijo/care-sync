import React, { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import type { PatientDocument } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { colors, spacing, typography } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SearchBar } from '../components/common/SearchBar';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { Avatar } from '../components/common/Avatar';
import { Badge, statusVariant } from '../components/common/Badge';
import { BottomActionBar, useBottomBarSpace } from '../components/common/BottomActionBar';
import { FadeInView, PressableScale, stagger } from '../components/common/Motion';
import { formScrollProps, KeyboardAwareContainer } from '../components/common/KeyboardAware';
import { DocumentRow } from '../components/operations/DocumentRow';
import { DocumentPreviewSheet } from '../components/operations/DocumentPreviewSheet';
import { UploadDocumentSheet } from '../components/operations/UploadDocumentSheet';
import { DOC_TYPE_META, DOC_TYPES, DocType } from '../components/operations/documents';
import { cardStyle, ChoiceChips } from '../components/operations/OpsUI';
import { afterModal, plural } from '../components/operations/utils';

type TypeFilter = DocType | 'All';

interface Section {
  patientId: string;
  patientName: string;
  data: PatientDocument[];
}

const byNewest = (a: PatientDocument, b: PatientDocument) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1);

export default function DocumentsRoute() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const { documents, getPatient, patients } = useApp();
  const { showToast } = useToast();
  const barSpace = useBottomBarSpace();

  const paramPatient = typeof params.patientId === 'string' && params.patientId ? params.patientId : null;
  const [patientFilter, setPatientFilter] = useState<string | null>(paramPatient);
  const [type, setType] = useState<TypeFilter>('All');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (paramPatient) setPatientFilter(paramPatient);
  }, [paramPatient]);

  const filterPatient = getPatient(patientFilter);
  const q = query.trim().toLowerCase();

  const searched = useMemo(() => {
    const uhidOf = new Map(patients.map((p) => [p.id, p.uhid.toLowerCase()]));
    return documents
      .filter((d) => !patientFilter || d.patientId === patientFilter)
      .filter(
        (d) =>
          !q ||
          d.title.toLowerCase().includes(q) ||
          d.patientName.toLowerCase().includes(q) ||
          d.uploadedBy.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          (uhidOf.get(d.patientId) ?? '').includes(q)
      );
  }, [documents, patients, patientFilter, q]);

  const typeCounts = useMemo(() => {
    const counts = new Map<DocType, number>();
    searched.forEach((d) => counts.set(d.type, (counts.get(d.type) ?? 0) + 1));
    return counts;
  }, [searched]);

  const visible = useMemo(() => searched.filter((d) => type === 'All' || d.type === type).sort(byNewest), [searched, type]);

  const sections: Section[] = useMemo(() => {
    const groups = new Map<string, Section>();
    visible.forEach((d) => {
      const g = groups.get(d.patientId) ?? { patientId: d.patientId, patientName: d.patientName, data: [] };
      g.data.push(d);
      groups.set(d.patientId, g);
    });
    // Visible docs are newest-first, so insertion order = most recently updated patient first.
    return [...groups.values()];
  }, [visible]);

  const patientCount = useMemo(() => new Set(documents.map((d) => d.patientId)).size, [documents]);
  const previewDoc = preview.id ? documents.find((d) => d.id === preview.id) ?? null : null;
  const openPreview = (id: string) => setPreview({ open: true, id });

  const clearFilters = () => {
    setQuery('');
    setType('All');
  };

  const showAll = () => {
    setPatientFilter(null);
    if (paramPatient) router.setParams({ patientId: '' });
  };

  const unknownPatient = !!patientFilter && !filterPatient;

  const listHeader = filterPatient ? (
    <FadeInView>
      <View style={styles.patientCard}>
        <Avatar name={filterPatient.name} size={44} />
        <View style={styles.flex}>
          <Text style={styles.patientName} numberOfLines={1}>
            {filterPatient.name}
          </Text>
          <Text style={styles.patientMeta} numberOfLines={1}>
            {filterPatient.uhid} • {filterPatient.age}y {filterPatient.gender[0]} • {plural(searched.length, 'document')}
          </Text>
        </View>
        <Badge label={filterPatient.status} variant={statusVariant(filterPatient.status)} size="sm" />
      </View>
      <View style={styles.patientActions}>
        <Button
          title="Patient record"
          variant="ghost"
          size="sm"
          onPress={() => router.push({ pathname: '/patient/[id]', params: { id: filterPatient.id } })}
          icon={<Ionicons name="person-circle-outline" size={16} color={colors.primary} />}
        />
        <Button
          title="All documents"
          variant="ghost"
          size="sm"
          onPress={showAll}
          icon={<Ionicons name="albums-outline" size={16} color={colors.primary} />}
        />
      </View>
    </FadeInView>
  ) : null;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header
        title="Document Support"
        subtitle={
          filterPatient
            ? `${filterPatient.name} • ${plural(searched.length, 'document')}`
            : `${plural(documents.length, 'document')} • ${plural(patientCount, 'patient')}`
        }
        showBack
      />

      <KeyboardAwareContainer>
        <View style={styles.controls}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search title, patient, UHID or uploader…" />
          <ChoiceChips
            scroll
            bleed={spacing.base}
            style={styles.chips}
            value={type}
            onChange={setType}
            options={[
              { value: 'All' as TypeFilter, label: 'All', count: searched.length, icon: 'folder-open-outline' },
              ...DOC_TYPES.map((t) => ({
                value: t as TypeFilter,
                label: t,
                icon: DOC_TYPE_META[t].icon,
                count: typeCounts.get(t) ?? 0,
                tone: DOC_TYPE_META[t].color,
              })),
            ]}
          />
        </View>

        {unknownPatient ? (
          <EmptyState
            icon="person-remove-outline"
            title="Patient not found"
            description="This link points to a patient who isn't in CareSync. Browse the full document vault instead."
            actionTitle="Show all documents"
            onActionPress={showAll}
          />
        ) : (
          <SectionList
            {...formScrollProps}
            sections={sections}
            keyExtractor={(d) => d.id}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.listContent, { paddingBottom: barSpace + spacing.base }]}
            ListHeaderComponent={listHeader}
            renderSectionHeader={({ section }) =>
              filterPatient ? null : (
                <PressableScale
                  onPress={() => router.push({ pathname: '/patient/[id]', params: { id: section.patientId } })}
                  style={styles.sectionHeader}
                  accessibilityRole="button"
                  accessibilityLabel={`${section.patientName}, ${plural(section.data.length, 'document')}. Open patient record`}
                >
                  <Avatar name={section.patientName} size={30} />
                  <View style={styles.flex}>
                    <Text style={styles.sectionName} numberOfLines={1}>
                      {section.patientName}
                    </Text>
                    <Text style={styles.sectionMeta} numberOfLines={1}>
                      {getPatient(section.patientId)?.uhid ?? 'UHID —'} • {plural(section.data.length, 'document')}
                    </Text>
                  </View>
                  <Text style={styles.sectionLink}>Profile ›</Text>
                </PressableScale>
              )
            }
            renderItem={({ item, index }) => (
              <FadeInView delay={stagger(index, 50, 300)} style={styles.item}>
                <DocumentRow doc={item} onPress={() => openPreview(item.id)} />
              </FadeInView>
            )}
            ListEmptyComponent={
              <EmptyState
                icon="document-text-outline"
                title={
                  q || type !== 'All'
                    ? 'No documents match'
                    : filterPatient
                    ? `No documents for ${filterPatient.name} yet`
                    : 'The document vault is empty'
                }
                description={
                  q || type !== 'All'
                    ? 'Try another search or document type.'
                    : 'Scan consent forms, ID proofs, insurance papers and reports to keep them with the patient record.'
                }
                actionTitle={q || type !== 'All' ? 'Clear filters' : 'Upload document'}
                onActionPress={q || type !== 'All' ? clearFilters : () => setUploadOpen(true)}
              />
            }
          />
        )}
      </KeyboardAwareContainer>

      <BottomActionBar>
        <Button
          title={filterPatient ? `Upload for ${filterPatient.name.split(' ')[0]}` : 'Upload document'}
          onPress={() => setUploadOpen(true)}
          size="lg"
          fullWidth
          icon={<Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />}
        />
      </BottomActionBar>

      <DocumentPreviewSheet visible={preview.open && !!previewDoc} doc={previewDoc} onClose={() => setPreview((p) => ({ ...p, open: false }))} />

      <UploadDocumentSheet
        visible={uploadOpen}
        initialPatientId={filterPatient?.id ?? null}
        onClose={() => setUploadOpen(false)}
        onUploaded={(doc) => {
          setUploadOpen(false);
          if (type !== 'All' && type !== doc.type) setType('All');
          if (q) setQuery('');
          showToast({
            title: 'Document uploaded',
            message: `${doc.title} filed to ${doc.patientName}'s record`,
            type: 'success',
            icon: 'cloud-done',
            action: { label: 'View', onPress: () => afterModal(() => openPreview(doc.id), 50) },
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  controls: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  chips: {
    paddingVertical: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    flexGrow: 1,
  },
  patientCard: {
    ...cardStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  patientName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  patientMeta: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  patientActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    minHeight: 48,
  },
  sectionName: {
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sectionMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  sectionLink: {
    fontSize: typography.fontSizes.xs + 1,
    color: colors.primary,
    fontWeight: typography.fontWeights.semiBold,
  },
  item: {
    marginBottom: spacing.sm,
  },
});
