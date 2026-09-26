import { useCallback, useEffect, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';

/** Back to the previous screen, or home when opened from a deep link. */
export const leaveScreen = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
};

interface LeaveGuardOptions {
  /** Ask before leaving (the form is dirty and not yet submitted). */
  when: boolean;
  title?: string;
  message?: string;
  discardLabel?: string;
  /**
   * Runs first on Android hardware back; return true when it handled the
   * press itself (e.g. a wizard stepping back one step).
   */
  onHardwareBack?: () => boolean;
}

/**
 * Confirms before a dirty form is discarded — for the Header back button
 * (use `requestLeave` as `onBackPress`) and the Android back button while the
 * screen is focused. Also disables the iOS swipe-back gesture while dirty.
 */
export const useLeaveGuard = ({
  when,
  title = 'Discard Changes?',
  message = 'Details you entered on this screen will be lost.',
  discardLabel = 'Discard',
  onHardwareBack,
}: LeaveGuardOptions) => {
  const whenRef = useRef(when);
  whenRef.current = when;
  const hardwareRef = useRef(onHardwareBack);
  hardwareRef.current = onHardwareBack;
  const textRef = useRef({ title, message, discardLabel });
  textRef.current = { title, message, discardLabel };
  const navigation = useNavigation<{ setOptions?: (options: { gestureEnabled?: boolean }) => void }>();

  const confirmLeave = useCallback(() => {
    const t = textRef.current;
    Alert.alert(t.title, t.message, [
      { text: 'Keep Editing', style: 'cancel' },
      { text: t.discardLabel, style: 'destructive', onPress: leaveScreen },
    ]);
  }, []);

  const requestLeave = useCallback(() => {
    if (whenRef.current) confirmLeave();
    else leaveScreen();
  }, [confirmLeave]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (hardwareRef.current?.()) return true;
        if (!whenRef.current) return false;
        confirmLeave();
        return true;
      });
      return () => sub.remove();
    }, [confirmLeave])
  );

  useEffect(() => {
    navigation?.setOptions?.({ gestureEnabled: !when });
  }, [navigation, when]);

  return { requestLeave };
};
