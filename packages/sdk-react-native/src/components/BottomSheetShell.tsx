import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';

// Shared shell for every bottom sheet in the app except UserProfileSheet
// (whose drag-to-dismiss + interpolated-opacity pattern is bespoke and
// already correct — see its own file). Fixes two bugs every hand-rolled
// <Modal>-based sheet had:
//
// - No statusBarTranslucent: the app runs edge-to-edge with a transparent
//   status bar (android/app/src/main/res/values/styles.xml), so without this
//   prop each Modal's own window stops below the status bar on Android,
//   leaving that strip showing whatever's behind it — undimmed. Same class
//   of bug RootNavigator.tsx already had to fix for react-native-screens'
//   Stack.Navigator, which has its own separate statusBarTranslucent knob.
// - animationType="slide" animates the whole Modal subtree — scrim and sheet
//   together — as one native transition, so the backdrop visibly travels
//   with the sheet instead of dimming in independently.
//
// Scrim opacity and sheet position are both derived from one Animated.Value
// via interpolate(), rather than run as two separately-started animations —
// guarantees they're frame-perfect in sync, not just started together.
export default function BottomSheetShell({
  visible,
  onClose,
  children,
  scrimOpacity = 0.5,
  fadeDuration = 220,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode; // the sheet card — caller owns all of its own styling
  scrimOpacity?: number;
  fadeDuration?: number;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: fadeDuration,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeDuration, progress]);

  const scrim = progress.interpolate({ inputRange: [0, 1], outputRange: [0, scrimOpacity] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [windowHeight, 0] });

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Visual only — tap-to-close is the separate Pressable below, same
          split UserProfileSheet uses between its own scrim and hit target. */}
      <Animated.View style={[styles.scrim, { opacity: scrim }]} pointerEvents="none" />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      {/* box-none: this wrapper itself is invisible to touch outside of
          wherever the card actually renders (it's flex:1, covering the full
          screen, but content is bottom-aligned) — taps above the card fall
          through to the Pressable behind it instead of being swallowed here. */}
      <Animated.View style={[styles.sheetWrap, { transform: [{ translateY }] }]} pointerEvents="box-none">
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
});
