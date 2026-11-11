import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CameraView } from "expo-camera";
import AccessibleButton from "../ui/AccessibleButton";
import { Colors, Typography, Spacing, Radius } from "../../theme/tokens";

// Componente de cámara memoizado: nunca se re-renderiza cuando cambia el texto o el estado de análisis,
// evitando parpadeos de la vista nativa de cámara.
const CameraPreview = React.memo(function CameraPreview({ cameraRef, onCameraReady, onMountError }) {
  return (
    <CameraView
      style={styles.preview}
      facing="back"
      ref={cameraRef}
      onCameraReady={onCameraReady}
      onMountError={onMountError}
    />
  );
});

// Siempre cámara trasera: no se ofrece la frontal porque una persona ciega podría
// activarla sin querer y quedar apuntando a su cara.
function RadarCameraCard({
  cameraRef,
  radarActive,
  cameraAnalysisText,
  onCameraReady,
  onMountError,
  onToggleRadar,
  headingRef,
}) {
  return (
    <View style={styles.container}>
      <Text
        ref={headingRef}
        style={styles.heading}
        accessibilityRole="header"
        accessibilityLabel="Identificar tu vehículo con la cámara"
      >
        IDENTIFICAR TU VEHÍCULO
      </Text>

      {/* La vista de cámara es solo visual; el estado se lee en la tarjeta de abajo */}
      <View
        style={styles.cameraWrapper}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <CameraPreview
          cameraRef={cameraRef}
          onCameraReady={onCameraReady}
          onMountError={onMountError}
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={[styles.targetBox, radarActive ? styles.targetBoxActive : styles.targetBoxPaused]}>
            <Text style={styles.targetBoxText}>
              {radarActive ? "🟢 RADAR AUTOMÁTICO EN VIVO" : "⏸️ RADAR PAUSADO"}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={styles.infoCard}
        accessible
        accessibilityLabel={`${radarActive ? "Radar en vivo" : "Radar pausado"}. ${cameraAnalysisText}`}
      >
        <Text style={styles.statusTitle}>
          {radarActive ? "RADAR EN VIVO (ESCANEANDO LA CALLE)" : "RADAR PAUSADO"}
        </Text>
        <Text style={styles.statusText}>{cameraAnalysisText}</Text>
      </View>

      <AccessibleButton
        icon={radarActive ? "⏸️" : "▶️"}
        label={radarActive ? "Pausar radar" : "Reanudar radar"}
        accessibilityLabel={radarActive ? "Pausar radar automático" : "Reanudar radar automático"}
        variant={radarActive ? "dark" : "success"}
        size="medium"
        onPress={onToggleRadar}
        style={styles.btnRadar}
      />
    </View>
  );
}

export default React.memo(RadarCameraCard);

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  heading: {
    color: Colors.infoText,
    fontSize: Typography.caption,
    fontWeight: "bold",
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  cameraWrapper: {
    height: 280,
    borderRadius: Radius.lg,
    overflow: "hidden",
    position: "relative",
  },
  preview: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  targetBox: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderWidth: 3,
  },
  targetBoxActive: {
    borderColor: Colors.dotGreen,
  },
  targetBoxPaused: {
    borderColor: Colors.dotRed,
  },
  targetBoxText: {
    color: Colors.textOnColor,
    fontSize: Typography.body,
    fontWeight: "bold",
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  statusTitle: {
    color: Colors.infoText,
    fontSize: Typography.caption,
    fontWeight: "bold",
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },
  statusText: {
    color: Colors.text,
    fontSize: Typography.bodyLarge,
    fontWeight: "600",
    lineHeight: 26,
  },
  btnRadar: {
    marginTop: Spacing.md,
  },
});
