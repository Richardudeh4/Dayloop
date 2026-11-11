import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, radius, shadow } from '@/theme/kairo';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function tap(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

type ButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  hint?: string;
};

/** Solid brand pill. The one obvious next step on a screen. */
export function PrimaryButton({ label, onPress, loading, disabled, hint }: ButtonProps) {
  const press = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.03 }],
    backgroundColor: interpolateColor(press.value, [0, 1], [colors.brand, colors.brandPressed]),
  }));
  const inactive = !!disabled || !!loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      disabled={inactive}
      onPressIn={() => press.set(withSpring(1, { damping: 18, stiffness: 400 }))}
      onPressOut={() => press.set(withSpring(0, { damping: 14, stiffness: 300 }))}
      onPress={() => {
        tap(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={[styles.primary, inactive && styles.disabled, pressStyle]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onBrand} />
      ) : (
        <Text style={styles.primaryLabel} maxFontSizeMultiplier={1.6}>
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}

export function GhostButton({ label, onPress, hint }: Omit<ButtonProps, 'loading'>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={hint}
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.5 }]}
    >
      <Text style={styles.ghostLabel} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Footer({ children }: { children: React.ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    boxShadow: shadow.brand,
  },
  disabled: { opacity: 0.45 },
  primaryLabel: { color: colors.onBrand, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  ghost: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  ghostLabel: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
  footer: { gap: 6, paddingTop: 12 },
});
