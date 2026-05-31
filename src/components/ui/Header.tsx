import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Theme } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  showLogoutButton?: boolean;
  rightComponent?: React.ReactNode;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  showLogoutButton = false,
  rightComponent,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleLogout = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    logout();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[Theme.colors.primary, Theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "ios" ? insets.top : insets.top + 8,
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.leftSection}>
            {showBackButton ? (
              <TouchableOpacity onPress={handleBack} style={styles.actionButton}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.rightSection}>
            {rightComponent}
            {showLogoutButton ? (
              <TouchableOpacity onPress={handleLogout} style={styles.actionButton}>
                <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: Theme.colors.primary,
  },
  header: {
    paddingBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  leftSection: {
    width: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  rightSection: {
    width: 44,
    alignItems: "flex-end",
    justifyContent: "center",
    flexDirection: "row",
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
