import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Shared sizing for every bottom sheet (Modal + slide-up card pinned to the
// screen bottom) in the app: caps how tall a sheet can grow so it can never
// reach past the status bar/notch, and pads its bottom content by the
// device's own safe-area inset (home indicator on iOS, the 3-button/gesture
// nav bar on Android) on top of the sheet's own visual breathing room —
// without this, that hardware/software chrome sits on top of the sheet's
// own bottom content, especially on Android.
export function useSheetLayout(basePaddingBottom: number): { maxHeight: number; paddingBottom: number } {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  return {
    maxHeight: windowHeight - insets.top - 100,
    paddingBottom: basePaddingBottom + insets.bottom,
  };
}
