import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "../../../constants/theme";
import { StatusBadge } from "./StatusBadge";
import { Emergency } from "../../../types";

interface EmergencySummaryCardProps {
  emergency: Emergency;
  categoryLabel: string;
}

export function EmergencySummaryCard({ emergency, categoryLabel }: EmergencySummaryCardProps) {
  const timeFormatted = new Date(emergency.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  const dateFormatted = new Date(emergency.created_at).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.ticketBadge}>
          <Text style={styles.ticketLabel}>TICKET</Text>
        </View>
        <Text style={styles.ticketNum}>{emergency.ticket_number}</Text>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{categoryLabel}</Text>
        <StatusBadge status={emergency.status} />
      </View>

      <View style={styles.divider} />

      <View style={styles.grid}>
        <InfoItem icon="location-outline" label="Location" value={`${emergency.hostel_name || "—"}, Room ${emergency.room_number || "—"}`} />
        <InfoItem icon="alert-circle-outline" label="Priority" value="CRITICAL" color="#DC2626" />
        <InfoItem icon="time-outline" label="Created" value={`${timeFormatted} • ${dateFormatted}`} />
      </View>
    </View>
  );
}

function InfoItem({ icon, label, value, color }: { icon: any; label: string; value: string, color?: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={16} color={color || Theme.colors.textLight} />
      </View>
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, color && { color }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.roundness.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ticketBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  ticketLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  ticketNum: {
    fontSize: 14,
    fontWeight: "800",
    color: Theme.colors.textLight,
  },
  titleRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: Theme.colors.text,
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    width: 28,
    alignItems: "center",
  },
  infoTextContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 13,
    color: Theme.colors.textLight,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: Theme.colors.text,
  },
});
