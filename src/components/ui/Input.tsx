import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "../../constants/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  iconName,
  isPassword = false,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View
        style={[
          styles.inputContainer,
          props.multiline && styles.multilineContainer,
          isFocused && styles.focused,
          !!error && styles.errorBorder,
        ]}
      >
        {iconName && (
          <Ionicons
            name={iconName}
            size={22}
            color={
              error
                ? Theme.colors.high
                : isFocused
                ? Theme.colors.secondary
                : Theme.colors.textLight
            }
            style={styles.icon}
          />
        )}
        
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#A0AEC0"
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {isPassword && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.rightIcon}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off" : "eye"}
              size={22}
              color={Theme.colors.textLight}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: Theme.spacing.md,
  },
  label: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: "600",
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    minHeight: 52,
    backgroundColor: "#F0F4FC",
    borderRadius: Theme.roundness.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  multilineContainer: {
    alignItems: "flex-start",
    paddingTop: Theme.spacing.md,
  },
  focused: {
    borderColor: Theme.colors.secondary,
    backgroundColor: "#FFFFFF",
  },
  errorBorder: {
    borderColor: Theme.colors.high,
    backgroundColor: "#FFF5F5",
  },
  icon: {
    marginRight: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: Theme.typography.body.fontSize,
    color: Theme.colors.text,
    outlineStyle: "none" as any,
  },
  rightIcon: {
    padding: Theme.spacing.xs,
  },
  errorText: {
    color: Theme.colors.high,
    fontSize: Theme.typography.caption.fontSize,
    marginTop: Theme.spacing.xs,
    fontWeight: "500",
  },
});
