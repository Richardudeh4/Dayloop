import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme/kairo';

/**
 * The Kairo mark as a live instrument.
 *
 * Geometry matches assets/brand/mark.svg (1024 grid): ring radius 300, a
 * 64° gap centred on 45° (the "moment"). `progress` moves the moment dot one
 * full turn around the ring; the trailing arc grows behind it. At
 * progress = 1 and check = 1 the drawing is exactly the logo.
 */
const C = 512;
const R = 300;
const GAP_CENTER = 45;
const HALF_GAP = 32;
const CHECK = 'M414 484 L496 566 L646 416';
const CHECK_LEN = 116 + 213; // two arms, rounded up
const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

function point(deg: number, r: number) {
  'worklet';
  const t = (deg * Math.PI) / 180;
  return { x: C + r * Math.sin(t), y: C - r * Math.cos(t) };
}

function Tick({ angle, progress }: { angle: number; progress: SharedValue<number> }) {
  // Fraction of the turn at which the dot passes this tick.
  const at = (((angle - GAP_CENTER) % 360) + 360) % 360 / 360;
  const a = point(angle, 396);
  const b = point(angle, angle % 90 === 0 ? 428 : 416);
  const props = useAnimatedProps(() => {
    const lit = Math.min(1, Math.max(0, (progress.value - at) * 14));
    return { strokeOpacity: 0.25 + lit * 0.75 };
  });
  return (
    <AnimatedLine
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={colors.border}
      strokeWidth={10}
      strokeLinecap="round"
      animatedProps={props}
    />
  );
}

function useRipple(burst: SharedValue<number> | undefined, delay: number) {
  return useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, ((burst?.value ?? 0) - delay) / (1 - delay)));
    return {
      opacity: t > 0 && t < 1 ? (1 - t) * 0.7 : 0,
      transform: [{ scale: 0.6 + t * 0.75 }],
    };
  });
}

type Props = {
  size: number;
  progress: SharedValue<number>;
  check: SharedValue<number>;
  /** 0 → 1 fires an expanding ripple from the ring. */
  burst?: SharedValue<number>;
  children?: ReactNode;
};

export function MomentRing({ size, progress, check, burst, children }: Props) {
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    breath.set(withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    ));
  }, [breath, reduceMotion]);

  const arcProps = useAnimatedProps(() => {
    const start = GAP_CENTER + HALF_GAP;
    const end = GAP_CENTER - HALF_GAP + 360 * progress.value;
    const sweep = end - start;
    if (sweep <= 0.5) return { d: 'M0 0', strokeOpacity: 0 };
    const s = point(start, R);
    const e = point(end, R);
    const large = sweep > 180 ? 1 : 0;
    return {
      d: `M${s.x} ${s.y} A${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`,
      strokeOpacity: Math.min(1, sweep / 12),
    };
  });

  const dotProps = useAnimatedProps(() => {
    const p = point(GAP_CENTER + 360 * progress.value, R);
    return { cx: p.x, cy: p.y };
  });

  const haloProps = useAnimatedProps(() => {
    const p = point(GAP_CENTER + 360 * progress.value, R);
    return { cx: p.x, cy: p.y, r: 120 + breath.value * 40, opacity: 0.55 + breath.value * 0.3 };
  });

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LEN * (1 - check.value),
    strokeOpacity: check.value > 0.01 ? 1 : 0,
  }));

  const ripple1 = useRipple(burst, 0);
  const ripple2 = useRipple(burst, 0.25);

  return (
    <View style={{ width: size, height: size }} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Animated.View style={[styles.ripple, { width: size, height: size, borderRadius: size / 2 }, ripple1]} />
      <Animated.View style={[styles.ripple, { width: size, height: size, borderRadius: size / 2 }, ripple2]} />
      <Svg width={size} height={size} viewBox="-70 -70 1164 1164">
        <Defs>
          <LinearGradient id="ring" x1="230" y1="820" x2="800" y2="220" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.brand} />
            <Stop offset="1" stopColor={colors.brandBright} />
          </LinearGradient>
          <RadialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={colors.brandBright} stopOpacity="0.45" />
            <Stop offset="0.5" stopColor={colors.brandBright} stopOpacity="0.12" />
            <Stop offset="1" stopColor={colors.brandBright} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {TICKS.map((a) => (
          <Tick key={a} angle={a} progress={progress} />
        ))}

        {/* The whole day, faint */}
        <Circle cx={C} cy={C} r={R} stroke={colors.brand} strokeOpacity={0.08} strokeWidth={96} fill="none" />

        <AnimatedPath
          animatedProps={arcProps}
          stroke="url(#ring)"
          strokeWidth={96}
          strokeLinecap="round"
          fill="none"
        />

        <AnimatedPath
          d={CHECK}
          animatedProps={checkProps}
          stroke={colors.brand}
          strokeWidth={58}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${CHECK_LEN} ${CHECK_LEN}`}
          fill="none"
        />

        <AnimatedCircle animatedProps={haloProps} fill="url(#halo)" />
        <AnimatedCircle animatedProps={dotProps} r={54} fill={colors.white} stroke={colors.brandBright} strokeWidth={14} />
      </Svg>
      {children ? <View style={StyleSheet.absoluteFill}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ripple: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.brandBright,
  },
});
