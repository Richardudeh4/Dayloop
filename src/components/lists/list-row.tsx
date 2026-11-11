import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { tap } from '@/components/kairo/buttons';
import { Icon } from '@/components/kairo/icon';
import type { List } from '@/db/schema';
import { colors, listColor, radius } from '@/theme/kairo';

const ACTION_WIDTH = 88;

function DeleteAction({ progress, onPress }: { progress: SharedValue<number>; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0.6, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.7, 1], 'clamp') }],
  }));
  return (
    <Pressable onPress={onPress} accessibilityElementsHidden importantForAccessibility="no" style={styles.actionWrap}>
      <Animated.View style={[styles.action, style]}>
        <Icon name="trash" size={20} color={colors.white} />
        <Text style={styles.actionLabel}>Delete</Text>
      </Animated.View>
    </Pressable>
  );
}

/** One list. Swipe left to delete (screen readers get a "Delete" action instead). */
export function ListRow({ list, onDelete }: { list: List; onDelete: (list: List) => void }) {
  const remove = () => {
    tap();
    onDelete(list);
  };

  return (
    <Swipeable
      friction={1.6}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      renderRightActions={(progress) => <DeleteAction progress={progress} onPress={remove} />}
      containerStyle={styles.swipe}
    >
      <View
        style={styles.row}
        accessible
        accessibilityLabel={`${list.name} list`}
        accessibilityActions={[{ name: 'delete', label: 'Delete list' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && remove()}
      >
        <View style={[styles.dot, { backgroundColor: listColor(list.color) }]} />
        <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.8}>
          {list.name}
        </Text>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipe: { borderRadius: radius.md, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 60,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  actionWrap: { width: ACTION_WIDTH, justifyContent: 'center', alignItems: 'flex-end' },
  action: {
    width: ACTION_WIDTH - 8,
    alignSelf: 'stretch',
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionLabel: { color: colors.white, fontSize: 12, fontWeight: '700' },
});
