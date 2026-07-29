import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from "expo-router/ui";
import { Pressable, StyleSheet, useColorScheme, View } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";

export default function AppTabs() {
  return (
    // TabList and TabSlot must stay DIRECT children of <Tabs>: it walks its own children (only
    // recursing into Fragments and <TabList>) to register the tab routes, so wrapping them in a
    // <View> hides the triggers ("Couldn't find any screens"). <Tabs> already lays its container out
    // as flex:1 column, so ordering the bar first and giving the slot flex:1 puts content BELOW the
    // bar instead of behind it — no absolute positioning needed.
    <Tabs>
      <TabList asChild>
        <CustomTabList>
          {/* Home points at the catalog browse stack (`/library`); `/` redirects there. Step 7b
              dropped the standalone Library tab in favour of My Music. */}
          <TabTrigger name="home" href="/library" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="search" href="/search" asChild>
            <TabButton>Search</TabButton>
          </TabTrigger>
          <TabTrigger name="my-music" href="/my-music" asChild>
            <TabButton>My Music</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
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
