import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, fonts } from '@/theme/kairo';

/**
 * Serif headline whose words rise into place one after another.
 * Wrap a word in *asterisks* to set it in teal italic.
 */
export function KineticTitle({ text, size = 44, delay = 120, center }: { text: string; size?: number; delay?: number; center?: boolean }) {
  const words = text.split(' ');
  const plain = text.replace(/\*/g, '');
  return (
    // The visual words are hidden from screen readers; the full sentence is read once.
    <View accessible accessibilityRole="header" accessibilityLabel={plain} style={[styles.row, center && styles.center]}>
      {words.map((w, i) => {
        const italic = w.startsWith('*');
        const word = w.replace(/\*/g, '');
        return (
          <Animated.View
            key={`${i}-${word}`}
            entering={FadeInDown.delay(delay + i * 60).springify().damping(16).stiffness(140)}
          >
            <Text
              allowFontScaling
              maxFontSizeMultiplier={1.4}
              style={[
                styles.word,
                { fontSize: size, lineHeight: size * 1.08 },
                italic && styles.italic,
              ]}
            >
              {word}
              {i < words.length - 1 ? ' ' : ''}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  center: { justifyContent: 'center' },
  word: { fontFamily: fonts.serif, color: colors.text, letterSpacing: -0.6 },
  italic: { fontFamily: fonts.serifItalic, color: colors.brand },
});
