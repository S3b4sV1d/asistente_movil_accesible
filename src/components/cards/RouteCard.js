import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AccessibleButton from "../ui/AccessibleButton";
import { Colors, Typography, Spacing, Radius } from "../../theme/tokens";

export default function RouteCard({ currentRoute, headingRef, onResetRoute }) {
  if (!currentRoute) return null;

  const isTransfer = Boolean(currentRoute.is_transfer && currentRoute.transfer_data);

  if (isTransfer) {
    const transfer = currentRoute.transfer_data;
    const leg1 = transfer.leg1;
    const leg2 = transfer.leg2;
    const hubName = transfer.hub_name;
    const hubWalk = transfer.hub_walk_meters;
    const totMins = transfer.total_trip_minutes;
    const dOrig = leg1.walking_origin?.distance_meters ?? 0;
    const dDest = leg2.walking_destination?.distance_meters ?? 0;

    const accessLabel = `Itinerario con transbordo en dos tramos. Tramo 1: ${leg1.company_name}, ruta ${leg1.route_code}, caminar ${dOrig} metros al paradero. Transbordo en ${hubName}, caminar ${hubWalk} metros. Tramo 2: ${leg2.company_name}, ruta ${leg2.route_code}. Destino a ${dDest} metros de caminata.`;

    return (
      <View style={styles.card}>
        <Text
          ref={headingRef}
          style={styles.headerBadge}
          accessibilityRole="header"
          accessibilityLabel="Itinerario con transbordo"
        >
          ITINERARIO CON TRANSBORDO
        </Text>

        <View accessible accessibilityLabel={accessLabel}>
          {/* Tramo 1 */}
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>1. Primer vehículo</Text>
            <Text style={styles.companyName}>{leg1.company_name}</Text>
            <Text style={styles.routeCode}>{leg1.route_code}</Text>
            <Text style={styles.stepDetail}>
              {dOrig <= 20 ? "🚶 Abordaje directo en la pista (0 m de caminata)" : `🚶 Caminar ${dOrig} m al paradero (o tómalo directo si ya estás en la esquina)`}
            </Text>
          </View>

          {/* Punto de transbordo */}
          <View style={styles.hubContainer}>
            <Text style={styles.hubTitle}>🔄 Transbordo en {hubName}</Text>
            <Text style={styles.hubDetail}>Caminar ~{hubWalk} m en la zona para tomar el segundo vehículo</Text>
          </View>

          {/* Tramo 2 */}
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>2. Segundo vehículo</Text>
            <Text style={styles.companyName}>{leg2.company_name}</Text>
            <Text style={styles.routeCode}>{leg2.route_code}</Text>
            <Text style={styles.stepDetail}>📍 Bajada final a {dDest} m de tu destino</Text>
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🚶 {transfer.total_walk_meters} m caminata total</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🔄 1 transbordo</Text>
            </View>
          </View>
        </View>

        <AccessibleButton
          icon="🔄"
          label="Cambiar destino"
          accessibilityLabel="Cambiar ruta o elegir otro destino"
          variant="neutral"
          size="medium"
          onPress={onResetRoute}
          style={styles.changeRouteBtn}
        />
      </View>
    );
  }

  const walkMeters = currentRoute.walking_origin?.distance_meters ?? 0;
  const destWalkMeters = currentRoute.walking_destination?.distance_meters ?? 0;

  return (
    <View style={styles.card}>
      <Text
        ref={headingRef}
        style={styles.headerBadge}
        accessibilityRole="header"
        accessibilityLabel="Vehículo recomendado"
      >
        VEHÍCULO RECOMENDADO
      </Text>
      <View
        accessible
        accessibilityLabel={`${currentRoute.company_name}, ${currentRoute.route_code}. Caminar ${walkMeters} metros al paradero. Destino a ${destWalkMeters} metros.`}
      >
        <Text style={styles.companyName}>{currentRoute.company_name}</Text>
        <Text style={styles.routeCode}>{currentRoute.route_code}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {walkMeters <= 20 ? "🚶 Abordaje directo (0 m)" : `🚶 Caminar ${walkMeters} m al paradero`}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              📍 Destino a {destWalkMeters} m
            </Text>
          </View>
        </View>
      </View>

      <AccessibleButton
        icon="🔄"
        label="Cambiar destino"
        accessibilityLabel="Cambiar ruta o elegir otro destino"
        variant="neutral"
        size="medium"
        onPress={onResetRoute}
        style={styles.changeRouteBtn}
      />
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
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  headerBadge: {
    color: Colors.infoText,
    fontSize: Typography.caption,
    fontWeight: "bold",
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  companyName: {
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "bold",
  },
  routeCode: {
    color: Colors.primary,
    fontSize: Typography.bodyLarge,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  stepContainer: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
  stepTitle: {
    fontSize: Typography.caption,
    fontWeight: "bold",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  stepDetail: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  hubContainer: {
    backgroundColor: Colors.infoBg,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  hubTitle: {
    fontSize: Typography.body,
    fontWeight: "bold",
    color: Colors.infoText,
  },
  hubDetail: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.infoBg,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
  },
  badgeText: {
    color: Colors.infoText,
    fontSize: Typography.body,
    fontWeight: "600",
  },
  changeRouteBtn: {
    marginTop: Spacing.lg,
  },
});
