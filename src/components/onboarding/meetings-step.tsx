import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { tap } from '@/components/kairo/buttons';
import { Icon } from '@/components/kairo/icon';
import { PROVIDERS } from '@/lib/meeting-links';
import { updateOnboarding } from '@/lib/onboarding-store';
import { colors, radius } from '@/theme/kairo';
import { StepLayout } from './step-layout';
import type { StepProps } from './types';

function Marquee({ reverse, offset = 0 }: { reverse?: boolean; offset?: number }) {
  const reduceMotion = useReducedMotion();
  const { width: screen } = useWindowDimensions();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const items = [...PROVIDERS.slice(offset), ...PROVIDERS.slice(0, offset)];

  useEffect(() => {
    if (!w || reduceMotion) return;
    x.set(0);
    x.set(withRepeat(withTiming(1, { duration: w * 28, easing: Easing.linear }), -1, false));
  }, [w, x, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: (reverse ? -w + x.value * w : -x.value * w) }],
  }));

  const row = (copy: number) => (
    <View style={styles.marqueeRow} onLayout={copy === 0 ? (e) => setW(e.nativeEvent.layout.width) : undefined}>
      {items.map((p) => (
        <View key={`${copy}-${p.id}`} style={styles.chip}>
          <View style={[styles.chipDot, { backgroundColor: p.color }]} />
          <Text style={styles.chipText}>{p.name}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.marquee, { width: screen, marginLeft: -24 }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Animated.View style={[styles.marqueeTrack, style]}>
        {row(0)}
        {row(1)}
      </Animated.View>
    </View>
  );
}

function Choice({ title, detail, icon, onPress, index }: { title: string; detail: string; icon: 'video' | 'calendar'; onPress: () => void; index: number }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Animated.View entering={FadeInDown.delay(620 + index * 90).springify().damping(18)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${detail}`}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => {
          tap();
          onPress();
        }}
        style={[styles.choice, pressed && styles.choicePressed]}
      >
        <View style={styles.choiceIcon}>
          <Icon name={icon} size={22} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.choiceTitle}>{title}</Text>
          <Text style={styles.choiceDetail}>{detail}</Text>
        </View>
        <Icon name="arrow" size={20} color={colors.textFaint} />
      </Pressable>
    </Animated.View>
  );
}

export function MeetingsStep({ next }: StepProps) {
  const choose = (joins: boolean) => {
    updateOnboarding({ joinsMeetings: joins });
    next();
  };
  return (
    <StepLayout
      title="Do you join *online* meetings?"
      subtitle="Kairo spots the link and puts a Join button right on the reminder."
      footer={
        <View style={{ gap: 10 }}>
          <Choice index={0} icon="video" title="Yes, most days" detail="Set up one-tap Join" onPress={() => choose(true)} />
          <Choice index={1} icon="calendar" title="Not really" detail="Just plans and reminders" onPress={() => choose(false)} />
        </View>
      }
    >
      <View style={{ gap: 10 }}>
        <Marquee />
        <Marquee reverse offset={4} />
      </View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  marquee: { overflow: 'hidden', height: 40 },
  marqueeTrack: { flexDirection: 'row' },
  marqueeRow: { flexDirection: 'row', gap: 10, paddingRight: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  choicePressed: { backgroundColor: colors.brandSoft, borderColor: colors.brand, transform: [{ scale: 0.98 }] },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandTint,
  },
  choiceTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  choiceDetail: { color: colors.textFaint, fontSize: 14, marginTop: 2 },
});
