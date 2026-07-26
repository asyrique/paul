import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, useWindowDimensions } from 'react-native';

/**
 * How much of the bottom of the screen the on-screen keyboard currently covers, in dp.
 * `0` when the keyboard is closed.
 *
 * We track this by hand rather than using `KeyboardAvoidingView`, which fails here on
 * both platforms:
 *
 *  - On Android, `edgeToEdgeEnabled` means the window no longer resizes when the IME
 *    opens, so KAV has nothing to react to and the footer stays behind the keyboard.
 *  - On iOS, KAV measures its own frame against the screen and assumes it reaches the
 *    bottom. The tab bar sits below it, so it under-shoots by roughly the tab bar's
 *    height — the footer rises, but not far enough to clear the keyboard.
 *
 * Reading the keyboard frame directly avoids both assumptions.
 */
export function useKeyboardHeight(): number {
  const { height: windowHeight } = useWindowDimensions();
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      // `willChangeFrame` rather than `willShow` so height changes mid-session — the
      // emoji keyboard, a dictation bar appearing — are picked up too.
      const change = Keyboard.addListener('keyboardWillChangeFrame', (event: KeyboardEvent) => {
        // Derive coverage from screenY instead of trusting `height`: on an iPad the
        // keyboard can be undocked or split, where its height says nothing about how
        // much of the bottom of the screen it actually hides.
        setHeight(Math.max(0, windowHeight - event.endCoordinates.screenY));
      });
      const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
      return () => {
        change.remove();
        hide.remove();
      };
    }

    // Android only reports the keyboard after the fact, and only its height.
    const show = Keyboard.addListener('keyboardDidShow', (event: KeyboardEvent) => {
      setHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [windowHeight]);

  return height;
}
