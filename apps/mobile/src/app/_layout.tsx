import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { getDb, metaGet } from "@/lib/db";
import { setVisionTagger } from "@/lib/vision";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
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
  return (
    <>
      <StatusBar style="dark" />
      <Gate />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FAF9F7" } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="item/[id]" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}
