import { useCallback, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { Garment } from "@styleme/schema";
import { colors, radius, space } from "@styleme/design";
import { Btn, Caption, Card, Screen, Scroll, Title } from "@/components/ui";
import { deleteGarment, getGarment, setGarmentStatus } from "@/lib/db";

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [g, setG] = useState<Garment | null>(null);

  const load = useCallback(async () => {
    if (id) setG(await getGarment(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function setStatus(status: "available" | "in_wash") {
    if (!id) return;
    await setGarmentStatus([id], status);
    await load();
  }

  async function remove() {
    if (!id) return;
    await deleteGarment(id);
    router.back();
  }

  if (!g) {
    return (
      <Screen>
        <Scroll>
          <Title>Not found.</Title>
          <Btn label="Back" variant="ghost" onPress={() => router.back()} />
        </Scroll>
      </Screen>
    );
  }

  return (
    <Screen>
      <Scroll>
        <Title>{g.attrs.slot}</Title>
        <Caption>
          {g.attrs.colors.join(" / ")} · {g.attrs.pattern} · {g.attrs.fit} · formality{" "}
          {g.attrs.formality}/5
        </Caption>
        <Image source={{ uri: g.photoRef }} style={s.img} />

        <Card style={{ gap: space.s }}>
          <Caption>Status</Caption>
          <Title>{g.status.replace("_", " ")}</Title>
          {g.lastWornAt && <Caption>Last worn {new Date(g.lastWornAt).toLocaleDateString()}</Caption>}
        </Card>

        {g.status === "in_wash" ? (
          <Btn label="I washed it — back in rotation" onPress={() => void setStatus("available")} />
        ) : (
          <Btn label="Send to laundry" variant="ghost" onPress={() => void setStatus("in_wash")} />
        )}
        <Btn label="Delete piece" variant="danger" onPress={() => void remove()} />
        <Btn label="Back" variant="ghost" onPress={() => router.back()} />
      </Scroll>
    </Screen>
  );
}

const s = StyleSheet.create({
  img: { width: "100%", aspectRatio: 0.8, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
});
