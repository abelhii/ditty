import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from "expo-router/ui";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import {
  Pressable,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";

import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

import { Colors, MaxContentWidth, Spacing, WebBottomBarHeight } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// Below this width the nav is a bottom tab bar (icon over label, like the native tabs); at and
// above it the top pill bar is used. Kept narrow-only so a wide-screen sidebar can replace the top
// bar later.
export const BottomTabBarMaxWidth = 900;

function useIsBottomTabBar() {
  return useWindowDimensions().width < BottomTabBarMaxWidth;
}

const TabIcons: Record<string, SymbolViewProps["name"]> = {
  Home: { ios: "house", android: "home", web: "home" },
  Library: { ios: "books.vertical", android: "library_books", web: "library_books" },
  Search: { ios: "magnifyingglass", android: "search", web: "search" },
  Settings: { ios: "slider.horizontal.3", android: "tune", web: "tune" },
};

export default function AppTabs() {
  const bottom = useIsBottomTabBar();

  return (
    // TabList and TabSlot must stay DIRECT children of <Tabs>: it walks its own children (only
    // recursing into Fragments and <TabList>) to register the tab routes, so wrapping them in a
    // <View> hides the triggers ("Couldn't find any screens"). <Tabs> already lays its container out
    // as flex:1 column, so ordering the bar first and giving the slot flex:1 puts content BELOW the
    // bar instead of behind it — no absolute positioning needed.
    <Tabs>
      {bottom && <TabSlot style={styles.slot} />}
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/home" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="library" href="/library" asChild>
            <TabButton>Library</TabButton>
          </TabTrigger>
          <TabTrigger name="search" href="/search" asChild>
            <TabButton>Search</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      {!bottom && <TabSlot style={styles.slot} />}
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
  const bottom = useIsBottomTabBar();
  const theme = useTheme();
  const label = typeof children === "string" ? children : "";
  const iconName = TabIcons[label];

  if (bottom) {
    const color = isFocused ? theme.accent : theme.textSecondary;
    return (
      <Pressable
        {...props}
        style={({ pressed }) => [styles.bottomTab, pressed && styles.pressed]}
      >
        {iconName && <SymbolView name={iconName} size={26} tintColor={color} />}
        <ThemedText type="small" style={{ color }}>
          {children}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? "backgroundSelected" : "backgroundElement"}
        style={styles.tabButtonView}
      >
        <ThemedText
          type="small"
          themeColor={isFocused ? "text" : "textSecondary"}
        >
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];
  const bottom = useIsBottomTabBar();

  if (bottom) {
    return (
      <View
        {...props}
        style={[
          styles.bottomBar,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        {props.children}
      </View>
    );
  }

  return (
    <View
      {...props}
      style={[styles.tabListContainer, { backgroundColor: colors.background }]}
    >
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          Sicmu
        </ThemedText>

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  bottomBar: {
    height: WebBottomBarHeight,
    flexDirection: "row",
    alignItems: "stretch",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.half,
  },
  tabListContainer: {
    padding: Spacing.three,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: "auto",
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  externalPressable: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.one,
    marginLeft: Spacing.three,
  },
});
