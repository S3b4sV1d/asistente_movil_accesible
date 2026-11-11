import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import AccessibleButton from "../ui/AccessibleButton";
import { Colors, Typography, Spacing, Radius, Touch } from "../../theme/tokens";

// Consulta escrita: alternativa a la voz para personas sordas o sin habla, o en lugares ruidosos
export default function TextQueryCard({ appPhase, isLoading, onSubmit, onClose }) {
  const [text, setText] = useState("");
  const confirming = appPhase === "CONFIRM_ORIGIN";
  const label = confirming ? "Escribe «sí» o tu calle de salida" : "Escribe a dónde quieres ir";

  const submit = async () => {
    if (!text.trim() || isLoading) return;
    const ok = await onSubmit(text);
    if (ok) setText("");
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label} nativeID="textQueryLabel">
        {label}
      </Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        placeholder={confirming ? "Ej.: sí / Av. España 123" : "Ej.: Hospital Regional"}
        placeholderTextColor={Colors.textMuted}
        returnKeyType="search"
        autoFocus
        editable={!isLoading}
        accessibilityLabel={label}
        accessibilityLabelledBy="textQueryLabel"
      />
      <View style={styles.row}>
        <AccessibleButton
          label="Buscar"
          accessibilityLabel={confirming ? "Enviar respuesta" : "Buscar ruta"}
          variant="primary"
          size="medium"
          busy={isLoading}
          disabled={!text.trim()}
          onPress={submit}
          style={styles.flex}
        />
        <AccessibleButton
          label="Cerrar"
          accessibilityLabel="Cerrar escritura y volver a usar la voz"
          variant="neutral"
          size="medium"
          onPress={onClose}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "bold",
    marginBottom: Spacing.sm,
  },
  input: {
    minHeight: Touch.primary,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.bodyLarge,
    color: Colors.text,
    backgroundColor: Colors.surfaceMuted,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  flex: {
    flex: 1,
  },
});
