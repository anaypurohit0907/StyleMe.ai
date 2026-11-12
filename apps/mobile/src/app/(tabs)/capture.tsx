import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import type { Fit, GarmentAttrs, Pattern, Slot } from "@styleme/schema";
import { colors, paletteSwatch, radius, space } from "@styleme/design";
import { Btn, Caption, Card, Chip, Screen, Scroll, Swatch, Title } from "@/components/ui";
import { ScanLog } from "@/components/scan-log";
import { upsertGarment } from "@/lib/db";
import { newGarment, persistPhoto } from "@/lib/local";
import { segmentGarment } from "@/lib/segment";
import { getVisionTagger } from "@/lib/vision";
import { errorText, log } from "@/lib/pipeline-log";

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
  const [originalUri, setOriginalUri] = useState<string | null>(null);
  const [classifyUri, setClassifyUri] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [attrs, setAttrs] = useState<GarmentAttrs | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [cutoutNote, setCutoutNote] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);

  // First open can sit on an unresolved permission. Ask proactively and keep
  // the UI honest while the camera hardware warms up.
  useEffect(() => {
    if (permission && permission.status === "undetermined" && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  async function shoot() {
    setBusy(true);
    setCutoutNote("");
    setStage("Capturing…");
    const start = Date.now();
    log("capture", "taking picture");
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85, skipProcessing: true });
      if (!photo?.uri) {
        log("capture", "camera returned no photo uri");
        setStage("Capture failed: no photo");
        return;
      }
      log("capture", `picture ready ${photo.width ?? "?"}x${photo.height ?? "?"}`);
      const id = `g_${Date.now().toString(36)}`;
      setDraftId(id);
      setOriginalUri(photo.uri);
      try {
        setStage("Cutting out garment…");
        const seg = await segmentGarment(photo.uri, id);
        setCutoutNote(`Cutout kept ${Math.round(seg.coverage * 100)}% of the frame`);
        setUri(seg.cutoutUri);
        setClassifyUri(seg.classifyUri);
        setStage("Tagging cutout…");
        const tagged = await getVisionTagger().tag(seg.classifyUri);
        log(
          "capture",
          `tags slot=${tagged.slot} subtype=${tagged.subtype ?? "-"} color=${tagged.colors.join(",")}`,
        );
        setAttrs(tagged);
      } catch (err) {
        log("capture", `cutout path failed: ${errorText(err)}`);
        setCutoutNote("Cutout failed — using the full photo. Scan log has details.");
        setStage("Tagging full photo…");
        setUri(photo.uri);
        setClassifyUri(photo.uri);
        setAttrs(await getVisionTagger().tag(photo.uri));
      }
      log("capture", `ready in ${Date.now() - start}ms`);
      setStage("");
    } catch (err) {
      log("capture", `shoot FAILED: ${errorText(err)}`);
      setStage(`Capture failed: ${errorText(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!uri || !attrs || !draftId) return;
    setBusy(true);
    setStage("Saving…");
    log("capture", `save ${draftId} slot=${attrs.slot}`);
    try {
      const originalRef = originalUri ? await persistPhoto(originalUri, draftId) : undefined;
      await upsertGarment(newGarment(draftId, attrs, uri, originalRef));
      log("capture", `saved ${draftId} photo=${uri.split("/").pop() ?? uri}`);
      setUri(null);
      setOriginalUri(null);
      setClassifyUri(null);
      setDraftId(null);
      setAttrs(null);
      setCutoutNote("");
      router.replace("/(tabs)/wardrobe");
    } catch (err) {
      log("capture", `save FAILED: ${errorText(err)}`);
      setStage(`Save failed: ${errorText(err)}`);
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
          {cutoutNote ? <Caption>{cutoutNote}</Caption> : null}

          <Card style={{ gap: space.s }}>
            <Caption>Slot{attrs.subtype ? ` · ${attrs.subtype}` : ""}</Caption>
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
          <ScanLog limit={8} title="Last capture" />
          <Btn
            label="Retake"
            variant="ghost"
            onPress={() => {
              setUri(null);
              setOriginalUri(null);
              setClassifyUri(null);
              setDraftId(null);
              setAttrs(null);
              setCutoutNote("");
              setStage("");
            }}
          />
        </Scroll>
      </Screen>
    );
  }

  return (
    <Screen style={{ padding: 0 }}>
      <CameraView
        key={cameraKey}
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        onCameraReady={() => {
          setCameraError(null);
          setCameraReady(true);
        }}
        onMountError={(event) => {
          setCameraReady(false);
          setCameraError(event.message);
        }}
      />
      <View pointerEvents="none" style={s.guide} />
      {!cameraReady && (
        <View style={s.cameraLoading}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Caption>{cameraError ? `Camera didn't start: ${cameraError}` : "Starting camera…"}</Caption>
          {cameraError && (
            <Btn
              label="Retry camera"
              variant="ghost"
              onPress={() => {
                setCameraError(null);
                setCameraKey((k) => k + 1);
              }}
            />
          )}
        </View>
      )}
      <View style={s.camBar}>
        <Caption>{stage || "Fill the frame with one piece."}</Caption>
        <Btn
          label={busy ? stage || "Working…" : "Capture"}
          onPress={() => void shoot()}
          loading={busy}
          disabled={!cameraReady}
        />
      </View>
      {busy && (
        <View style={s.busyOverlay}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Caption>{stage || "Working…"}</Caption>
          <ScanLog limit={5} title="Pipeline" />
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  preview: { width: "100%", aspectRatio: 0.8, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.s, alignItems: "center" },
  guide: {
    position: "absolute",
    top: "12%",
    left: "8%",
    right: "8%",
    bottom: "26%",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.75)",
    borderRadius: radius.lg,
    borderStyle: "dashed",
  },
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
  busyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.l,
    paddingTop: space.xl * 2,
    gap: space.m,
    backgroundColor: "rgba(250,249,247,0.97)",
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
