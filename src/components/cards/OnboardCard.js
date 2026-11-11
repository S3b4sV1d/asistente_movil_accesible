import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Typography, Spacing, Radius } from "../../theme/tokens";

export default function OnboardCard({
  distanceRemaining,
  gpsAccuracy,
  weakSignal,
  alert300Triggered,
  alert45Triggered,
  headingRef,
}) {
  const hasDistance = distanceRemaining !== null;
  const bannerText = alert45Triggered
    ? "¡Paradero muy cercano! Confirma la parada con el conductor ahora."
    : alert300Triggered
    ? "Paradero a menos de 300 metros. Prepárate para avisar tu bajada."
    : "En ruta fluida. Te avisaremos con sonido y vibración antes de llegar.";
  const distanceLabel = hasDistance
    ? `Faltan unos ${distanceRemaining} metros en línea recta para tu paradero.`
    : "Localizando satélites.";
  const accuracyText = gpsAccuracy !== null ? `Precisión del GPS: ±${gpsAccuracy} m` : null;
  const weakSignalText = "Señal GPS débil: los avisos de bajada se pausan hasta que mejore. Mantente atento a tu paradero.";

  return (
    <View style={styles.card}>
      <Text
        ref={headingRef}
        style={styles.title}
        accessibilityRole="header"
        accessibilityLabel="Seguimiento de viaje a bordo"
      >
        SEGUIMIENTO DE VIAJE A BORDO
      </Text>

      <View
        style={styles.body}
        accessible
        accessibilityLabel={[
          distanceLabel,
          accuracyText ? `${accuracyText}.` : null,
          weakSignal ? weakSignalText : null,
          bannerText,
        ].filter(Boolean).join(" ")}
      >
        <Text style={hasDistance ? styles.distance : styles.distancePending}>
          {hasDistance ? `${distanceRemaining} m` : "Localizando satélites..."}
        </Text>
        <Text style={styles.subtitle}>Distancia en línea recta hasta tu paradero</Text>
        {accuracyText ? (
          <Text style={[styles.accuracy, weakSignal && styles.accuracyWeak]}>{accuracyText}</Text>
        ) : null}

        {weakSignal && (
          <View style={[styles.banner, styles.bannerWarning, styles.weakBanner]}>
            <Text style={[styles.bannerText, styles.bannerWarningText]}>⚠️ {weakSignalText}</Text>
          </View>
        )}

        <View
          style={[
            styles.banner,
            alert45Triggered && styles.bannerDanger,
            alert300Triggered && !alert45Triggered && styles.bannerWarning,
          ]}
        >
          <Text
            style={[
              styles.bannerText,
              alert45Triggered && styles.bannerDangerText,
              alert300Triggered && !alert45Triggered && styles.bannerWarningText,
            ]}
          >
            {bannerText}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.successBorder,
    alignItems: "center",
    marginBottom: Spacing.lg,
    elevation: 3,
  },
  title: {
    color: Colors.successText,
    fontSize: Typography.caption,
    fontWeight: "bold",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  body: {
    alignItems: "center",
    width: "100%",
  },
  distance: {
    color: Colors.text,
    fontSize: Typography.display,
    fontWeight: "bold",
    marginVertical: Spacing.sm,
  },
  distancePending: {
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "bold",
    marginVertical: Spacing.lg,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.body,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  accuracy: {
    color: Colors.textMuted,
    fontSize: Typography.caption,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  accuracyWeak: {
    color: Colors.warningText,
  },
  weakBanner: {
    marginBottom: Spacing.md,
  },
  banner: {
    backgroundColor: Colors.successBg,
    borderWidth: 2,
    borderColor: Colors.successBorder,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    width: "100%",
  },
  bannerWarning: {
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warningBorder,
  },
  bannerDanger: {
    backgroundColor: Colors.dangerBg,
    borderColor: Colors.dangerBorder,
    borderWidth: 3,
  },
  bannerText: {
    color: Colors.successText,
    fontSize: Typography.body,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
  },
  bannerWarningText: {
    color: Colors.warningText,
  },
  bannerDangerText: {
    color: Colors.dangerText,
    fontSize: Typography.bodyLarge,
    fontWeight: "bold",
  },
});
