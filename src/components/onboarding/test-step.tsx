import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, SlideInDown, withSequence, withTiming } from 'react-native-reanimated';

import { Footer, GhostButton, PrimaryButton } from '@/components/kairo/buttons';
import { Icon } from '@/components/kairo/icon';
import { getOnboarding, updateOnboarding } from '@/lib/onboarding-store';
import {
  ACTION_SNOOZE,
  cancelTestReminder,
  getReminderPermission,
  scheduleTestReminder,
  TEST_REMINDER_ID,
} from '@/lib/reminders';
import { colors, fonts, radius } from '@/theme/kairo';
import { StepLayout } from './step-layout';
import type { StepProps } from './types';

const SECONDS = 10;
type Phase = 'idle' | 'counting' | 'arrived' | 'joined' | 'snoozed';

const haptic = (t: Haptics.NotificationFeedbackType) => {
  if (Platform.OS !== 'web') Haptics.notificationAsync(t).catch(() => {});
};

function Countdown({ value }: { value: number }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite" accessibilityLabel={`${value} seconds`}>
      <Animated.Text key={value} entering={FadeInDown.duration(260)} style={styles.count}>
        {value}
      </Animated.Text>
    </View>
  );
}

/** In-app alarm-style alert (spec §4.3 step 2): Join is the first, largest target. */
function JoinSheet({ onJoin, onSnooze }: { onJoin: () => void; onSnooze: () => void }) {
  return (
    <Animated.View entering={SlideInDown.springify().damping(16)} style={styles.sheet}>
      <View style={styles.sheetHead}>
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>NOW</Text>
        </View>
        <Text style={styles.sheetMeta}>Test meeting</Text>
      </View>
      <Text style={styles.sheetTitle}>Design review</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Join Design review"
        onPress={onJoin}
        style={({ pressed }) => [styles.join, pressed && { transform: [{ scale: 0.97 }] }]}
      >
        <Icon name="video" size={22} color={colors.onBrand} />
        <Text style={styles.joinText}>Join</Text>
      </Pressable>
      <GhostButton label="Snooze 2 min" onPress={onSnooze} />
    </Animated.View>
  );
}

