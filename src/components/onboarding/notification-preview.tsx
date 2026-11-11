import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, shadow } from '@/theme/kairo';

function AppGlyph() {
  return (
    <View style={styles.glyph}>
      <View style={styles.glyphRing} />
      <View style={styles.glyphDot} />
    </View>
  );
}

/** A mock lock-screen notification, used to show what a Join reminder looks like. */
export function NotificationCard({ title, body, time, actions = true, dim }: { title: string; body: string; time: string; actions?: boolean; dim?: boolean }) {
  return (
    <View style={[styles.card, dim && styles.cardDim]}>
      <View style={styles.header}>
        <AppGlyph />
        <Text style={styles.app}>KAIRO</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actions ? (
        <View style={styles.actions}>
          <View style={[styles.action, styles.actionPrimary]}>
            <Text style={styles.actionPrimaryText}>Join</Text>
          </View>
          <View style={styles.action}>
            <Text style={styles.actionText}>Snooze 2 min</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function NotificationStack() {
  const reduceMotion = useReducedMotion();
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    float.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [float, reduceMotion]);

  const front = useAnimatedStyle(() => ({ transform: [{ translateY: -4 + float.value * 8 }, { rotate: '-1.5deg' }] }));
  const back = useAnimatedStyle(() => ({ transform: [{ translateY: 4 - float.value * 6 }, { scale: 0.92 }, { rotate: '2deg' }] }));

  return (
    <View style={styles.stack} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Animated.View entering={FadeInUp.delay(500).springify().damping(14)} style={[styles.backWrap, back]}>
        <NotificationCard dim title="Standup · now" body="meet.google.com" time="9:00" actions={false} />
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(700).springify().damping(13)} style={front}>
        <NotificationCard title="Design review in 5 min" body="Zoom · Passcode copied when you join" time="2:55 PM" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { paddingTop: 34 },
  backWrap: { position: 'absolute', left: 0, right: 0, top: 0 },
  card: {
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    boxShadow: shadow.raised,
  },
  cardDim: { opacity: 0.55 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  app: { color: colors.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, flex: 1 },
  time: { color: colors.textFaint, fontSize: 12 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  body: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  action: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  actionPrimary: { backgroundColor: colors.brand },
  actionPrimaryText: { color: colors.onBrand, fontWeight: '800', fontSize: 15 },
  actionText: { color: colors.textDim, fontWeight: '600', fontSize: 14 },
  glyph: { width: 18, height: 18, borderRadius: 5, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  glyphRing: { width: 11, height: 11, borderRadius: 6, borderWidth: 2.4, borderColor: colors.white },
  glyphDot: { position: 'absolute', top: 2.5, right: 2.5, width: 4.5, height: 4.5, borderRadius: 3, backgroundColor: colors.brandTint },
});
