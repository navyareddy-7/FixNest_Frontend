import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "../../../constants/theme";

interface EmergencyActionButtonProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  outlined?: boolean;
}

export function EmergencyActionButton({
  icon,
  label,
  onPress,
  color = Theme.colors.primary,
  disabled = false,
  outlined = false,
}: EmergencyActionButtonProps) {
  const baseColor = disabled ? "#9CA3AF" : color;
  const bgColor = outlined ? "transparent" : baseColor;
  const textColor = outlined ? baseColor : "#FFFFFF";
  const borderColor = outlined ? baseColor : "transparent";

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: outlined ? 1.5 : 0,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={18} color={textColor} />
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: Theme.roundness.md,
    minHeight: 44, // Professional touch target size
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
  },
});
