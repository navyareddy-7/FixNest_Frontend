import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Theme } from "../../constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "accent" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const handlePress = () => {
    if (loading || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const isPrimary = variant === "primary";
  const isAccent = variant === "accent";

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={variant === "secondary" || variant === "ghost" ? Theme.colors.primary : "#FFFFFF"}
          size="small"
        />
      );
    }
    return (
      <Text
        style={[
          styles.text,
          {
            color:
              variant === "secondary"
                ? Theme.colors.primary
                : variant === "ghost"
                ? Theme.colors.textLight
                : "#FFFFFF",
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    );
  };

  if ((isPrimary || isAccent) && !disabled) {
    const colors = isPrimary
      ? [Theme.colors.primary, Theme.colors.secondary] as const
      : [Theme.colors.accent, "#FF8A3D"] as const;

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[styles.container, style as any]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.container,
        (styles as any)[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: Theme.roundness.md,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: Theme.colors.primary,
  },
  accent: {
    backgroundColor: Theme.colors.accent,
  },
  danger: {
    backgroundColor: Theme.colors.high,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    backgroundColor: Theme.colors.border,
    borderColor: Theme.colors.border,
    opacity: 0.6,
  },
  text: {
    fontSize: Theme.typography.button.fontSize,
    fontWeight: Theme.typography.button.fontWeight,
    letterSpacing: 0.5,
  },
});
