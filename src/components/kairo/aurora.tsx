import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme/kairo';

type BlobDef = {
  color: string;
  size: number;
  /** Anchor positions (fractions of the screen) for each onboarding stage. */
  path: [number, number][];
  period: number;
  opacity: number;
};

// Two soft washes of light: brand teal and a cool sky blue. Kept faint so
// text on top always reads cleanly.
const BLOBS: BlobDef[] = [
  { color: colors.brandBright, size: 1.25, opacity: 0.16, period: 13000, path: [[-0.2, -0.15], [0.1, -0.2], [-0.3, 0.05], [0.25, 0.25]] },
  { color: '#38BDF8', size: 1.05, opacity: 0.12, period: 15000, path: [[0.45, 0.55], [0.15, 0.6], [0.5, 0.7], [0.3, 0.5]] },
];

function Blob({ def, stage, drift, index }: { def: BlobDef; stage: SharedValue<number>; drift: SharedValue<number>; index: number }) {
  const { width, height } = useWindowDimensions();
  const d = width * def.size;
  const xs = def.path.map((p) => p[0] * width);
  const ys = def.path.map((p) => p[1] * height);
  const input = def.path.map((_, i) => i / (def.path.length - 1));

  const style = useAnimatedStyle(() => {
    const phase = drift.value * Math.PI * 2 + index * 2.1;
    return {
      transform: [
        { translateX: interpolate(stage.value, input, xs) + Math.sin(phase) * width * 0.06 },
        { translateY: interpolate(stage.value, input, ys) + Math.cos(phase * 0.8) * height * 0.04 },
        { scale: 1 + Math.sin(phase * 1.3) * 0.08 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.blob, { width: d, height: d }, style]}>
      <Svg width={d} height={d}>
        <Defs>
          <RadialGradient id={`b${index}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={def.color} stopOpacity={def.opacity} />
            <Stop offset="0.55" stopColor={def.color} stopOpacity={def.opacity * 0.35} />
            <Stop offset="1" stopColor={def.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={d / 2} fill={`url(#b${index})`} />
      </Svg>
    </Animated.View>
  );
}

/** Calm background: soft light drifting over the page. `stage` (0–1) re-composes it per step. */
export function Aurora({ stage }: { stage: SharedValue<number> }) {
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    drift.set(withRepeat(withTiming(1, { duration: 16000, easing: Easing.linear }), -1, false));
  }, [drift, reduceMotion]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[colors.brandSoft, colors.bg, colors.bg]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      {BLOBS.map((b, i) => (
        <Blob key={i} def={b} stage={stage} drift={drift} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', left: 0, top: 0 },
});
