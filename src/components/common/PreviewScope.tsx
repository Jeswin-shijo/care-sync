import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PreviewStoreProvider, useApp, usePreviewStore } from '../../context/AppContext';
import { useSession } from '../../context/SessionContext';
import { canAccess, ModuleId } from '../../logic/access';
import { RoleLockScreen } from '../orders/RoleLock';
import { PreviewContext } from './previewContext';

export { useIsPreview } from './previewContext';

type HospitalStore = ReturnType<typeof useApp>;

/** Runs everything inside on the sample hospital, with the Preview strip in headers. */
export const PreviewScope: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PreviewContext.Provider value={true}>
    <PreviewStoreProvider>{children}</PreviewStoreProvider>
  </PreviewContext.Provider>
);

interface PreviewInfo {
  module: ModuleId;
  title: string;
  /** What the module does, for the lock screen: "Dispensing and billing medicines". */
  purpose: string;
}

/**
 * Wraps a route the MediOS backend does not cover yet. Signed in to an account,
 * the screen runs on the sample hospital (never the real records) and its header
 * says so; the account's role still decides whether it opens at all. In the
 * offline demo the screen renders as it always has.
 */
export function withPreview<P extends object>(Screen: React.ComponentType<P>, info: PreviewInfo) {
  const Previewed = (props: P) => {
    const { status, role } = useSession();
    if (status !== 'live') return <Screen {...props} />;
    if (!role || !canAccess(role, info.module)) return <RoleLockScreen title={info.title} module={info.module} purpose={info.purpose} />;
    return (
      <PreviewContext.Provider value={true}>
        <PreviewStoreProvider>
          <Screen {...props} />
        </PreviewStoreProvider>
      </PreviewContext.Provider>
    );
  };
  Previewed.displayName = `Preview(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Previewed;
}

/**
 * For detail routes shared by live and preview screens (patient record, receipt):
 * when a preview module opens one of its sample records, render it on the sample
 * hospital, marked as preview, instead of "not found" in the live records.
 */
export function withSampleFallback<P extends object>(Screen: React.ComponentType<P>, has: (store: HospitalStore, id: string) => boolean) {
  const Resolved = (props: P) => {
    const { status } = useSession();
    const liveStore = useApp();
    const sampleStore = usePreviewStore();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const fromSample = status === 'live' && !!id && !has(liveStore, id) && has(sampleStore, id);
    if (!fromSample) return <Screen {...props} />;
    return (
      <PreviewContext.Provider value={true}>
        <PreviewStoreProvider>
          <Screen {...props} />
        </PreviewStoreProvider>
      </PreviewContext.Provider>
    );
  };
  Resolved.displayName = `SampleFallback(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Resolved;
}
