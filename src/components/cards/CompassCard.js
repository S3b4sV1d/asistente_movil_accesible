import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Typography, Spacing, Radius } from "../../theme/tokens";

export default function CompassCard({
  compassHeading,
  targetBearing,
  compassAligned,
  compassAdvice,
  remainingMeters,
  headingRef,
}) {
  return (
    <View
      style={[
        styles.card,
        compassAligned && styles.cardAligned
      ]}
    >
      <Text
        ref={headingRef}
        style={[styles.tag, compassAligned && styles.tagAligned]}
        accessibilityRole="header"
        accessibilityLabel="Orientación al paradero"
      >
        ORIENTACIÓN AL PARADERO
      </Text>

      <View
        style={styles.body}
        accessible
        accessibilityLabel={`${compassAdvice} Unos ${remainingMeters ?? 0} metros hasta el paradero.`}
      >
        <View style={[styles.dial, compassAligned && styles.dialAligned]}>
          <Text style={styles.needleIcon}>
            {compassAligned ? "🎯" : "🧭"}
          </Text>
          <Text style={styles.headingNumber}>{compassHeading}°</Text>
        </View>

        <Text style={styles.adviceText}>{compassAdvice}</Text>
        <Text style={styles.subtext}>
          Rumbo de caminata: {targetBearing}° ({remainingMeters ?? 0} m restantes)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 3,
    borderColor: Colors.warningBorder,
    alignItems: "center",
    marginBottom: Spacing.lg,
    elevation: 3,
  },
  cardAligned: {
    borderColor: Colors.successBorder,
    backgroundColor: Colors.successBg,
  },
  tag: {
    color: Colors.warningText,
    fontSize: Typography.caption,
    fontWeight: "bold",
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  tagAligned: {
    color: Colors.successText,
  },
  body: {
    alignItems: "center",
  },
  dial: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.warningBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.warningBorder,
    marginVertical: Spacing.md,
  },
  dialAligned: {
    backgroundColor: Colors.surface,
    borderColor: Colors.successBorder,
  },
  needleIcon: {
    fontSize: 44,
  },
  headingNumber: {
    color: Colors.warningText,
    fontSize: Typography.bodyLarge,
    fontWeight: "bold",
    marginTop: 2,
  },
  adviceText: {
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: Spacing.md,
  },
  subtext: {
    color: Colors.textMuted,
    fontSize: Typography.caption,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
