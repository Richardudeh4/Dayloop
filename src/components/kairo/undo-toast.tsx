import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '@/components/kairo/buttons';
import { colors, radius, shadow } from '@/theme/kairo';

type Props = {
  /** Changing the key restarts the timer (a second delete replaces the first toast). */
  id: string;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
};

/** Bottom toast with an Undo button. Auto-dismisses; stays longer for screen readers. */
export function UndoToast({ id, message, onUndo, onDismiss, duration = 5000 }: Props) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    AccessibilityInfo.isScreenReaderEnabled().then((sr) => {
      if (cancelled) return;
      if (sr) AccessibilityInfo.announceForAccessibility(`${message}. Undo available.`);
      timer = setTimeout(onDismiss, sr ? duration * 2 : duration);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Restart only when a new toast replaces this one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <Animated.View
      key={id}
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOutDown.duration(160)}
      style={[styles.toast, { bottom: Math.max(insets.bottom, 16) + 8 }]}
    >
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      <Pressable
        onPress={() => {
          tap();
          onUndo();
        }}
        accessibilityRole="button"
        accessibilityLabel="Undo"
        hitSlop={10}
        style={({ pressed }) => [styles.undo, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.undoLabel}>Undo</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingLeft: 18,
    paddingRight: 8,
    borderRadius: radius.md,
    // Inverted (dark on light) so it stands apart from the page.
    backgroundColor: colors.text,
    boxShadow: shadow.raised,
  },
  message: { flex: 1, color: colors.white, fontSize: 15 },
  undo: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  undoLabel: { color: '#5EEAD4', fontSize: 15, fontWeight: '700' },
});
