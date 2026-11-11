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
  const select = (y: number) => {
    if (height === 0) return;
    const letter = letterAt(y, height / ALPHABET.length);
    if (available.has(letter)) onSelect(letter);
  };

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Jump to letter"
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
