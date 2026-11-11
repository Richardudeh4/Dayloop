import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora } from '@/components/kairo/aurora';
import { tap } from '@/components/kairo/buttons';
import { Icon } from '@/components/kairo/icon';
import { MomentRing } from '@/components/kairo/moment-ring';
import { CalendarStep } from '@/components/onboarding/calendar-step';
import { DoneStep } from '@/components/onboarding/done-step';
import { MeetingsStep } from '@/components/onboarding/meetings-step';
import { NotificationsStep } from '@/components/onboarding/notifications-step';
import { ReliabilityStep } from '@/components/onboarding/reliability-step';
import { TestStep } from '@/components/onboarding/test-step';
import type { RingControls, StepProps } from '@/components/onboarding/types';
import { WelcomeStep } from '@/components/onboarding/welcome-step';
import { updateOnboarding } from '@/lib/onboarding-store';
import { colors } from '@/theme/kairo';

type RingMode = 'hero' | 'compact' | 'focus';
type Step = { id: string; ring: RingMode; Component: ComponentType<StepProps> };

/** Spec §4.1, in order. Native-only steps are dropped on web. */
function buildSteps(): Step[] {
  const native = Platform.OS !== 'web';
  const steps: (Step | false)[] = [
    { id: 'welcome', ring: 'hero', Component: WelcomeStep },
    { id: 'meetings', ring: 'compact', Component: MeetingsStep },
    native && { id: 'notifications', ring: 'compact', Component: NotificationsStep },
    native && { id: 'calendar', ring: 'compact', Component: CalendarStep },
    Platform.OS === 'android' && { id: 'reliability', ring: 'compact', Component: ReliabilityStep },
    { id: 'test', ring: 'focus', Component: TestStep },
    { id: 'done', ring: 'hero', Component: DoneStep },
  ];
  return steps.filter(Boolean) as Step[];
}

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

export default function Onboarding() {
  const steps = useMemo(() => buildSteps(), []);
  const [index, setIndex] = useState(0);
  const [center, setCenter] = useState<ReactNode>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const step = steps[index];
  const last = steps.length - 1;
  const ringSize = Math.min(width * 0.95, 440);

  const zoneFor = useCallback(
    (mode: RingMode) => (mode === 'hero' ? height * 0.44 : mode === 'focus' ? height * 0.36 : Math.max(120, height * 0.16)),
    [height],
  );

  const progress = useSharedValue(0);
  const check = useSharedValue(0);
  const burst = useSharedValue(0);
  const stage = useSharedValue(0);
  const zone = useSharedValue(zoneFor('hero'));

  // Every step moves the moment dot further round the loop.
  useEffect(() => {
    const target = step.id === 'done' ? 1 : index / last;
    progress.set(withTiming(target, { duration: 1200, easing: EASE }));
    if (step.id !== 'done' && step.id !== 'test') check.set(withTiming(0, { duration: 250 }));
    stage.set(withTiming(index / last, { duration: 1600, easing: EASE }));
    zone.set(withSpring(zoneFor(step.ring), { damping: 20, stiffness: 120 }));
  }, [index, last, step, progress, check, stage, zone, zoneFor]);

  const ring: RingControls = { progress, check, burst, setCenter };

  const next = useCallback(() => {
    if (index >= last) {
      updateOnboarding({ completed: true });
      router.replace('/');
      return;
    }
    setIndex((i) => Math.min(i + 1, last));
  }, [index, last]);

  const canGoBack = index > 0 && step.id !== 'done';
  const back = useCallback(() => {
    if (!canGoBack) return false;
    tap();
    setCenter(null);
    setIndex((i) => Math.max(0, i - 1));
    return true;
  }, [canGoBack]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]);

  const zoneStyle = useAnimatedStyle(() => ({ height: zone.value }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.min(1.15, zone.value / (ringSize * 0.78)) }],
  }));

  const counted = steps.filter((s) => s.id !== 'welcome' && s.id !== 'done');
  const countedIndex = counted.findIndex((s) => s.id === step.id);
  const Body = step.Component;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Aurora stage={stage} />

      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {canGoBack ? (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={12} style={styles.back}>
              <Icon name="back" size={22} color={colors.textDim} />
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.back} />
        )}
        {countedIndex >= 0 ? (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.segments}
            accessible
            accessibilityLabel={`Step ${countedIndex + 1} of ${counted.length}`}
          >
            {counted.map((s, i) => (
              <View key={s.id} style={[styles.segment, i <= countedIndex && styles.segmentOn]} />
            ))}
          </Animated.View>
        ) : null}
        <View style={styles.back} />
      </View>

      <Animated.View style={[styles.ringZone, zoneStyle]}>
        <Animated.View style={ringStyle}>
          <MomentRing size={ringSize} progress={progress} check={check} burst={burst}>
            {center}
          </MomentRing>
        </Animated.View>
      </Animated.View>

      <View style={styles.content}>
        <Animated.View
          key={step.id}
          entering={FadeIn.duration(380)}
          exiting={FadeOut.duration(180)}
          style={StyleSheet.absoluteFill}
        >
          <Body next={next} ring={ring} />
        </Animated.View>
      </View>
      {Platform.OS === 'web' ? <Text style={styles.webNote}>Preview: reminders need the phone app.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 44 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', gap: 6, flex: 1, maxWidth: 200 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.hairline },
  segmentOn: { backgroundColor: colors.brand },
  ringZone: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  content: { flex: 1 },
  webNote: { position: 'absolute', bottom: 4, alignSelf: 'center', color: colors.textFaint, fontSize: 11 },
});
