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
  type PressableStateCallbackType,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";

import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

import { useAuthStore } from "@/auth/use-auth-store";
import { SidebarPlaylists } from "@/features/playlists/components/SidebarPlaylists";
import {
  Colors,
  isWideWidth,
  Radius,
  SidebarWidth,
  Spacing,
  WebBottomBarHeight,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// Below the wide breakpoint (see `isWideWidth`) the nav is a bottom tab bar (icon over label, like
// the native tabs); at and above it a left sidebar replaces it.
function useIsWide() {
  return isWideWidth(useWindowDimensions().width);
}

const TabIcons: Record<string, SymbolViewProps["name"]> = {
  Home: { ios: "house", android: "home", web: "home" },
  Library: { ios: "books.vertical", android: "library_books", web: "library_books" },
  Likes: { ios: "heart", android: "favorite", web: "favorite" },
  Search: { ios: "magnifyingglass", android: "search", web: "search" },
  Settings: { ios: "slider.horizontal.3", android: "tune", web: "tune" },
};

type SidebarPressableState = PressableStateCallbackType & {
  hovered?: boolean;
  focused?: boolean;
};

const AVATAR_SIZE = 36;

export default function AppTabs() {
  const wide = useIsWide();

  return (
    // TabList and TabSlot must stay DIRECT children of <Tabs>: it walks its own children (only
    // recursing into Fragments and <TabList>) to register the tab routes, so wrapping them in a
    // <View> hides the triggers ("Couldn't find any screens"). <Tabs> already lays its container out
    // as flex:1 column, so ordering the bar first and giving the slot flex:1 puts content BELOW the
    // bar instead of behind it — no absolute positioning needed.
    <Tabs style={wide ? styles.wideRoot : styles.root}>
      {!wide && <TabSlot style={styles.slot} />}
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/home" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="library" href="/library" asChild>
            <TabButton>Library</TabButton>
          </TabTrigger>
          <TabTrigger name="likes" href="/likes" asChild>
            <TabButton>Likes</TabButton>
          </TabTrigger>
          {wide && <SidebarPlaylists />}
          <TabTrigger name="search" href="/search" asChild>
            <TabButton>Search</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      {wide && <TabSlot style={styles.slot} />}
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
  const wide = useIsWide();
  const theme = useTheme();
  const username = useAuthStore((state) => state.credentials?.username);
  const label = typeof children === "string" ? children : "";
  const iconName = TabIcons[label];

  if (wide) {
    // Search lives in the content pane's top bar on wide, and Settings is the account row below.
    // Both triggers stay mounted: <Tabs> registers its routes from the triggers it finds.
    if (label === "Search") return null;

    if (label === "Settings") {
      return (
        <Pressable
          {...props}
          accessibilityLabel="Settings"
          style={({ pressed, hovered, focused }: SidebarPressableState) => [
            styles.accountRow,
            { borderTopColor: theme.border },
            (hovered || focused) && { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <ThemedView
            type={isFocused ? "backgroundSelected" : "backgroundElement"}
            style={styles.avatar}
          >
            <ThemedText type="smallBold">
              {username?.charAt(0).toUpperCase() ?? ""}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.accountText}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {username ?? ""}
            </ThemedText>
            <ThemedText
              type="small"
              numberOfLines={1}
              style={{ color: isFocused ? theme.accent : theme.textSecondary }}
            >
              Settings
            </ThemedText>
          </ThemedView>
        </Pressable>
      );
    }

    const color = isFocused ? theme.accent : theme.textSecondary;
    return (
      <Pressable
        {...props}
        style={({ pressed, hovered, focused }: SidebarPressableState) => [
          styles.sidebarItem,
          (hovered || focused) && { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        {iconName && <SymbolView name={iconName} size={22} tintColor={color} />}
        <ThemedText
          type={isFocused ? "smallBold" : "small"}
          style={{ color: isFocused ? theme.accent : theme.text }}
        >
          {children}
        </ThemedText>
      </Pressable>
    );
  }

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

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];
  const wide = useIsWide();

  if (wide) {
    return (
      <View
        {...props}
        style={[
          styles.sidebar,
          { backgroundColor: colors.background, borderRightColor: colors.border },
        ]}
      >
        <ThemedText type="subtitle" style={styles.brandText}>
          Sicmu
        </ThemedText>
        {props.children}
      </View>
    );
  }

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
  // <Tabs> spreads `style` over its own flex:1 root, so both variants restate it.
  root: {
    flex: 1,
  },
  wideRoot: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: SidebarWidth,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  brandText: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.three,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.sm,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.two,
    marginBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  accountText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
