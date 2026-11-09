import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor, TypeScale } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'defaultBold' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'defaultBold' && styles.defaultBold,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    ...TypeScale.small,
    fontWeight: 500,
    fontFamily: Fonts.sans,
  },
  smallBold: {
    ...TypeScale.small,
    fontWeight: 700,
    fontFamily: Fonts.sansBold,
  },
  default: {
    ...TypeScale.default,
    fontWeight: 500,
    fontFamily: Fonts.sans,
  },
  defaultBold: {
    ...TypeScale.default,
    fontWeight: 700,
    fontFamily: Fonts.sansBold,
  },
  title: {
    ...TypeScale.title,
    fontWeight: 700,
    fontFamily: Fonts.sansBold,
  },
  subtitle: {
    ...TypeScale.subtitle,
    fontWeight: 700,
    fontFamily: Fonts.sansBold,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
    fontFamily: Fonts.sans,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
    fontFamily: Fonts.sans,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
