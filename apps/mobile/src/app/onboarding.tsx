import { useMemo, useState } from "react";
import { TextInput, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { radius, space } from "@styleme/design";
import { emptyPreference } from "@styleme/schema";
import { Btn, Caption, Chip, Screen, Scroll, Title } from "@/components/ui";
import { getDeviceId, savePrefs } from "@/lib/local";
import { metaSet } from "@/lib/db";
import { detectAndSaveTone } from "@/lib/tone";
import { useTheme } from "@/lib/theme";

const VIBES = ["minimal", "street", "classic", "bold", "cozy"];
const LAUNDRY = ["rarely (I have options)", "weekly", "constantly"];
/** Wardrobe-size guess — the capture session target (T-030). */
const SIZES = [10, 20, 40, 60];

export default function Onboarding() {
  const router = useRouter();
  const t = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [words, setWords] = useState("");
  const [vibes, setVibes] = useState<string[]>([]);
  const [laundry, setLaundry] = useState(LAUNDRY[1]);
  const [sizeGuess, setSizeGuess] = useState(SIZES[1]);
  const [saving, setSaving] = useState(false);

  const canNext = useMemo(() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return vibes.length > 0;
    return true;
  }, [step, name, vibes]);

  function toggleVibe(v: string) {
    setVibes((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  }

  async function finish() {
    setSaving(true);
    const deviceId = await getDeviceId();
    await metaSet("name", name.trim());
    await metaSet("city", city.trim());
    await metaSet("vibes", JSON.stringify(vibes));
    await metaSet("laundry", laundry);
    await metaSet("wardrobeSizeGuess", String(sizeGuess));
    await metaSet("onboarded", "1");
    // The optional free-text answer is the only honest signal for voice.
    await detectAndSaveTone([words, name]);

    // Seed the formality center from vibe words; everything else learns.
    const center =
      vibes.reduce((sum, v) => {
        const map: Record<string, number> = { minimal: 3, street: 2, classic: 4, bold: 3, cozy: 2 };
        return sum + (map[v] ?? 3);
      }, 0) / Math.max(1, vibes.length);
    const prefs = emptyPreference();
    prefs.formalityCenter = Math.max(1, Math.min(5, center));
    await savePrefs(prefs);

    setSaving(false);
    router.replace("/(tabs)");
    void deviceId;
  }

  return (
    <Screen>
      <Scroll style={{ paddingTop: space.xl }}>
        <View style={s.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                s.dot,
                { backgroundColor: t.line },
                i <= step && { backgroundColor: t.accent },
              ]}
            />
          ))}
        </View>

        {step === 0 && (
          <>
            <Title>Let&apos;s build your wardrobe.</Title>
            <Caption>No account. No cloud photos. This stays on your phone.</Caption>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="What should I call you?"
              placeholderTextColor={t.inkFaint}
              style={[s.input, { backgroundColor: t.surface, borderColor: t.line, color: t.ink }]}
              autoFocus
            />
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City (for weather) — optional"
              placeholderTextColor={t.inkFaint}
              style={[s.input, { backgroundColor: t.surface, borderColor: t.line, color: t.ink }]}
            />
            <TextInput
              value={words}
              onChangeText={setWords}
              placeholder="Describe your style in your own words — optional"
              placeholderTextColor={t.inkFaint}
              style={[s.input, s.words, { backgroundColor: t.surface, borderColor: t.line, color: t.ink }]}
              multiline
            />
          </>
        )}

        {step === 1 && (
          <>
            <Title>Pick your words.</Title>
            <Caption>This only seeds the first week. Your picks retrain it.</Caption>
            <View style={s.wrap}>
              {VIBES.map((v) => (
                <Chip key={v} label={v} selected={vibes.includes(v)} onPress={() => toggleVibe(v)} />
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Title>Laundry reality.</Title>
            <Caption>So I never suggest something that&apos;s in the wash.</Caption>
            <View style={{ gap: space.s }}>
              {LAUNDRY.map((l) => (
                <Chip key={l} label={l} selected={laundry === l} onPress={() => setLaundry(l)} />
              ))}
            </View>
            <View style={{ height: space.l }} />
            <Title>How many pieces are we working with?</Title>
            <Caption>A rough guess — it just sets the pace for photographing them.</Caption>
            <View style={s.wrap}>
              {SIZES.map((n) => (
                <Chip
                  key={n}
                  label={n === 60 ? "60+" : `${n}`}
                  selected={sizeGuess === n}
                  onPress={() => setSizeGuess(n)}
                />
              ))}
            </View>
          </>
        )}

        <View style={{ height: space.l }} />
        {step < 2 ? (
          <Btn label="Continue" onPress={() => setStep((x) => x + 1)} disabled={!canNext} />
        ) : (
          <Btn label="Start" onPress={finish} loading={saving} />
        )}
        {step > 0 && <Btn label="Back" variant="ghost" onPress={() => setStep((x) => x - 1)} />}
      </Scroll>
    </Screen>
  );
}

const s = StyleSheet.create({
  dots: { flexDirection: "row", gap: space.s, marginBottom: space.l },
  dot: { width: 28, height: 4, borderRadius: 2 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: space.m,
    paddingVertical: space.m,
    fontSize: 16,
    marginTop: space.s,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.s },
  words: { minHeight: 76, textAlignVertical: "top" },
});
