import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useTheme } from "@/lib/theme";

/**
 * Chrome-only glass surface: tab bar / bars, never content cards.
 *
 * iOS 26+ gets native Liquid Glass. Android/web get a 78%-opaque themed tint —
 * no fake blur, no gradients, no shadow. Light mode stays on the opaque surface
 * treatment (the user asked for light unchanged); callers only mount this in
 * dark chrome.
 */
export function ChromeSurface({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  let glass = false;
  if (Platform.OS === "ios") {
    try {
      glass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
    } catch {
      glass = false;
    }
  }
  if (glass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={t.isDark ? "dark" : "light"}
        tintColor={t.chrome}
        style={style}>
        {children}
      </GlassView>
    );
  }
  return (
    <View
      style={[
        style,
        {
          overflow: "hidden",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: t.chromeBorder,
        },
      ]}>
      {/* Android/web: real Dimezis blur where the platform supports it; the
          overlay keeps the 72% tint even when blur is unavailable. */}
      <BlurView
        intensity={t.isDark ? 55 : 30}
        tint={t.isDark ? "dark" : "light"}
        blurMethod="dimezisBlurViewSdk31Plus"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.chrome }]} />
      {children}
    </View>
  );
}
