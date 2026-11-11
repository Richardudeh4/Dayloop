import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora } from '@/components/kairo/aurora';
import { tap } from '@/components/kairo/buttons';
import { Icon } from '@/components/kairo/icon';
import { MomentRing } from '@/components/kairo/moment-ring';
import { colors, fonts, shadow } from '@/theme/kairo';

/** Today's plan. Placeholder until the planner (spec §3.1) is built. */
export default function Today() {
  const insets = useSafeAreaInsets();
  const stage = useSharedValue(1);
  const progress = useSharedValue(1);
  const check = useSharedValue(1);
  const date = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <StatusBar style="dark" />
      <Aurora stage={stage} />
      <View style={styles.topRow}>
        <Animated.Text entering={FadeInDown.delay(100)} style={styles.date}>
          {date}
        </Animated.Text>
        <Pressable
          onPress={() => {
            tap();
            router.push('/lists');
          }}
          accessibilityRole="button"
          accessibilityLabel="Lists"
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
        >
          <Icon name="lists" size={20} color={colors.text} />
        </Pressable>
      </View>
      <Animated.Text entering={FadeInDown.delay(180)} style={styles.title} accessibilityRole="header">
        Today
      </Animated.Text>
      <Animated.View entering={FadeInDown.delay(300)} style={styles.empty}>
        <MomentRing size={140} progress={progress} check={check} />
        <Text style={styles.emptyTitle}>Nothing planned yet</Text>
        <Text style={styles.emptyBody}>Add a meeting and Kairo will put a Join button on its reminder.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  date: { color: colors.textFaint, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.6 },
  title: { color: colors.text, fontFamily: fonts.serif, fontSize: 52, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 80 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptyBody: { color: colors.textDim, fontSize: 15, textAlign: 'center', maxWidth: 280, lineHeight: 21 },
});

