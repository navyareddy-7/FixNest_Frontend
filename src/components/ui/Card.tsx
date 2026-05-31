import React from "react";
import { View, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from "react-native";
import { Theme } from "../../constants/theme";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevation?: "none" | "low" | "medium" | "high";
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevation = "low",
  bordered = true,
}) => {
  const cardStyle = [
    styles.card,
    bordered && styles.bordered,
    styles[elevation],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.roundness.lg,
    padding: Theme.spacing.md,
  },
  bordered: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  none: {},
  low: {
    shadowColor: Theme.colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: Theme.colors.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  high: {
    shadowColor: Theme.colors.cardShadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
});
