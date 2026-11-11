import React from "react";
import { Pressable, Text, View, ActivityIndicator, StyleSheet } from "react-native";
import { Colors, Typography, Radius, Spacing, Touch } from "../../theme/tokens";

const VARIANTS = {
  primary: { bg: Colors.primary, text: Colors.textOnColor },
  success: { bg: Colors.success, text: Colors.textOnColor },
  warning: { bg: Colors.warning, text: Colors.textOnColor },
  danger: { bg: Colors.danger, text: Colors.textOnColor },
  dark: { bg: Colors.dark, text: Colors.textOnColor },
  neutral: { bg: Colors.surfaceMuted, text: Colors.textSecondary, border: Colors.border },
};

const SIZES = {
  hero: { minHeight: Touch.hero, fontSize: Typography.heading },
  large: { minHeight: Touch.primary, fontSize: Typography.bodyLarge },
  medium: { minHeight: Touch.min, fontSize: Typography.body },
};

/**
 * Botón accesible base.
 * - `label`: texto visible, sin emojis; también es la etiqueta del lector si no se da `accessibilityLabel`.
 * - `icon`: emoji o símbolo decorativo; el lector de pantalla no lo lee.
 * - `subLabel`: segunda línea opcional.
 * - `busy`: muestra un indicador y `busyLabel`, y bloquea el toque.
 */
export default function AccessibleButton({
  label,
  subLabel,
  icon,
  accessibilityLabel,
  accessibilityHint,
  variant = "primary",
  size = "large",
  onPress,
  disabled = false,
  busy = false,
  busyLabel = "Procesando…",
  style,
}) {
  const colors = VARIANTS[variant] || VARIANTS.primary;
  const sizing = SIZES[size] || SIZES.large;
  const inactive = disabled || busy;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      hitSlop={8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={busy ? busyLabel : accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: sizing.minHeight,
          backgroundColor: colors.bg,
          borderColor: colors.border || "transparent",
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {busy ? (
        <View style={styles.row}>
          <ActivityIndicator color={colors.text} />
          <Text style={[styles.label, { color: colors.text, fontSize: sizing.fontSize }]}>{busyLabel}</Text>
        </View>
      ) : (
        <>
          <View style={styles.row}>
            {icon ? (
              <Text
                style={{ fontSize: sizing.fontSize }}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {icon}
              </Text>
            ) : null}
            <Text style={[styles.label, { color: colors.text, fontSize: sizing.fontSize }]}>{label}</Text>
          </View>
          {subLabel ? (
            <Text style={[styles.subLabel, { color: colors.text }]}>{subLabel}</Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  label: {
    fontWeight: "bold",
    textAlign: "center",
  },
  subLabel: {
    fontSize: Typography.caption,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
});
