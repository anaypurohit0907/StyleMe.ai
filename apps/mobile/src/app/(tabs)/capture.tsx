import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import type { Fit, GarmentAttrs, Pattern, Slot } from "@styleme/schema";
import { colors, paletteSwatch, radius, space } from "@styleme/design";
import { Btn, Caption, Card, Chip, Screen, Scroll, Swatch, Title } from "@/components/ui";
import { upsertGarment } from "@/lib/db";
import { newGarment, persistPhoto } from "@/lib/local";
import { getVisionTagger } from "@/lib/vision";

const SLOTS: Slot[] = ["top", "bottom", "dress", "outerwear", "shoes", "accessory"];
const PATTERNS: Pattern[] = ["solid", "striped", "check", "floral", "graphic", "animal", "other"];
const FITS: Fit[] = ["slim", "regular", "relaxed", "oversized"];
const SEASONS = ["warm", "cool", "all"] as const;
const MATERIALS = ["light", "medium", "heavy"] as const;
const COLOR_NAMES = Object.keys(paletteSwatch);

export default function Capture() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [uri, setUri] = useState<string | null>(null);
  const [attrs, setAttrs] = useState<GarmentAttrs | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // First open can sit on an unresolved permission. Ask proactively and keep
  // the UI honest while the camera hardware warms up.
  useEffect(() => {
    if (permission && permission.status === "undetermined" && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  async function shoot() {
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.75, skipProcessing: true });
      if (!photo?.uri) return;
      setUri(photo.uri);
      setAttrs(await getVisionTagger().tag(photo.uri));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!uri || !attrs) return;
    setBusy(true);
    try {
      const id = `g_${Date.now().toString(36)}`;
      const photoRef = await persistPhoto(uri, id);
      await upsertGarment(newGarment(id, attrs, photoRef));
      setUri(null);
      setAttrs(null);
      router.replace("/(tabs)/wardrobe");
    } finally {
      setBusy(false);
    }
  }

  function patch(p: Partial<GarmentAttrs>) {
    setAttrs((cur) => (cur ? { ...cur, ...p } : cur));
  }

  function toggleColor(c: string) {
    if (!attrs) return;
    const has = attrs.colors.includes(c as never);
    const next = has ? attrs.colors.filter((x) => x !== c) : [...attrs.colors, c].slice(-2);
    patch({ colors: next as GarmentAttrs["colors"] });
  }

  if (Platform.OS === "web") {
    return (
      <Screen>
        <Scroll>
          <Title>Add a piece</Title>
          <Caption>Camera capture runs on iOS/Android. Use a dev build or Expo Go on your phone.</Caption>
        </Scroll>
      </Screen>
    );
  }

  if (!permission) {
    return (
      <Screen>
        <Scroll>
          <Title>Camera</Title>
          <ActivityIndicator color={colors.accent} style={{ marginTop: space.m }} />
          <Caption>Checking permission…</Caption>
        </Scroll>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Scroll>
          <Title>Camera</Title>
          <Caption>StyleMe photographs your clothes to tag them. Photos stay on your phone.</Caption>
          <Btn label="Allow camera" onPress={() => void requestPermission()} />
        </Scroll>
      </Screen>
    );
  }

  if (uri && attrs) {
    return (
      <Screen>
        <Scroll>
          <Title>Check the tags.</Title>
          <Caption>Auto-tags are a first guess. Tap anything wrong — that correction teaches the model.</Caption>
          <Image source={{ uri }} style={s.preview} />

          <Card style={{ gap: space.s }}>
            <Caption>Slot</Caption>
            <View style={s.wrap}>
              {SLOTS.map((v) => (
                <Chip key={v} label={v} selected={attrs.slot === v} onPress={() => patch({ slot: v })} />
              ))}
            </View>
          </Card>

          <Card style={{ gap: space.s }}>
            <Caption>Colors (up to 2)</Caption>
            <View style={s.wrap}>
              {COLOR_NAMES.map((c) => (
                <Swatch
                  key={c}
                  color={paletteSwatch[c]}
                  selected={attrs.colors.includes(c as never)}
                  onPress={() => toggleColor(c)}
                />
              ))}
            </View>
          </Card>

          <Card style={{ gap: space.s }}>
            <Caption>Pattern</Caption>
            <View style={s.wrap}>
              {PATTERNS.map((v) => (
                <Chip key={v} label={v} selected={attrs.pattern === v} onPress={() => patch({ pattern: v })} />
              ))}
            </View>
          </Card>

          <Card style={{ gap: space.s }}>
            <Caption>Fit</Caption>
            <View style={s.wrap}>
              {FITS.map((v) => (
                <Chip key={v} label={v} selected={attrs.fit === v} onPress={() => patch({ fit: v })} />
              ))}
            </View>
          </Card>

          <Card style={{ gap: space.s }}>
            <Caption>Formality</Caption>
            <View style={s.wrap}>
              {[1, 2, 3, 4, 5].map((v) => (
                <Chip
                  key={v}
                  label={`${v}`}
                  selected={attrs.formality === v}
                  onPress={() => patch({ formality: v as GarmentAttrs["formality"] })}
                />
              ))}
            </View>
          </Card>

          <Card style={{ gap: space.s }}>
            <Caption>Season / material</Caption>
            <View style={s.wrap}>
              {SEASONS.map((v) => (
                <Chip key={v} label={v} selected={attrs.season === v} onPress={() => patch({ season: v })} />
              ))}
              {MATERIALS.map((v) => (
                <Chip
                  key={v}
                  label={v}
                  selected={attrs.material === v}
                  onPress={() => patch({ material: v })}
                />
              ))}
            </View>
          </Card>

          <Btn label="Add to wardrobe" onPress={() => void save()} loading={busy} />
          <Btn label="Retake" variant="ghost" onPress={() => { setUri(null); setAttrs(null); }} />
        </Scroll>
      </Screen>
    );
  }

  return (
    <Screen style={{ padding: 0 }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />
      {!cameraReady && (
        <View style={s.cameraLoading}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Caption>Starting camera…</Caption>
        </View>
      )}
      <View style={s.camBar}>
        <Caption>Fill the frame with one piece.</Caption>
        <Btn
          label={busy ? "Tagging…" : "Capture"}
          onPress={() => void shoot()}
          loading={busy}
          disabled={!cameraReady}
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  preview: { width: "100%", aspectRatio: 0.8, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.s, alignItems: "center" },
  cameraLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: space.s,
    backgroundColor: colors.bg,
  },
  camBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.m,
    paddingBottom: space.xl,
    gap: space.s,
    backgroundColor: "rgba(250,249,247,0.92)",
  },
});
