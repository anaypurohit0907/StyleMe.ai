import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";
import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SystemUI from "expo-system-ui";
import { NavigationBar } from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import { getDb, metaGet } from "@/lib/db";
import { setVisionTagger } from "@/lib/vision";
import { initPipelineLog, log, logFileHint } from "@/lib/pipeline-log";
import { useTheme } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      // Resolve the sink before announcing its path: an un-awaited init can
      // make logFileHint() claim the external file before target() confirms it.
      await initPipelineLog();
      log(
        "app",
        `started v${Constants.expoConfig?.version ?? "?"} on ${Platform.OS}; log=${logFileHint()}`,
      );
      await getDb();
      // Native dev builds can opt into ONNX; Expo Go can use the local server.
      if (process.env.EXPO_PUBLIC_VISION === "onnx") {
        try {
          const { createOnnxTagger } = require("@/lib/onnx-tagger") as typeof import("@/lib/onnx-tagger");
          setVisionTagger(createOnnxTagger());
        } catch {
          // native module unavailable — mock tagger stays active
        }
      } else if (process.env.EXPO_PUBLIC_VISION === "remote") {
        try {
          const { remoteTagger } = require("@/lib/remote-tagger") as typeof import("@/lib/remote-tagger");
          setVisionTagger(remoteTagger);
        } catch {
          // local tagger unavailable — mock tagger stays active
        }
      }
      const onboarded = await metaGet("onboarded");
      await SplashScreen.hideAsync().catch(() => {});
      if (!onboarded) router.replace("/onboarding");
    })();
  }, [router]);
  return null;
}

export default function RootLayout() {
  const t = useTheme();
  const scheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    DMSerifDisplay: require("../../assets/fonts/DMSerifDisplay-Regular.ttf"),
  });
  // The root window sits behind the Android navigation bar / safe-area gaps.
  // Keep it in sync with the scheme so a dark app never flashes a white strip.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(t.bg);
  }, [t.bg]);
  // Keep the splash up until the display face is ready; a font failure must
  // not trap the app (fall back to the system face).
  if (!fontsLoaded && !fontError) return null;
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {Platform.OS === "android" && <NavigationBar style="auto" />}
      <Gate />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="item/[id]" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}
