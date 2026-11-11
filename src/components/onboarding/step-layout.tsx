import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KineticTitle } from '@/components/kairo/kinetic-title';
import { colors } from '@/theme/kairo';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  footer: ReactNode;
  /** Push content to the bottom (hero steps). */
  bottom?: boolean;
};

export function StepLayout({ eyebrow, title, subtitle, children, footer, bottom }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, bottom && styles.bottom]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {eyebrow ? (
          <Animated.Text entering={FadeIn.delay(60)} style={styles.eyebrow}>
            {eyebrow}
          </Animated.Text>
        ) : null}
        <KineticTitle text={title} />
        {subtitle ? (
          <Animated.View entering={FadeInDown.delay(380).duration(500)}>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </Animated.View>
        ) : null}
        {children ? (
          <Animated.View entering={FadeInDown.delay(480).duration(550)} style={styles.body}>
            {children}
          </Animated.View>
        ) : null}
      </ScrollView>
      <Animated.View entering={FadeInDown.delay(560).duration(500)} style={{ paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: 24 }}>
        {footer}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingTop: 8, paddingBottom: 8, paddingHorizontal: 24 },
  bottom: { justifyContent: 'flex-end' },
  eyebrow: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.4,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  subtitle: { color: colors.textDim, fontSize: 17, lineHeight: 25, marginTop: 14 },
  body: { marginTop: 24 },
});
