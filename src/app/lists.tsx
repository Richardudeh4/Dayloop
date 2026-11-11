import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '@/components/kairo/buttons';
import { Icon } from '@/components/kairo/icon';
import { UndoToast } from '@/components/kairo/undo-toast';
import { ListComposer } from '@/components/lists/list-composer';
import { ListRow } from '@/components/lists/list-row';
import { createList, deleteList, restoreList, useLists } from '@/db/lists';
import type { List } from '@/db/schema';
import { colors, fonts, listColors, radius } from '@/theme/kairo';

const SUGGESTIONS = [
  { name: 'Work', color: listColors[0].value },
  { name: 'Personal', color: listColors[1].value },
  { name: 'Study', color: listColors[3].value },
];

/** Create, view and delete lists (Work, Personal, ...). Items are grouped by list. */
export default function ListsScreen() {
  const insets = useSafeAreaInsets();
  const { lists, loaded } = useLists();
  const [undo, setUndo] = useState<{ id: string; list: List } | null>(null);

  async function remove(list: List) {
    await deleteList(list.id);
    setUndo({ id: `${list.id}:${Date.now()}`, list });
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => {
            tap();
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Icon name="back" size={22} color={colors.textDim} />
        </Pressable>

        <Animated.Text entering={FadeIn.delay(60)} style={styles.eyebrow}>
          Organise
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(120)} style={styles.title} accessibilityRole="header">
          Lists
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(180)} style={styles.subtitle}>
          Keep work, study and life apart. Every item can belong to one list.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(240)} style={styles.composer}>
          <ListComposer />
        </Animated.View>

        {loaded && lists.length > 0 ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} layout={LinearTransition}>
            <Text style={styles.section} accessibilityRole="header">
              Your lists · {lists.length}
            </Text>
            <View style={styles.rows}>
              {lists.map((list) => (
                <Animated.View
                  key={list.id}
                  entering={FadeInDown.springify().damping(18)}
                  exiting={FadeOut.duration(180)}
                  layout={LinearTransition.springify().damping(20)}
                >
                  <ListRow list={list} onDelete={remove} />
                </Animated.View>
              ))}
            </View>
            <Text style={styles.hint}>Swipe a list left to delete it. Its items stay.</Text>
          </Animated.View>
        ) : null}

        {loaded && lists.length === 0 ? (
          <Animated.View entering={FadeIn.delay(300)} exiting={FadeOut} style={styles.empty}>
            <Text style={styles.emptyTitle}>No lists yet</Text>
            <Text style={styles.emptyBody}>Name one above, or start with a suggestion.</Text>
            <View style={styles.chips}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s.name}
                  onPress={() => {
                    tap();
                    createList(s);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${s.name} list`}
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}
                >
                  <View style={[styles.chipDot, { backgroundColor: s.color }]} />
                  <Text style={styles.chipLabel}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      {undo ? (
        <UndoToast
          id={undo.id}
          message={`“${undo.list.name}” deleted`}
          onUndo={() => {
            restoreList(undo.list.id);
            setUndo(null);
          }}
          onDismiss={() => setUndo(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -10, marginBottom: 8 },
  eyebrow: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  title: { color: colors.text, fontFamily: fonts.serif, fontSize: 52, marginTop: 4 },
  subtitle: { color: colors.textDim, fontSize: 16, lineHeight: 23, marginTop: 6, maxWidth: 340 },
  composer: { marginTop: 28 },
  section: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: 32,
    marginBottom: 12,
  },
  rows: { gap: 10 },
  hint: { color: colors.textFaint, fontSize: 13, marginTop: 14, textAlign: 'center' },
  empty: { alignItems: 'center', marginTop: 56, gap: 6 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptyBody: { color: colors.textDim, fontSize: 15, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
