import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors, type } from "@styleme/design";

function Icon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
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
          tabBarIcon: ({ focused }) => <Icon glyph="☀" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: "Wardrobe",
          tabBarIcon: ({ focused }) => <Icon glyph="▦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: "Add",
          tabBarIcon: ({ focused }) => <Icon glyph="＋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dna"
        options={{
          title: "Style DNA",
          tabBarIcon: ({ focused }) => <Icon glyph="◐" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
