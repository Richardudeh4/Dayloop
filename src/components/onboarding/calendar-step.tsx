import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Footer, GhostButton, PrimaryButton } from '@/components/kairo/buttons';
import { findMeetingLink, type Provider } from '@/lib/meeting-links';
import { getOnboarding, updateOnboarding } from '@/lib/onboarding-store';
import { colors, radius } from '@/theme/kairo';
import { StepLayout } from './step-layout';
import type { StepProps } from './types';

type Found = { id: string; title: string; start: Date; provider: Provider | null };
type Phase = 'idle' | 'scanning' | 'done' | 'denied' | 'error';

const DAYS = 14;

/** Placeholder rows shown before access is granted. */
const SAMPLE = [
  { title: 'Design review', time: 'Today · 2:55 PM', provider: 'Zoom', color: '#4A8CFF' },
  { title: 'Standup', time: 'Tomorrow · 9:00 AM', provider: 'Google Meet', color: '#34C47C' },
  { title: 'Client sync', time: 'Thu · 4:30 PM', provider: 'Teams', color: '#8B8CF8' },
];

function ScanLine() {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    y.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [y, reduceMotion]);
  const style = useAnimatedStyle(() => ({ top: `${y.value * 100}%` }));
  return (
    <Animated.View style={[styles.scan, style]} pointerEvents="none">
      <LinearGradient
        colors={['rgba(20,184,166,0)', 'rgba(20,184,166,0.35)', 'rgba(20,184,166,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function Row({ title, time, tag, color, index }: { title: string; time: string; tag?: string; color?: string; index: number }) {
  return (
    <Animated.View entering={FadeInRight.delay(200 + index * 90).springify().damping(18)} style={styles.row}>
      <View style={[styles.rowBar, { backgroundColor: color ?? colors.hairline }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowTime}>{time}</Text>
      </View>
      {tag ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const fmt = (d: Date) =>
  d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

export function CalendarStep({ next }: StepProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [events, setEvents] = useState<Found[]>([]);
  const meetingsUser = getOnboarding().joinsMeetings !== false;

  const scan = async () => {
    setPhase('scanning');
    try {
      // Loaded lazily: expo-calendar needs a development build, not Expo Go.
      const Calendar = await import('expo-calendar');
      const perm = await Calendar.requestCalendarPermissions();
      if (!perm.granted) {
        updateOnboarding({ calendar: 'denied' });
        setPhase('denied');
        return;
      }
      const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
      const now = new Date();
      const end = new Date(now.getTime() + DAYS * 864e5);
      const list = calendars.length ? await Calendar.listEvents(calendars, now, end) : [];
      const found: Found[] = list
        .filter((e) => !e.allDay)
        .map((e) => ({
          id: e.id,
          title: e.title || 'Untitled event',
          start: new Date(e.startDate),
          provider: findMeetingLink(e.url, e.location, e.notes)?.provider ?? null,
        }))
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      setEvents(found);
      updateOnboarding({ calendar: 'granted' });
      setPhase('done');
    } catch {
      setPhase('error');
    }
  };

  const withLinks = events.filter((e) => e.provider);

  if (phase === 'done') {
    const shown = [...withLinks, ...events.filter((e) => !e.provider)].slice(0, 5);
    return (
      <StepLayout
        title={withLinks.length ? `Found *${withLinks.length}* ${withLinks.length === 1 ? 'meeting' : 'meetings'}.` : 'Your calendar is *in.*'}
        subtitle={`${events.length} events in the next ${DAYS} days. ${withLinks.length ? 'Those with a link get a Join button.' : 'No meeting links yet. Add one to any event later.'}`}
        footer={
          <Footer>
            <PrimaryButton label="Continue" onPress={next} />
          </Footer>
        }
      >
        <View style={{ gap: 8 }}>
          {shown.map((e, i) => (
            <Row key={e.id} index={i} title={e.title} time={fmt(e.start)} tag={e.provider?.name} color={e.provider?.color} />
          ))}
        </View>
      </StepLayout>
    );
  }

  if (phase === 'denied' || phase === 'error') {
    return (
      <StepLayout
        title={phase === 'denied' ? 'No problem, *add* by hand.' : 'Calendar isn’t *available.*'}
        subtitle={
          phase === 'denied'
            ? 'Without calendar access, Kairo only reminds you about items you add yourself. You can import later in Settings.'
            : 'Calendar import needs the full Kairo build on a phone. You can import later in Settings.'
        }
        footer={
          <Footer>
            <PrimaryButton label="Continue" onPress={next} />
          </Footer>
        }
      />
    );
  }

  return (
    <StepLayout
      title={meetingsUser ? 'Find the meetings *already* planned.' : 'Bring your *calendar?*'}
      subtitle="Kairo reads your calendar on this phone and picks out meeting links. Nothing is uploaded."
      footer={
        <Footer>
          <PrimaryButton label="Import calendar" loading={phase === 'scanning'} onPress={scan} />
          <GhostButton
            label="Skip for now"
            onPress={() => {
              updateOnboarding({ calendar: 'skipped' });
              next();
            }}
          />
        </Footer>
      }
    >
      <Animated.View entering={FadeInDown.delay(400)} style={styles.sampleWrap} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {SAMPLE.map((s, i) => (
          <Row key={s.title} index={i} title={s.title} time={s.time} tag={s.provider} color={s.color} />
        ))}
        <ScanLine />
      </Animated.View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  sampleWrap: { gap: 8, overflow: 'hidden', borderRadius: radius.md },
  scan: { position: 'absolute', left: 0, right: 0, height: 2, marginTop: -1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  rowBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowTime: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  tagText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
});
