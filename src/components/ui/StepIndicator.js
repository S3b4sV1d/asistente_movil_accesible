import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Typography, Spacing, Radius } from "../../theme/tokens";
import { STEPS } from "../../config/phases";

export default function StepIndicator({ appPhase }) {
  const index = Math.max(0, STEPS.findIndex((step) => step.phases.includes(appPhase)));
  const step = STEPS[index];
  const label = `Paso ${index + 1} de ${STEPS.length}: ${step.title}`;

  return (
    <View style={styles.container} accessible accessibilityLabel={label}>
      <Text style={styles.text}>
        Paso {index + 1} de {STEPS.length} · <Text style={styles.title}>{step.title}</Text>
      </Text>
      <View style={styles.track}>
        {STEPS.map((s, i) => (
          <View
            key={s.title}
            style={[styles.segment, i <= index ? styles.segmentDone : styles.segmentTodo]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  text: {
    color: Colors.textMuted,
    fontSize: Typography.caption,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.text,
    fontWeight: "bold",
  },
  track: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: Radius.sm,
  },
  segmentDone: {
    backgroundColor: Colors.primary,
  },
  segmentTodo: {
    backgroundColor: Colors.border,
  },
});
