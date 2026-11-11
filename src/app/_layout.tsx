import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  useFonts,
} from '@expo-google-fonts/instrument-serif';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useDatabase } from '@/db/use-database';
import { useOnboarding } from '@/lib/onboarding-store';
import { configureReminders } from '@/lib/reminders';
import { colors } from '@/theme/kairo';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic });
  const db = useDatabase();
  const { completed } = useOnboarding();
  const ready = (fontsLoaded || !!fontError) && db.ready;

  useEffect(() => {
    // TODO: show a recovery screen instead of continuing without tables.
    if (db.error) console.error('Database migration failed', db.error);
  }, [db.error]);

  useEffect(() => {
    configureReminders().catch(() => {});
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
        <Stack.Protected guard={completed}>
          <Stack.Screen name="index" />
          <Stack.Screen name="lists" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
        <Stack.Protected guard={!completed}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </GestureHandlerRootView>
  );
}
