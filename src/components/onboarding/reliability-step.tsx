import * as Device from 'expo-device';
import { ActivityAction, startActivityAsync } from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Footer, PrimaryButton, tap } from '@/components/kairo/buttons';
import { Icon, type IconName } from '@/components/kairo/icon';
import { colors, radius } from '@/theme/kairo';
import { StepLayout } from './step-layout';
import type { StepProps } from './types';

/**
 * Brand-specific battery guidance (spec §7.2). Menu paths vary by OS version;
 * these are the common routes and must be checked on real devices (§9.2).
 */
function batteryTips(): { brand: string; steps: string } {
  const m = (Device.manufacturer ?? '').toLowerCase();
  if (m.includes('samsung')) return { brand: 'Samsung', steps: 'Settings › Apps › Kairo › Battery › Unrestricted' };
  if (/(xiaomi|redmi|poco)/.test(m)) return { brand: 'Xiaomi', steps: 'Settings › Apps › Kairo › turn on Autostart, then Battery saver › No restrictions' };
  if (/(tecno|infinix|itel)/.test(m)) return { brand: Device.manufacturer ?? 'Android', steps: 'Phone Master › App management › Auto-start › allow Kairo, then Settings › Battery › Kairo › Don’t restrict' };
  if (/(huawei|honor)/.test(m)) return { brand: Device.manufacturer ?? 'Huawei', steps: 'Settings › Battery › App launch › Kairo › Manage manually, allow all' };
  if (/(oppo|realme|oneplus|vivo)/.test(m)) return { brand: Device.manufacturer ?? 'Android', steps: 'Settings › Battery › Kairo › Allow background activity' };
  return { brand: 'Android', steps: 'Settings › Apps › Kairo › Battery › Unrestricted' };
}

type Status = 'ok' | 'needed' | 'unknown';

function StatusRow({ icon, title, detail, status, statusLabel, action, onAction, index }: {
  icon: IconName;
  title: string;
  detail: string;
  status: Status;
  statusLabel: string;
  action?: string;
  onAction?: () => void;
  index: number;
}) {
  const tone = status === 'ok' ? colors.success : status === 'needed' ? colors.warning : colors.textFaint;
  return (
    <Animated.View entering={FadeInDown.delay(450 + index * 120).springify().damping(18)} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <Icon name={icon} size={22} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {/* Status uses an icon and words, never colour alone (§7.12). */}
          <View style={styles.statusRow}>
            <Icon name={status === 'ok' ? 'check' : 'dash'} size={14} color={tone} strokeWidth={3} />
            <Text style={[styles.status, { color: tone }]}>{statusLabel}</Text>
          </View>
        </View>
        {action && onAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              tap();
              onAction();
            }}
            style={({ pressed }) => [styles.fix, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.fixText}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.detail}>{detail}</Text>
    </Animated.View>
  );
}

/** Android only (spec §4.1 step 5): exact alarms and battery optimisation. */
export function ReliabilityStep({ next }: StepProps) {
  const [exact, setExact] = useState<Status>('unknown');
  const [batteryOpened, setBatteryOpened] = useState(false);
  const tips = batteryTips();

  const check = useCallback(() => {
    Notifications.getExactAlarmPermissionsAsync().then(
      (p) => setExact(p.granted ? 'ok' : 'needed'),
      () => setExact('unknown'),
    );
  }, []);

  // Re-check whenever the user comes back from system settings.
  useEffect(() => {
    Notifications.getExactAlarmPermissionsAsync().then(
      (p) => setExact(p.granted ? 'ok' : 'needed'),
      () => setExact('unknown'),
    );
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [check]);

  const allowExact = () => {
    // The request opens system settings; re-checked when the app returns.
    Notifications.requestExactAlarmPermissionsAsync().then(check, () => {
      startActivityAsync(ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM).catch(() => {});
    });
  };

  const openBattery = async () => {
    setBatteryOpened(true);
    await startActivityAsync(ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS).catch(() => {});
  };

  return (
    <StepLayout
      title="Make reminders *bulletproof.*"
      subtitle={`${tips.brand} phones can pause apps to save battery. Two switches keep Kairo on time.`}
      footer={
        <Footer>
          <PrimaryButton label="Continue" onPress={next} />
        </Footer>
      }
    >
      <View style={{ gap: 10 }}>
        <StatusRow
          index={0}
          icon="bolt"
          title="Exact alarms"
          status={exact}
          statusLabel={exact === 'ok' ? 'Allowed' : exact === 'needed' ? 'Not allowed: reminders may be late' : 'Checking…'}
          detail="Lets Kairo fire right on the minute instead of when Android gets around to it."
          action={exact === 'needed' ? 'Allow' : undefined}
          onAction={allowExact}
        />
        <StatusRow
          index={1}
          icon="battery"
          title="Battery optimisation"
          status={batteryOpened ? 'unknown' : 'needed'}
          statusLabel={batteryOpened ? 'Opened: Kairo can’t check this one itself' : 'Turn off for Kairo'}
          detail={tips.steps}
          action="Open"
          onAction={openBattery}
        />
      </View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandTint,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  status: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  fix: { paddingHorizontal: 16, height: 36, borderRadius: radius.pill, backgroundColor: colors.brand, justifyContent: 'center' },
  fixText: { color: colors.onBrand, fontWeight: '700', fontSize: 14 },
  detail: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
});
