import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';

/**
 * Android runs edge-to-edge here, so the window no longer resizes for the
 * keyboard (adjustResize is ignored). Wrap any screen body that contains
 * inputs in <KeyboardAwareContainer>: the container shrinks above the
 * keyboard, so a ScrollView inside keeps the focused field visible and an
 * absolutely positioned <BottomActionBar> rides up with it.
 */
export const KeyboardAwareContainer: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra offset when a fixed header sits above the container on iOS. */
  iosOffset?: number;
}> = ({ children, style, iosOffset = 0 }) => (
  <KeyboardAvoidingView
    style={[{ flex: 1 }, style]}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? iosOffset : 0}
  >
    {children}
  </KeyboardAvoidingView>
);

/** Current keyboard height (0 when hidden). */
export const useKeyboardHeight = () => {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates.height));
    const h = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);
  return height;
};

/** Props every scrollable form should use so taps work while the keyboard is up. */
export const formScrollProps = {
  keyboardShouldPersistTaps: 'handled' as const,
  keyboardDismissMode: (Platform.OS === 'ios' ? 'interactive' : 'on-drag') as 'interactive' | 'on-drag',
};
