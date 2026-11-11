import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Footer, GhostButton, PrimaryButton } from '@/components/kairo/buttons';
import { Icon } from '@/components/kairo/icon';
import { updateOnboarding } from '@/lib/onboarding-store';
import { requestReminderPermission } from '@/lib/reminders';
import { colors, radius } from '@/theme/kairo';
import { NotificationStack } from './notification-preview';
import { StepLayout } from './step-layout';
import type { StepProps } from './types';

type Outcome = null | 'provisional' | 'denied';

export function NotificationsStep({ next }: StepProps) {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const allow = async () => {
    setBusy(true);
    try {
      const result = await requestReminderPermission();
      updateOnboarding({ notifications: result });
      if (result === 'granted') next();
      else setOutcome(result);
    } catch {
      updateOnboarding({ notifications: 'denied' });
      setOutcome('denied');
    } finally {
      setBusy(false);
    }
  };

  // Spec §2 "Degrade honestly": say what won't work and offer the fix.
  if (outcome) {
    const quiet = outcome === 'provisional';
    return (
      <StepLayout
        title={quiet ? 'Alerts will be *quiet.*' : 'Reminders are *off.*'}
        subtitle={
          quiet
            ? 'iOS will deliver Kairo alerts silently to Notification Centre. Turn on alerts in Settings to hear your meetings start.'
            : 'Kairo still works as a planner, but it can’t tell you when a meeting starts. You can turn reminders on any time in Settings.'
        }
        footer={
          <Footer>
            <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} />
            <GhostButton label="Continue anyway" onPress={next} />
          </Footer>
        }
      >
        <Animated.View entering={FadeInDown.delay(500)} style={styles.warning}>
          <Icon name="bell" size={22} color={colors.warning} />
          <Text style={styles.warningText}>{quiet ? 'Quiet delivery: no sound or banner' : 'Notifications: not allowed'}</Text>
        </Animated.View>
      </StepLayout>
    );
  }

  return (
    <StepLayout
      title="Reminders need *your* OK."
      subtitle="Kairo only alerts you for things you plan, 5 minutes before and at the start."
      footer={
        <Footer>
          <PrimaryButton label="Allow notifications" loading={busy} onPress={allow} />
          <GhostButton
            label="Not now"
            onPress={() => {
              updateOnboarding({ notifications: 'skipped' });
              next();
            }}
          />
        </Footer>
      }
    >
      <View style={styles.preview}>
        <NotificationStack />
      </View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  preview: { paddingBottom: 8 },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.warningTint,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningText: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
});
