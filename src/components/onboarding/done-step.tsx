import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, withTiming } from 'react-native-reanimated';

import { Footer, PrimaryButton } from '@/components/kairo/buttons';
import { Icon } from '@/components/kairo/icon';
import { useOnboarding, type OnboardingState } from '@/lib/onboarding-store';
import { colors, radius } from '@/theme/kairo';
import { StepLayout } from './step-layout';
import type { StepProps } from './types';

function summary(s: OnboardingState) {
  return [
    {
      label: 'Meeting reminders',
      on: s.notifications === 'granted' || s.notifications === 'provisional',
      value:
        s.notifications === 'granted' ? 'On' : s.notifications === 'provisional' ? 'Quiet' : 'Off',
    },
    {
      label: 'Calendar',
      on: s.calendar === 'granted',
      value: s.calendar === 'granted' ? 'Connected' : 'Not connected',
    },
    {
      label: 'One-tap Join',
      on: s.testReminder === 'joined',
      value: s.testReminder === 'joined' ? 'Tested' : 'Ready',
    },
  ];
}

export function DoneStep({ next, ring }: StepProps) {
  const state = useOnboarding();
  const { check, burst } = ring;
  const alreadyCelebrated = state.testReminder === 'joined';

  useEffect(() => {
    check.set(withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    if (!alreadyCelebrated) {
      burst.set(0);
      burst.set(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }));
    }
  }, [alreadyCelebrated, burst, check]);

  return (
    <StepLayout
      bottom
      title="You’re *set.*"
      subtitle="Your day is planned around the moments that matter."
      footer={
        <Footer>
          <PrimaryButton label="See today’s plan" onPress={next} />
        </Footer>
      }
    >
      <View style={styles.list}>
        {summary(state).map((item, i) => (
          <Animated.View key={item.label} entering={FadeInDown.delay(500 + i * 90)} style={styles.item}>
            <View style={[styles.badge, item.on && styles.badgeOn]}>
              <Icon name={item.on ? 'check' : 'dash'} size={14} strokeWidth={3} color={item.on ? colors.white : colors.textFaint} />
            </View>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
          </Animated.View>
        ))}
      </View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, paddingHorizontal: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  badgeOn: { backgroundColor: colors.success },
  label: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  value: { color: colors.textDim, fontSize: 14, flexShrink: 1, textAlign: 'right' },
});
