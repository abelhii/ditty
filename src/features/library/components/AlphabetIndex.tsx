import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { ALPHABET, letterAt } from '@/features/library/alphabet-index';

type AlphabetIndexProps = {
  /** Letters that have rows; the others are dimmed and ignored. */
  available: ReadonlySet<string>;
  onSelect: (letter: string) => void;
};

/** A vertical A-Z rail down the right edge of a list, spanning its full height with the letters
 *  spread evenly: tap or drag along it to jump. The rail is one touch target (letters ignore
 *  touches) so a drag reads the finger's position. */
export function AlphabetIndex({ available, onSelect }: AlphabetIndexProps) {
  const [height, setHeight] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);
  const jump = (letter: string) => {
    setCurrent(letter);
    onSelect(letter);
  };
  const select = (y: number) => {
    if (height === 0) return;
    const letter = letterAt(y, height / ALPHABET.length);
    if (available.has(letter)) jump(letter);
  };
  // Screen-reader increment/decrement: step to the next/previous letter that has rows.
  const step = (direction: 1 | -1) => {
    const letters = ALPHABET.filter((letter) => available.has(letter));
    if (letters.length === 0) return;
    const index = current ? letters.indexOf(current) : -1;
    const next =
      index === -1 ? (direction === 1 ? 0 : letters.length - 1) : Math.min(letters.length - 1, Math.max(0, index + direction));
    jump(letters[next]);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Jump to letter"
      accessibilityValue={{ text: current ?? undefined }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') step(1);
        else if (event.nativeEvent.actionName === 'decrement') step(-1);
      }}
      style={styles.rail}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => select(event.nativeEvent.locationY)}
      onResponderMove={(event) => select(event.nativeEvent.locationY)}
    >
      {ALPHABET.map((letter) => (
        <View key={letter} pointerEvents="none" style={styles.slot}>
          <ThemedText
            type="small"
            themeColor={available.has(letter) ? 'text' : 'textSecondary'}
            style={[styles.letter, !available.has(letter) && styles.dimmed]}
          >
            {letter}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    right: Spacing.one,
    top: 0,
    bottom: 0,
    width: 20,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '600',
  },
  dimmed: {
    opacity: 0.4,
  },
});
