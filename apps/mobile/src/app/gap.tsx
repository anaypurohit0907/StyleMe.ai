import { useCallback, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { Garment } from "@styleme/schema";
import { gapAnalysis, type WardrobeGap } from "@styleme/engine";
import { space } from "@styleme/design";
import { Body, Btn, Caption, Card, Empty, Screen, Scroll, Title } from "@/components/ui";
import { listGarments } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { useToneProfile, voice } from "@/lib/tone";

/** Text-only "what to add next". No commerce, no network, no photos. */
export default function GapScreen() {
  const router = useRouter();
  const t = useTheme();
  const tone = useToneProfile();
  const [gaps, setGaps] = useState<WardrobeGap[]>([]);
  const [pieces, setPieces] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void listGarments()
        .then((wardrobe) => {
          setPieces(wardrobe);
          setGaps(gapAnalysis(wardrobe));
        })
        .catch(() => {
          // Leave the empty state honest if the local DB read fails.
        })
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <Screen>
      <Scroll>
        <Caption>{voice("gap_suggestion", tone, "gap")}</Caption>
        <Title>What to add next</Title>
        <Caption>
          Built from {pieces.length} piece{pieces.length === 1 ? "" : "s"}. Text only — no shop links.
        </Caption>

        {loading ? (
          <Card style={{ alignItems: "center" }}>
            <ActivityIndicator color={t.accent} />
          </Card>
        ) : gaps.length === 0 ? (
          <Empty
            title="Nothing obvious."
            body="Your wardrobe is balanced for the basics. Add pieces you actually love, not more of the same."
            action={<Btn label="Back to wardrobe" onPress={() => router.back()} />}
          />
        ) : (
          <>
            {gaps.map((gap, i) => (
              <Card
                key={gap.id}
                style={{
                  gap: space.xs,
                  borderColor: i === 0 ? t.accent : t.line,
                }}>
                <Caption>{i === 0 ? "Top pick" : "Next up"}</Caption>
                <Title>{gap.title}</Title>
                <Body soft>{gap.why}</Body>
              </Card>
            ))}
            <Btn label="Back to wardrobe" variant="ghost" onPress={() => router.back()} />
          </>
        )}
      </Scroll>
    </Screen>
  );
}
