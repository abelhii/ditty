import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SegmentedChoiceProps<T extends string | number> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function SegmentedChoice<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedChoiceProps<T>) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.segments, disabled && styles.disabled]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: theme.accent }]}>
            <ThemedText type="small" style={selected ? { color: theme.onAccent } : undefined}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  segments: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
  },
  disabled: {
    opacity: 0.5,
  },
});
