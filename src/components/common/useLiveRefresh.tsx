import React, { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useApp } from '../../context/AppContext';
import { colors } from '../../constants/theme';

/**
 * Pull-to-refresh for lists of server records: reloads the hospital from the
 * backend. Undefined on sample data (offline demo, previews), which has nothing
 * newer to fetch.
 */
export const useLiveRefreshControl = () => {
  const { refreshData, dataMode } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);
  if (dataMode !== 'live') return undefined;
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />;
};
