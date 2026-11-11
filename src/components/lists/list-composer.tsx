import * as Haptics from 'expo-haptics';
import { useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { tap } from '@/components/kairo/buttons';
import { Icon } from '@/components/kairo/icon';
import { createList, type CreateListResult } from '@/db/lists';
import { colors, listColors, radius, shadow } from '@/theme/kairo';

const MAX = 60;

const MESSAGES: Record<Exclude<CreateListResult, { ok: true }>['reason'], (name: string) => string> = {
  empty: () => 'Give the list a name.',
  too_long: () => `Keep it under ${MAX} characters.`,
  duplicate: (name) => `You already have a list called “${name}”.`,
};

function notify(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS !== 'web') Haptics.notificationAsync(type).catch(() => {});
}

/** Name field, colour swatches and an Add button. Stays focused for quick entry. */
export function ListComposer() {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(listColors[0].value);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const trimmed = name.trim();
  const canAdd = trimmed.length > 0 && !saving;

  async function submit() {
    if (!canAdd) return;
    setSaving(true);
    try {
      const result = await createList({ name: trimmed, color });
      if (result.ok) {
        notify(Haptics.NotificationFeedbackType.Success);
        setName('');
        setError(null);
        // Next colour, so a run of new lists isn't all the same.
        const i = listColors.findIndex((c) => c.value === color);
        setColor(listColors[(i + 1) % listColors.length].value);
      } else {
        notify(Haptics.NotificationFeedbackType.Error);
        setError(MESSAGES[result.reason](trimmed));
        shake.set(withSequence(
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 70 }),
          withTiming(-5, { duration: 60 }),
          withSpring(0, { damping: 8, stiffness: 300 }),
        ));
      }
    } catch {
      notify(Haptics.NotificationFeedbackType.Error);
      setError('Something went wrong saving that list. Please try again.');
    } finally {
      setSaving(false);
      input.current?.focus();
    }
  }

  return (
    <View>
      <Animated.View style={[styles.card, error && styles.cardError, shakeStyle]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <TextInput
          ref={input}
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (error) setError(null);
          }}
          onSubmitEditing={submit}
          submitBehavior="submit"
          returnKeyType="done"
          placeholder="New list, e.g. Work"
          placeholderTextColor={colors.placeholder}
          maxLength={MAX}
          autoCapitalize="sentences"
          autoCorrect={false}
          selectionColor={colors.brand}
          style={styles.input}
          accessibilityLabel="New list name"
          maxFontSizeMultiplier={1.6}
        />
        <Pressable
          onPress={() => {
            tap();
            submit();
          }}
          disabled={!canAdd}
          accessibilityRole="button"
          accessibilityLabel="Add list"
          accessibilityState={{ disabled: !canAdd }}
          hitSlop={6}
          style={({ pressed }) => [styles.add, !canAdd && styles.addDisabled, pressed && { transform: [{ scale: 0.92 }] }]}
        >
          <Icon name="plus" size={20} color={colors.onBrand} strokeWidth={2.5} />
        </Pressable>
      </Animated.View>

      <View style={styles.meta}>
        {error ? (
          <Animated.Text
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
            style={styles.error}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            {error}
          </Animated.Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {name.length > MAX - 15 ? (
          <Text style={styles.count} accessibilityLabel={`${MAX - name.length} characters left`}>
            {name.length}/{MAX}
          </Text>
        ) : null}
      </View>

      <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="List colour">
        {listColors.map((c) => {
          const selected = c.value === color;
          return (
            <Pressable
              key={c.value}
              onPress={() => {
                tap();
                setColor(c.value);
              }}
              accessibilityRole="radio"
              accessibilityLabel={c.name}
              accessibilityState={{ selected }}
              hitSlop={4}
              style={[styles.swatchRing, selected && { borderColor: c.value }]}
            >
              <View style={[styles.swatch, { backgroundColor: c.value }]}>
                {selected ? <Icon name="check" size={14} color={colors.white} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingLeft: 18,
    paddingRight: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  cardError: { borderColor: colors.danger },
  dot: { width: 12, height: 12, borderRadius: 6 },
  input: { flex: 1, color: colors.text, fontSize: 17, paddingVertical: 16 },
  add: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDisabled: { opacity: 0.3 },
  meta: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 22, marginTop: 8, paddingHorizontal: 4 },
  error: { flex: 1, color: colors.danger, fontSize: 14, lineHeight: 19 },
  count: { color: colors.textFaint, fontSize: 13, fontVariant: ['tabular-nums'], marginLeft: 12 },
  swatches: { flexDirection: 'row', gap: 10, marginTop: 4, paddingHorizontal: 2 },
  swatchRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
