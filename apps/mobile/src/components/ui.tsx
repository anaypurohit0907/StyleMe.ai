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
import { radius, space, type } from "@styleme/design";
import { useTheme } from "@/lib/theme";

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <SafeAreaView style={[s.screen, { backgroundColor: t.bg }, style]} edges={["top", "left", "right"]}>
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
  const t = useTheme();
  return <Text style={[s.title, { color: t.ink }]}>{children}</Text>;
}

export function Body({ children, soft }: { children: ReactNode; soft?: boolean }) {
  const t = useTheme();
  return <Text style={[s.body, { color: soft ? t.inkSoft : t.ink }]}>{children}</Text>;
}

export function Caption({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[s.caption, { color: t.inkSoft }]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[s.card, { backgroundColor: t.surface, borderColor: t.line }, style]}>{children}</View>
  );
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
  const t = useTheme();
  const bg = variant === "primary" ? t.accent : variant === "danger" ? t.bad : "transparent";
  const fg = variant === "ghost" ? t.ink : "#FFFFFF";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === "ghost" && [s.ghost, { borderColor: t.line }],
      ]}>
      {loading ? (
        <View style={s.btnLoading}>
          <ActivityIndicator color={fg} size="small" />
          <Text style={[s.btnText, { color: fg }]}>{label}</Text>
        </View>
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
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        { backgroundColor: t.surface, borderColor: t.line },
        selected && { backgroundColor: t.ink, borderColor: t.ink },
        pressed && { opacity: 0.75 },
      ]}>
      <Text style={[s.chipText, { color: t.ink }, selected && { color: t.bg }]}>{label}</Text>
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
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.swatch,
        { backgroundColor: color },
        selected && { borderWidth: 3, borderColor: t.accent },
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
  const t = useTheme();
  return (
    <Card style={{ gap: space.m, alignItems: "flex-start" }}>
      <Text style={[s.emptyTitle, { color: t.ink }]}>{title}</Text>
      <Text style={[s.body, { color: t.ink }]}>{body}</Text>
      {action}
    </Card>
  );
}

/** Thin progress bar with an optional caption — capture session progress etc. */
export function Progress({ value, label }: { value: number; label?: string }) {
  const t = useTheme();
  const pct = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
  return (
    <View style={{ gap: space.s }}>
      {label ? <Caption>{label}</Caption> : null}
      <View style={[s.progressTrack, { backgroundColor: t.surfaceAlt }]}>
        <View style={[s.progressFill, { width: pct, backgroundColor: t.accent }]} />
      </View>
    </View>
  );
}

/** Floating "Added ✓" confirmation pill — brief success feedback. */
export function AddedChip({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={[s.addedChip, { backgroundColor: t.ink }]}>
      <Text style={[s.addedChipText, { color: t.bg }]}>{label}</Text>
    </View>
  );
}

/** Underlined quiet text link — secondary exits like "View wardrobe". */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={[s.textLink, { color: t.inkSoft }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: space.m, paddingBottom: space.xxl, gap: space.m },
  title: { ...type.display },
  body: { ...type.body },
  caption: { ...type.caption },
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.m,
  },
  btn: {
    minHeight: 48,
    borderRadius: radius.pill,
    paddingHorizontal: space.l,
    alignItems: "center",
    justifyContent: "center",
  },
  ghost: { borderWidth: StyleSheet.hairlineWidth },
  btnLoading: { flexDirection: "row", alignItems: "center", gap: space.s },
  btnText: { ...type.body, fontWeight: "600" },
  chip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
  },
  chipText: { ...type.caption },
  swatch: { width: 34, height: 34, borderRadius: radius.pill },
  emptyTitle: { ...type.title },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: radius.pill },
  addedChip: {
    alignSelf: "center",
    borderRadius: radius.pill,
    paddingHorizontal: space.l,
    paddingVertical: space.s,
  },
  addedChipText: { ...type.caption, fontWeight: "600" },
  textLink: { ...type.caption, textDecorationLine: "underline" },
});
