/**
 * Expo Go bridge: send a resized photo to the local ONNX tagger.
 *
 * Real tags without a native build. Falls back to the deterministic mock if
 * the server is unreachable (phone off the adb reverse tunnel, etc.).
 */
import * as ImageManipulator from "expo-image-manipulator";
import type { GarmentAttrs } from "@styleme/schema";
import { mockTagger, type VisionTagger } from "./vision";

const BASE = process.env.EXPO_PUBLIC_TAGGER_URL ?? "http://127.0.0.1:8788";

async function tagRemote(uri: string): Promise<GarmentAttrs> {
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 512 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (!resized.base64) throw new Error("image resize returned no base64");

  const res = await fetch(`${BASE}/tag`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image: `data:image/jpeg;base64,${resized.base64}` }),
  });
  if (!res.ok) throw new Error(`tagger ${res.status}`);
  return (await res.json()) as GarmentAttrs;
}

export const remoteTagger: VisionTagger = {
  name: "mobileclip-s1-remote",
  async tag(uri: string): Promise<GarmentAttrs> {
    try {
      return await tagRemote(uri);
    } catch (e) {
      console.warn("remote tagger unavailable, using mock:", e);
      return mockTagger.tag(uri);
    }
  },
};
