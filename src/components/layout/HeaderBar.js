import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AccessibleButton from "../ui/AccessibleButton";
import { Colors, Typography, Spacing } from "../../theme/tokens";

// Tiempo durante el cual el segundo toque confirma el reinicio
const RESET_CONFIRM_WINDOW_MS = 4000;

const GPS_DOT_COLORS = {
  active: Colors.dotGreen,
  searching: Colors.dotYellow,
  pending: Colors.dotYellow,
  off: Colors.dotRed,
  denied: Colors.dotRed,
};

export default function HeaderBar({
  gpsState,
  gpsStatusText,
  hasLocationPermission,
  requireResetConfirm,
  onResetArmed,
  onResetSession,
}) {
  const insets = useSafeAreaInsets();
  const [resetArmed, setResetArmed] = useState(false);
  const resetTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  const handleResetPress = () => {
    if (!requireResetConfirm || resetArmed) {
      clearTimeout(resetTimerRef.current);
      setResetArmed(false);
      onResetSession();
      return;
    }
    // Primer toque con viaje en curso: armar y pedir confirmación
    setResetArmed(true);
    onResetArmed?.();
    resetTimerRef.current = setTimeout(() => setResetArmed(false), RESET_CONFIRM_WINDOW_MS);
  };

  // El fondo azul cubre también la barra de estado (Android edge-to-edge)
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">
            Transporte Trujillo
          </Text>
          <Text style={styles.subtitle}>Asistente Accesible por Voz</Text>
        </View>
        <AccessibleButton
          label={resetArmed ? "¿Confirmar?" : "Reiniciar"}
          accessibilityLabel={
            resetArmed
              ? "Confirmar reinicio. Se cancelará el viaje actual."
              : "Reiniciar conversación y volver al inicio"
          }
          variant="danger"
          size="medium"
          onPress={handleResetPress}
          style={[styles.resetBtn, resetArmed && styles.resetBtnArmed]}
        />
      </View>

      <View style={styles.statusBarRow}>
        <View
          style={styles.statusInfo}
          accessible
          accessibilityLabel={`Estado del GPS: ${gpsStatusText}`}
        >
          <View style={[styles.indicatorDot, { backgroundColor: GPS_DOT_COLORS[gpsState] || Colors.dotYellow }]} />
          <Text style={styles.gpsLabel}>{gpsStatusText}</Text>
        </View>
        {!hasLocationPermission && (
          <AccessibleButton
            label="Activar GPS"
            accessibilityLabel="Abrir ajustes para activar permiso de ubicación GPS"
            variant="primary"
            size="medium"
            onPress={() => Linking.openSettings()}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.headerBg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  title: {
    color: Colors.textOnColor,
    fontSize: Typography.title,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: Colors.textOnHeaderMuted,
    fontSize: Typography.caption,
    marginTop: 2,
  },
  resetBtn: {
    minWidth: 104,
    paddingVertical: Spacing.sm,
  },
  resetBtnArmed: {
    backgroundColor: Colors.dangerText,
    borderColor: Colors.textOnColor,
  },
  statusBarRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.headerBgDark,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  statusInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  indicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  gpsLabel: {
    color: Colors.textOnHeader,
    fontSize: Typography.caption,
    fontWeight: "500",
    flex: 1,
  },
});
