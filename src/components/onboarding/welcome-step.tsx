import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Footer, PrimaryButton } from '@/components/kairo/buttons';
import { StepLayout } from './step-layout';
import type { StepProps } from './types';
import { colors } from '@/theme/kairo';

export function WelcomeStep({ next }: StepProps) {
  return (
    <StepLayout
      bottom
      eyebrow="Kairo"
      title="Never miss the *moment.*"
      subtitle="Your day, on time. When a meeting starts, one tap and you're in."
      footer={
        <Footer>
          <PrimaryButton label="Get started" onPress={next} />
          <Animated.View entering={FadeIn.delay(900)}>
            <Text style={styles.note}>No account needed · Works offline</Text>
          </Animated.View>
        </Footer>
      }
    />
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
});
