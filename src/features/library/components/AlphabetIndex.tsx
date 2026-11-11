import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/theme';
import { ALPHABET, letterAt } from '@/features/library/alphabet-index';

const LETTER_HEIGHT = 16;
const RAIL_HEIGHT = ALPHABET.length * LETTER_HEIGHT;

type AlphabetIndexProps = {
  /** Letters that have rows; the others are dimmed and ignored. */
  available: ReadonlySet<string>;
  onSelect: (letter: string) => void;
};

/** A vertical A-Z rail down the right edge of a list: tap or drag along it to jump. The rail is
 *  one touch target (letters ignore touches) so a drag reads the finger's position. */
export function AlphabetIndex({ available, onSelect }: AlphabetIndexProps) {
  const select = (y: number) => {
    const letter = letterAt(y, LETTER_HEIGHT);
    if (available.has(letter)) onSelect(letter);
  };

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Jump to letter"
      style={styles.rail}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => select(event.nativeEvent.locationY)}
      onResponderMove={(event) => select(event.nativeEvent.locationY)}
    >
      {ALPHABET.map((letter) => (
        <ThemedText
          key={letter}
          type="small"
          themeColor={available.has(letter) ? 'text' : 'textSecondary'}
          pointerEvents="none"
          style={[styles.letter, !available.has(letter) && styles.dimmed]}
        >
          {letter}
        </ThemedText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    right: Spacing.one,
    top: '50%',
    height: RAIL_HEIGHT,
    marginTop: -RAIL_HEIGHT / 2,
    width: 20,
  },
  letter: {
    height: LETTER_HEIGHT,
    lineHeight: LETTER_HEIGHT,
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  dimmed: {
    opacity: 0.4,
  },
});
