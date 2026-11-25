import { StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type } from "@styleme/design";
import { ChromeSurface } from "@/components/chrome";
import { useTheme } from "@/lib/theme";

/**
 * Cross-platform tab symbols: SF Symbols on iOS, Material Symbols on
 * Android/web (expo-symbols). No text glyphs in the tab bar.
 */
const ICONS = {
  today: { ios: "sun.max", android: "light_mode", web: "light_mode" },
  wardrobe: { ios: "square.grid.2x2", android: "grid_view", web: "grid_view" },
  add: { ios: "plus", android: "add", web: "add" },
  dna: { ios: "circle.lefthalf.filled", android: "contrast", web: "contrast" },
} as const;

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.inkFaint,
        tabBarStyle: {
          // Dark mode: the glass surface owns the fill and overlays the
          // scrolling content so the translucency is actually visible.
          // Light mode stays the opaque surface the user already approved.
          position: t.isDark ? "absolute" : "relative",
          backgroundColor: t.isDark ? "transparent" : t.surface,
          borderTopWidth: t.isDark ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: t.isDark ? "transparent" : t.line,
          // Custom height must include the bottom safe-area inset, otherwise
          // the inset shows the window background (white in dark mode).
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarBackground: t.isDark
          ? () => <ChromeSurface style={StyleSheet.absoluteFill} />
          : undefined,
        tabBarLabelStyle: { ...type.caption, fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => <SymbolView name={ICONS.today} tintColor={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: "Wardrobe",
          tabBarIcon: ({ color }) => (
            <SymbolView name={ICONS.wardrobe} tintColor={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: "Add",
          tabBarIcon: ({ color }) => <SymbolView name={ICONS.add} tintColor={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="dna"
        options={{
          title: "Style DNA",
          tabBarIcon: ({ color }) => <SymbolView name={ICONS.dna} tintColor={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
