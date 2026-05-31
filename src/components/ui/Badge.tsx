import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Theme } from "../../constants/theme";

interface BadgeProps {
  label: string;
  type: "status" | "severity";
  value: string;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, type, value, style }) => {
  const normValue = value.toLowerCase().replace(" ", "_");

  // Soft pastel styles
  const getBadgeColors = () => {
    switch (normValue) {
      // Status
      case "pending":
        return { bg: "#FFF0E6", text: Theme.colors.pending };
      case "in_progress":
        return { bg: "#E3F2FD", text: Theme.colors.in_progress };
      case "resolved":
        return { bg: "#E8F5E9", text: Theme.colors.resolved };
      
      // Severity
      case "low":
        return { bg: "#E8F5E9", text: Theme.colors.low };
      case "medium":
        return { bg: "#FFF3E0", text: Theme.colors.medium };
      case "high":
        return { bg: "#FFEBEE", text: Theme.colors.high };
      
      default:
        return { bg: "#F0F4FC", text: Theme.colors.text };
    }
  };

  const colors = getBadgeColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Theme.roundness.full,
    alignSelf: "flex-start",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: Theme.typography.caption.fontSize - 1,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
