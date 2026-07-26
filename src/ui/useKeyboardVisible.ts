import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Whether the on-screen keyboard is showing.
 *
 * Deliberately a boolean and *not* a height. Making room for the keyboard is already
 * handled for us — `KeyboardAvoidingView` at the root does it on iOS, and on Android
 * the window itself resizes — so anything that measured the keyboard and applied its
 * own padding would double-count it and launch the footer far above the keyboard.
 *
 * This hook exists only so the UI can react to the keyboard being up: dropping the tab
 * bar and shrinking the Speak button to buy back vertical room.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    // iOS gets the "will" events so this changes in step with the keyboard animation.
    // Android only reports "did".
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