export function TestStep({ next, ring }: StepProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(SECONDS);
  const [notifOk, setNotifOk] = useState(() => {
    const n = getOnboarding().notifications;
    return n === 'granted' || n === 'provisional';
  });
  const phaseRef = useRef<Phase>('idle');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const shown = useRef(SECONDS);
  const { progress, check, burst, setCenter } = ring;

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const arrive = useCallback(() => {
    if (phaseRef.current !== 'counting') return;
    if (timer.current) clearInterval(timer.current);
    setCenter(null);
    go('arrived');
    haptic(Haptics.NotificationFeedbackType.Warning);
  }, [go, setCenter]);

  const join = useCallback(() => {
    if (phaseRef.current === 'joined') return;
    if (timer.current) clearInterval(timer.current);
    setCenter(null);
    go('joined');
    progress.set(withTiming(1, { duration: 300 }));
    check.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    burst.set(0);
    burst.set(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }));
    haptic(Haptics.NotificationFeedbackType.Success);
    updateOnboarding({ testReminder: 'joined' });
    if (Platform.OS !== 'web') Notifications.dismissNotificationAsync(TEST_REMINDER_ID).catch(() => {});
  }, [burst, check, go, progress, setCenter]);

  const snooze = useCallback(() => {
    go('snoozed');
    updateOnboarding({ testReminder: 'delivered' });
  }, [go]);

  // Real notification arriving in the foreground, or tapped from the system UI.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const received = Notifications.addNotificationReceivedListener((n) => {
      if (n.request.identifier === TEST_REMINDER_ID) arrive();
    });
    const response = Notifications.addNotificationResponseReceivedListener((r) => {
      if (r.notification.request.identifier !== TEST_REMINDER_ID) return;
      if (r.actionIdentifier === ACTION_SNOOZE) snooze();
      else join();
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, [arrive, join, snooze]);

  useEffect(() => {
    getReminderPermission().then((p) => setNotifOk(p !== 'denied'), () => {});
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (phaseRef.current === 'counting') cancelTestReminder();
      setCenter(null);
    };
  }, [setCenter]);

  const send = async () => {
    if (notifOk) {
      try {
        await scheduleTestReminder(SECONDS);
      } catch {
        setNotifOk(false);
      }
    }
    go('counting');
    check.set(withTiming(0, { duration: 300 }));
    // Rewind the loop, then let it close in real time with the reminder.
    progress.set(withSequence(
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: SECONDS * 1000 - 600, easing: Easing.linear }),
    ));
    const startedAt = Date.now();
    shown.current = SECONDS;
    setLeft(SECONDS);
    setCenter(<Countdown value={SECONDS} />);
    timer.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const l = Math.max(0, Math.ceil((SECONDS * 1000 - elapsed) / 1000));
      if (l !== shown.current) {
        shown.current = l;
        setLeft(l);
        if (l > 0) setCenter(<Countdown value={l} />);
      }
      // Fallback when the OS notification is not shown in the foreground.
      if (elapsed >= SECONDS * 1000 + 400) arrive();
    }, 200);
  };

  if (phase === 'joined' || phase === 'snoozed') {
    const joined = phase === 'joined';
    return (
      <StepLayout
        title={joined ? 'You’re *in.*' : 'Snoozed.'}
        subtitle={
          joined
            ? 'That’s the whole trick. At a real meeting, Join opens Zoom, Meet or Teams and copies the passcode for you.'
            : 'At a real meeting, the reminder comes back in 2 minutes, up to 5 times.'
        }
        footer={
          <Footer>
            <PrimaryButton label="Continue" onPress={next} />
          </Footer>
        }
      />
    );
  }

  if (phase === 'arrived') {
    return (
      <StepLayout
        title="It’s *time.*"
        subtitle={notifOk ? 'This is the alert you’ll see when a meeting starts.' : 'Notifications are off, so this alert only appears while Kairo is open.'}
        footer={<JoinSheet onJoin={join} onSnooze={snooze} />}
      />
    );
  }

  if (phase === 'counting') {
    return (
      <StepLayout
        title="Watch the *loop* close."
        subtitle={notifOk ? `Your test reminder lands in ${left}s. Lock your phone if you like, it still arrives.` : `Arriving in ${left}s.`}
        footer={
          <Footer>
            <GhostButton
              label="Cancel test"
              onPress={() => {
                if (timer.current) clearInterval(timer.current);
                cancelTestReminder();
                setCenter(null);
                go('idle');
              }}
            />
          </Footer>
        }
      />
    );
  }

  return (
    <StepLayout
      title="Let’s *try* it."
      subtitle={
        notifOk
          ? `We’ll send a test reminder in ${SECONDS} seconds. Tap Join when it arrives.`
          : 'Notifications are off, so the test will only play inside Kairo.'
      }
      footer={
        <Footer>
          <PrimaryButton label="Send test reminder" onPress={send} />
          <GhostButton
            label="Skip"
            onPress={() => {
              updateOnboarding({ testReminder: 'skipped' });
              next();
            }}
          />
        </Footer>
      }
    >
      <Animated.Text entering={FadeIn.delay(700)} style={styles.hint}>
        Takes {SECONDS} seconds
      </Animated.Text>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: fonts.serif, color: colors.brand, fontSize: 120, lineHeight: 128 },
  hint: { color: colors.textFaint, fontSize: 13 },
  sheet: {
    borderRadius: radius.lg,
    padding: 18,
    paddingBottom: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    boxShadow: '0 -8px 40px rgba(15,23,42,0.14)',
    gap: 6,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.brandTint },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand },
  liveText: { color: colors.brand, fontWeight: '800', fontSize: 11, letterSpacing: 1.4 },
  sheetMeta: { color: colors.textFaint, fontSize: 13 },
  sheetTitle: { color: colors.text, fontFamily: fonts.serif, fontSize: 32, marginTop: 4, marginBottom: 10 },
  join: {
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  joinText: { color: colors.onBrand, fontSize: 20, fontWeight: '800' },
});
