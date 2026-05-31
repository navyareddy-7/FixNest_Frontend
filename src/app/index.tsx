import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { Theme } from "../constants/theme";

export default function IndexRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/dashboard" as any);
      } else {
        router.replace("/login" as any);
      }
    }
  }, [isLoading, isAuthenticated]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.primary} />
      <ActivityIndicator size="large" color={Theme.colors.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Theme.colors.primary,
  },
});
