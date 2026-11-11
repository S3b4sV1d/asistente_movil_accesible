import React from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import AccessibleButton from "../ui/AccessibleButton";
import { Colors, Typography, Spacing, Radius } from "../../theme/tokens";

const EXAMPLES = [
  "Quiero ir al Hospital Regional",
  "Llévame al Mall Plaza desde Víctor Larco",
  "¿Qué combi me lleva al Mercado Mayorista?",
];

export default function VoiceCard({
  speechText,
  isRecording,
  hasMicPermission,
  hasLocationPermission,
  currentRoute,
  appPhase,
  headingRef,
}) {
  const showExamples = appPhase === "IDLE" && !currentRoute;
  const tag = isRecording ? "Grabando tu voz" : "Asistente de voz";
  const hint = isRecording ? "Silencio para enviar" : "Toca el botón de abajo para hablar";
  const examplesLabel = showExamples ? ` Ejemplos que puedes dictar: ${EXAMPLES.join(". ")}.` : "";
  const missingPermissions = [
    !hasMicPermission && "micrófono",
    !hasLocationPermission && "ubicación GPS",
  ].filter(Boolean).join(" y ");

  return (
    <View style={styles.container}>
      {(!hasMicPermission || !hasLocationPermission) && (
        <View style={styles.warningCard}>
          <View
            accessible
            accessibilityLabel={`Permisos pendientes. Falta el permiso de ${missingPermissions}. Actívalo en los ajustes de la aplicación.`}
          >
            <Text style={styles.warningTitle}>⚠️ Permisos pendientes</Text>
            <Text style={styles.warningBody}>
              Falta el permiso de {missingPermissions}. Actívalo en los ajustes de la aplicación.
            </Text>
          </View>
          <AccessibleButton
            label="Abrir ajustes"
            accessibilityLabel="Abrir ajustes de la aplicación para conceder permisos"
            variant="danger"
            size="medium"
            onPress={() => Linking.openSettings()}
            style={styles.warningBtn}
          />
        </View>
      )}

      {/* Sin live region: los mensajes ya se anuncian una sola vez desde App (speakAccessible) */}
      <View
        style={[
          styles.card,
          isRecording ? styles.cardRecording : styles.cardNormal
        ]}
      >
        <View style={styles.tagRow}>
          <Text
            ref={headingRef}
            style={[styles.tagText, isRecording && styles.tagTextRecording]}
            accessibilityRole="header"
            accessibilityLabel={tag}
          >
            {isRecording ? "🔴 GRABANDO TU VOZ" : "ASISTENTE DE VOZ"}
          </Text>
          <Text
            style={isRecording ? styles.hintRecording : styles.hintNormal}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {hint}
          </Text>
        </View>

        <View accessible accessibilityLabel={`${speechText}${examplesLabel}`}>
          <Text style={styles.speechText}>{speechText}</Text>

          {showExamples && (
            <View style={styles.guideBox}>
              <Text style={styles.guideTitle}>💡 Ejemplos que puedes dictar:</Text>
              {EXAMPLES.map((example) => (
                <Text key={example} style={styles.guideExample}>• &quot;{example}&quot;</Text>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  warningCard: {
    backgroundColor: Colors.dangerBg,
    borderWidth: 2,
    borderColor: Colors.dangerBorder,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  warningTitle: {
    color: Colors.dangerText,
    fontSize: Typography.bodyLarge,
    fontWeight: "bold",
    marginBottom: Spacing.xs,
  },
  warningBody: {
    color: Colors.dangerText,
    fontSize: Typography.body,
    lineHeight: 22,
  },
  warningBtn: {
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardNormal: {
    borderColor: Colors.border,
  },
  cardRecording: {
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerBg,
    borderWidth: 3,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tagText: {
    color: Colors.infoText,
    fontSize: Typography.caption,
    fontWeight: "bold",
    letterSpacing: 0.6,
  },
  tagTextRecording: {
    color: Colors.dangerText,
  },
  hintNormal: {
    color: Colors.primary,
    fontSize: Typography.caption,
    fontWeight: "600",
  },
  hintRecording: {
    color: Colors.dangerText,
    fontSize: Typography.caption,
    fontWeight: "bold",
  },
  speechText: {
    color: Colors.text,
    fontSize: Typography.heading,
    lineHeight: 28,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  guideBox: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  guideTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.body,
    fontWeight: "bold",
    marginBottom: Spacing.xs,
  },
  guideExample: {
    color: Colors.textMuted,
    fontSize: Typography.body,
    lineHeight: 24,
    fontStyle: "italic",
  },
});
