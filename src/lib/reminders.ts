import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

export const MEETING_CHANNEL = 'meetings';
export const MEETING_CATEGORY = 'meeting_join';
export const ACTION_JOIN = 'join';
export const ACTION_SNOOZE = 'snooze';

let configured = false;

/** Handler, Android channel and Join/Snooze buttons. Safe to call repeatedly. */
export async function configureReminders() {
  if (configured || Platform.OS === 'web') return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Android 13+: the permission prompt only appears once a channel exists.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MEETING_CHANNEL, {
      name: 'Meeting reminders',
      description: 'Alerts before and at the start of your meetings',
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 120, 250],
      lightColor: '#14B8A6',
    });
  }

  await Notifications.setNotificationCategoryAsync(MEETING_CATEGORY, [
    { identifier: ACTION_JOIN, buttonTitle: 'Join', options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE, buttonTitle: 'Snooze 2 min', options: { opensAppToForeground: false } },
  ]);
}

export type PermissionResult = 'granted' | 'provisional' | 'denied';

function toResult(p: Notifications.NotificationPermissionsStatus): PermissionResult {
  if (p.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'provisional';
  return p.granted ? 'granted' : 'denied';
}

export async function getReminderPermission(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return 'denied';
  return toResult(await Notifications.getPermissionsAsync());
}

export async function requestReminderPermission(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return 'denied';
  await configureReminders();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return toResult(current);
  return toResult(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }),
  );
}

export const TEST_REMINDER_ID = 'kairo-onboarding-test';

export async function scheduleTestReminder(seconds: number) {
  await configureReminders();
  await Notifications.cancelScheduledNotificationAsync(TEST_REMINDER_ID).catch(() => {});
  return Notifications.scheduleNotificationAsync({
    identifier: TEST_REMINDER_ID,
    content: {
      title: 'Design review is starting',
      body: 'This is your Kairo test. Tap Join.',
      categoryIdentifier: MEETING_CATEGORY,
      interruptionLevel: 'timeSensitive',
      data: { kind: 'onboarding-test' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: MEETING_CHANNEL,
    },
  });
}

export function cancelTestReminder() {
  if (Platform.OS === 'web') return;
  Notifications.cancelScheduledNotificationAsync(TEST_REMINDER_ID).catch(() => {});
}
