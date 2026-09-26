import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../constants/theme';

/**
 * Bottom padding for scrollable stack screens: clears the Android gesture /
 * 3-button bar and the iOS home indicator (edge-to-edge draws under them).
 */
export const useScrollBottomPadding = (extra: number = spacing.xxl) => useSafeAreaInsets().bottom + extra;
