import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "../../../constants/theme";
import { EmergencyActionButton } from "./EmergencyActionButton";

interface ContactCardProps {
  label: string; // e.g., "Warden", "Technician", "Emergency Hotline"
  name: string | null;
  phone: string | null;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  isHotline?: boolean;
  onCall: () => void;
  onMessage?: () => void;
}

export function ContactCard({
  label,
  name,
  phone,
  color,
  icon,
  isHotline = false,
  onCall,
  onMessage,
}: ContactCardProps) {
  const displayName = name ?? (isHotline ? "Not configured" : "Not assigned");
  const displayPhone = phone ?? "No number on file";
  const canContact = !!phone;

  return (
    <View style={styles.card}>
      <View style={styles.infoContainer}>
        {/* Avatar / Icon */}
        <View style={[styles.avatar, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>

        {/* Details */}
        <View style={styles.details}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={12} color={Theme.colors.textLight} />
            <Text style={[styles.phone, !phone && { color: "#9CA3AF" }]}>
              {displayPhone}
            </Text>
          </View>
        </View>
        
        {/* Availability Badge (Mocked for professional look as requested) */}
        {!isHotline && canContact && (
          <View style={styles.availabilityBadge}>
            <View style={styles.availabilityDot} />
            <Text style={styles.availabilityText}>Available</Text>
          </View>
        )}
        {isHotline && canContact && (
          <View style={styles.availabilityBadge}>
            <View style={[styles.availabilityDot, { backgroundColor: "#DC2626" }]} />
            <Text style={[styles.availabilityText, { color: "#DC2626" }]}>24/7</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <EmergencyActionButton
          icon="call"
          label="Call"
          color={color}
          onPress={onCall}
          disabled={!canContact}
        />
        {onMessage && (
          <EmergencyActionButton
            icon="chatbubble-ellipses"
            label="Message"
            color={color}
            onPress={onMessage}
            disabled={!canContact}
            outlined
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.roundness.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  phone: {
    fontSize: 13,
    color: Theme.colors.textLight,
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
    marginRight: 4,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
});
