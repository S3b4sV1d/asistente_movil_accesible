import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AccessibleButton from "../ui/AccessibleButton";
import { Colors, Spacing } from "../../theme/tokens";

export default function BottomDock({
  appPhase,
  isRecording,
  isLoading,
  screenReaderOn,
  textInputAvailable,
  showTextInput,
  onToggleTextInput,
  onRepeat,
  onStopSpeaking,
  onCancelRecording,
  onReturnToRoute,
  onPressMic,
  onStartCompass,
  onStartCamera,
  onStopCompassAndCamera,
  onStartOnboard,
  onFinishTrip,
}) {
  const insets = useSafeAreaInsets();

  const micContent = isRecording
    ? {
        icon: "⏹️",
        label: "Escuchando...",
        subLabel: "Habla con calma • Pausa para enviar",
        a11y: "Enviar ahora. Grabando tu voz; también se envía tras 4 segundos de silencio.",
      }
    : appPhase === "CONFIRM_ORIGIN"
    ? {
        icon: "🎙️",
        label: "Responder con voz",
        subLabel: "Di \"Sí\" o dicta tu calle correcta",
        a11y: "Responder por voz: di Sí o dicta tu calle.",
      }
    : {
        icon: "🎙️",
        label: "¿A dónde quieres ir?",
        subLabel: "Toca para dictar tu destino",
        a11y: "Hablar: dicta a dónde quieres ir.",
      };

  // El dock forma parte del flujo (no es absoluto) y respeta el área segura inferior
  return (
    <View style={[styles.dock, { paddingBottom: Spacing.md + insets.bottom }]}>
      {/* FILA DE APOYO: siempre disponible para repetir o callar el último mensaje */}
      {isRecording ? (
        <AccessibleButton
          icon="✖️"
          label="Cancelar grabación"
          accessibilityLabel="Cancelar grabación sin enviarla"
          variant="neutral"
          size="medium"
          onPress={onCancelRecording}
        />
      ) : (
        <View style={styles.row}>
          <AccessibleButton
            icon="🔁"
            label="Repetir"
            accessibilityLabel="Repetir el último mensaje"
            variant="neutral"
            size="medium"
            onPress={onRepeat}
            style={styles.flex}
          />
          {/* Con lector de pantalla no hay voz de la app que callar */}
          {!screenReaderOn && (
            <AccessibleButton
              icon="🔇"
              label="Callar"
              accessibilityLabel="Callar la voz del asistente"
              variant="neutral"
              size="medium"
              onPress={onStopSpeaking}
              style={styles.flex}
            />
          )}
          {textInputAvailable && (
            <AccessibleButton
              icon="⌨️"
              label={showTextInput ? "Ocultar" : "Escribir"}
              accessibilityLabel={showTextInput ? "Ocultar el campo para escribir" : "Escribir el destino en lugar de hablar"}
              variant="neutral"
              size="medium"
              onPress={onToggleTextInput}
              style={styles.flex}
            />
          )}
        </View>
      )}

      {(appPhase === "IDLE" || appPhase === "CONFIRM_ORIGIN") && (
        <AccessibleButton
          icon={micContent.icon}
          label={micContent.label}
          subLabel={micContent.subLabel}
          accessibilityLabel={micContent.a11y}
          variant={isRecording ? "danger" : "primary"}
          size="hero"
          busy={isLoading}
          onPress={onPressMic}
        />
      )}

      {appPhase === "ROUTE_FOUND" && (
        <View style={styles.row}>
          <AccessibleButton
            icon="🧭"
            label="Guía al paradero"
            accessibilityLabel="Activar brújula sonora para caminar hacia el paradero"
            variant="warning"
            onPress={onStartCompass}
            style={styles.flex}
          />
          <AccessibleButton
            icon="📷"
            label="Ver carro"
            accessibilityLabel="Abrir radar de cámara para identificar el vehículo"
            variant="primary"
            onPress={onStartCamera}
            style={styles.flex}
          />
        </View>
      )}

      {appPhase === "COMPASS_WALKING" && (
        <AccessibleButton
          icon="📷"
          label="Llegué al paradero: ver carro"
          accessibilityLabel="Ya llegué al paradero. Abrir cámara para ver el vehículo."
          variant="primary"
          onPress={onStopCompassAndCamera}
        />
      )}

      {appPhase === "CAMERA_DETECTION" && (
        <AccessibleButton
          icon="🚐"
          label="Ya subí: activar alerta de bajada"
          accessibilityLabel="Ya subí al carro. Activar avisos de bajada por GPS."
          variant="success"
          onPress={onStartOnboard}
        />
      )}

      {(appPhase === "COMPASS_WALKING" || appPhase === "CAMERA_DETECTION") && (
        <AccessibleButton
          icon="↩️"
          label="Volver a la ruta"
          accessibilityLabel="Volver a los detalles de la ruta"
          variant="neutral"
          size="medium"
          onPress={onReturnToRoute}
        />
      )}

      {appPhase === "ONBOARD_GPS" && (
        <AccessibleButton
          icon="🏁"
          label="Finalizar viaje"
          accessibilityLabel="Finalizar viaje y volver al inicio."
          variant="dark"
          onPress={onFinishTrip}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
