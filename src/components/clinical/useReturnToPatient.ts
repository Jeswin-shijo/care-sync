import { useCallback } from 'react';
import { router, useNavigation } from 'expo-router';

type StackState = { index: number; routes: Array<{ name: string; params?: Record<string, unknown> }> };

/**
 * After finishing a clinical flow, land on the patient's record without
 * stacking a duplicate: go back when the previous screen is that patient's
 * record, otherwise replace this screen with it. (router.dismissTo matches by
 * route name only, so it could re-point another patient's open record.)
 */
export const useReturnToPatient = () => {
  const navigation = useNavigation<{ getState?: () => StackState | undefined }>();
  return useCallback(
    (patientId: string) => {
      const state = navigation.getState?.();
      const prev = state && state.index > 0 ? state.routes[state.index - 1] : undefined;
      if (prev?.name === 'patient/[id]' && prev.params?.id === patientId && router.canGoBack()) {
        router.back();
      } else {
        router.replace({ pathname: '/patient/[id]', params: { id: patientId } });
      }
    },
    [navigation]
  );
};
