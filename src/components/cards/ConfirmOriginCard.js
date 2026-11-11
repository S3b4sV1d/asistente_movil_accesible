import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AccessibleButton from "../ui/AccessibleButton";
import { Colors, Typography, Spacing, Radius } from "../../theme/tokens";

export default function ConfirmOriginCard({ pendingOrigin, headingRef, onConfirm, onDictateDifferent }) {
  if (!pendingOrigin) return null;

  const districtText = pendingOrigin.district ? `Distrito: ${pendingOrigin.district}` : "Trujillo";
  const referenceText = pendingOrigin.reference ? `, ${pendingOrigin.reference}` : "";

  // Título corto (recibe el foco), luego el bloque informativo y los botones, cada uno enfocable
  return (
    <View style={styles.card}>
      <Text
        ref={headingRef}
        style={styles.badge}
        accessibilityRole="header"
        accessibilityLabel="¿Sales desde esta ubicación?"
      >
        📍 ¿SALES DESDE ESTA UBICACIÓN?
      </Text>
      <View
        accessible
        accessibilityLabel={`${pendingOrigin.canonical_name}. ${districtText}${referenceText}. El GPS detectó este punto aproximado.`}
      >
        <Text style={styles.title}>{pendingOrigin.canonical_name}</Text>
        <Text style={styles.district}>
          {districtText}
          {pendingOrigin.reference ? ` • ${pendingOrigin.reference}` : ""}
        </Text>
        <Text style={styles.help}>
          El GPS detectó este punto aproximado. Confirma si es correcto para indicarte el carro adecuado.
        </Text>
      </View>

      <View style={styles.buttonsColumn}>
        <AccessibleButton
          icon="✅"
          label="Sí, salgo de aquí"
          subLabel="Toca para calcular y escuchar tu carro"
          accessibilityLabel={`Sí, confirmar que salgo desde ${pendingOrigin.canonical_name}`}
          variant="success"
          onPress={onConfirm}
        />
        <AccessibleButton
          icon="✏️"
          label="No, dictar otra calle"
          subLabel="Toca aquí para decir tu dirección real"
          accessibilityLabel="No, dictar otra calle de salida"
          variant="neutral"
          onPress={onDictateDifferent}
        />
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
    borderColor: Colors.primary,
    marginBottom: Spacing.lg,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  badge: {
    color: Colors.infoText,
    fontSize: Typography.caption,
    fontWeight: "bold",
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "bold",
  },
  district: {
    color: Colors.textMuted,
    fontSize: Typography.body,
    marginTop: Spacing.xs,
    fontWeight: "500",
  },
  help: {
    color: Colors.textSecondary,
    fontSize: Typography.body,
    lineHeight: 22,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  buttonsColumn: {
    gap: Spacing.md,
  },
});
