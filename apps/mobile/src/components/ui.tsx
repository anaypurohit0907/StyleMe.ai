/**
 * Small UI kit. One accent, 8pt grid, one radius language.
 * Every screen gets exactly one primary action.
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, space, type } from "@styleme/design";

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={[s.screen, style]} edges={["top", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}

export function Scroll({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[s.scroll, style]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

export function Body({ children, soft }: { children: ReactNode; soft?: boolean }) {
  return <Text style={[s.body, soft && { color: colors.inkSoft }]}>{children}</Text>;
}

export function Caption({ children }: { children: ReactNode }) {
  return <Text style={s.caption}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Btn({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg =
    variant === "primary" ? colors.accent : variant === "danger" ? colors.bad : "transparent";
  const fg = variant === "ghost" ? colors.ink : "#FFFFFF";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === "ghost" && s.ghost,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[s.btnText, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        selected && { backgroundColor: colors.ink, borderColor: colors.ink },
        pressed && { opacity: 0.75 },
      ]}>
      <Text style={[s.chipText, selected && { color: colors.bg }]}>{label}</Text>
    </Pressable>
  );
}

export function Swatch({
  color,
  selected,
  onPress,
}: {
  color: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.swatch,
        { backgroundColor: color },
        selected && { borderWidth: 3, borderColor: colors.accent },
      ]}
    />
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card style={{ gap: space.m, alignItems: "flex-start" }}>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.body}>{body}</Text>
      {action}
    </Card>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.m, paddingBottom: space.xxl, gap: space.m },
  title: { ...type.display, color: colors.ink },
  body: { ...type.body, color: colors.ink },
  caption: { ...type.caption, color: colors.inkSoft },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.m,
  },
  btn: {
    minHeight: 48,
    borderRadius: radius.pill,
    paddingHorizontal: space.l,
    alignItems: "center",
    justifyContent: "center",
  },
  ghost: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  btnText: { ...type.body, fontWeight: "600" },
  chip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
    backgroundColor: colors.surface,
  },
  chipText: { ...type.caption, color: colors.ink },
  swatch: { width: 34, height: 34, borderRadius: radius.pill },
  emptyTitle: { ...type.title, color: colors.ink },
});
