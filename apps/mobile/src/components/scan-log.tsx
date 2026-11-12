import { Platform, StyleSheet, Text } from "react-native";
import { Caption, Card } from "@/components/ui";
import { colors, space } from "@styleme/design";
import { usePipelineLogs } from "@/lib/pipeline-log";

/** On-screen tail of the vision pipeline log. Release builds cannot rely on logcat. */
export function ScanLog({ limit = 10, title = "Scan log" }: { limit?: number; title?: string }) {
  const logs = usePipelineLogs();
  const tail = logs.slice(-limit);
  return (
    <Card style={{ gap: 2 }}>
      <Caption>{title}</Caption>
      {tail.length === 0 ? (
        <Caption>No scan activity yet.</Caption>
      ) : (
        tail.map((entry) => (
          <Text key={entry.id} style={s.line}>
            {entry.text}
          </Text>
        ))
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  line: {
    fontFamily: Platform.select({ android: "monospace", ios: "Menlo", default: "monospace" }),
    fontSize: 10,
    lineHeight: 14,
    color: colors.inkSoft,
  },
});
