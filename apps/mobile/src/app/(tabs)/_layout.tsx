import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { type } from "@styleme/design";
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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.inkFaint,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.line,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
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
