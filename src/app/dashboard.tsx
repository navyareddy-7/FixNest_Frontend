import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import StudentDashboardScreen from "../screens/student/StudentDashboard";
import WorkerDashboardScreen from "../screens/worker/WorkerDashboard";
import AdminDashboardScreen from "../screens/admin/AdminDashboard";
import SuperAdminDashboardScreen from "../screens/admin/SuperAdminDashboard";
import { Theme } from "../constants/theme";

export default function DashboardRoute() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  // Redirect to login if not authenticated or no user object
  if (!isAuthenticated || !user) {
    return <Redirect href={"/login" as any} />;
  }

  // Role-based view consolidation
  switch (user.role) {
    case "super_admin":
      return <SuperAdminDashboardScreen />;
    case "hostel_admin":
      return <AdminDashboardScreen />;
    case "worker":
      return <WorkerDashboardScreen />;
    case "student":
    default:
      return <StudentDashboardScreen />;
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Theme.colors.background,
  },
});
