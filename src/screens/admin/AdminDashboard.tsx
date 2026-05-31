import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Analytics } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";
import ProfileScreen from "../ProfileScreen";
import ComplaintManagementScreen from "./ComplaintManagement";
import UserManagementScreen from "./UserManagement";
import RoomManagementScreen from "./RoomManagement";
import NoticeManagementScreen from "./NoticeManagement";

export default function AdminDashboardScreen() {
  const [activeView, setActiveView] = useState<"dashboard" | "complaints" | "users" | "rooms" | "notices" | "profile">("dashboard");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const router = useRouter();
  const { user } = useAuth();

  const fetchAnalytics = async (isRefreshing = false) => {
    if (!isRefreshing) setIsLoading(true);
    try {
      const hostelQuery = user?.role === "hostel_admin" && user?.hostel_id ? `?hostel_id=${user.hostel_id}` : "";
      const data = await apiService.get<Analytics>(`/admin/analytics${hostelQuery}`);
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load admin analytics:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(true);
  };

  if (activeView === "profile") {
    return <ProfileScreen onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "complaints") {
    return (
      <ComplaintManagementScreen
        onBack={() => {
          setActiveView("dashboard");
          fetchAnalytics();
        }}
      />
    );
  }

  if (activeView === "users") {
    return (
      <UserManagementScreen
        onBack={() => {
          setActiveView("dashboard");
          fetchAnalytics();
        }}
      />
    );
  }

  if (activeView === "rooms") {
    return (
      <RoomManagementScreen
        onBack={() => {
          setActiveView("dashboard");
          fetchAnalytics();
        }}
      />
    );
  }

  if (activeView === "notices") {
    return (
      <NoticeManagementScreen
        onBack={() => {
          setActiveView("dashboard");
          fetchAnalytics();
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Compiling dashboard data...</Text>
      </View>
    );
  }

  const metrics = analytics?.status_metrics || { pending: 0, in_progress: 0, resolved: 0, total: 0 };
  const categories = analytics?.category_metrics || {};
  const workloads = analytics?.worker_workload || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header
        title="Admin Operations"
        rightComponent={
          <TouchableOpacity
            onPress={() => setActiveView("profile")}
            style={styles.profileBtn}
          >
            <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Theme.colors.primary]}
          />
        }
      >
        <ResponsiveContainer>
        <Text style={styles.welcomeSubtitle}>Performance Overview</Text>
        <Text style={styles.welcomeTitle}>FixNest Command Center</Text>

        {/* Action Board Navigation */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: Theme.colors.primary }]}
            onPress={() => setActiveView("complaints")}
          >
            <Ionicons name="clipboard-outline" size={24} color="#FFFFFF" />
            <Text style={styles.actionCardTitle}>Dispatch Board</Text>
            <Text style={styles.actionCardDesc}>Review & assign tickets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: Theme.colors.secondary }]}
            onPress={() => setActiveView("users")}
          >
            <Ionicons name="people-outline" size={24} color="#FFFFFF" />
            <Text style={styles.actionCardTitle}>User Registry</Text>
            <Text style={styles.actionCardDesc}>Create students & staff</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionGrid, { marginTop: 8 }]}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#009688" }]}
            onPress={() => setActiveView("notices")}
          >
            <Ionicons name="megaphone-outline" size={24} color="#FFFFFF" />
            <Text style={styles.actionCardTitle}>Notice Board</Text>
            <Text style={styles.actionCardDesc}>Publish alerts & warnings</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 4 }} />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: Theme.colors.text }]}>{metrics.total}</Text>
            <Text style={styles.statLabel}>Tickets Filed</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: Theme.colors.pending }]}>{metrics.pending}</Text>
            <Text style={styles.statLabel}>Awaiting review</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: Theme.colors.in_progress }]}>{metrics.in_progress}</Text>
            <Text style={styles.statLabel}>Active Repairs</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: Theme.colors.resolved }]}>{metrics.resolved}</Text>
            <Text style={styles.statLabel}>Solved Issues</Text>
          </Card>
        </View>



        {/* Category breakdown */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Tickets By Category</Text>
          {Object.keys(categories).length === 0 ? (
            <Text style={styles.emptyText}>No category distribution records.</Text>
          ) : (
            Object.entries(categories).map(([cat, val]) => (
              <View key={cat} style={styles.catRow}>
                <Text style={styles.catLabel}>{cat}</Text>
                <View style={styles.catValBox}>
                  <Text style={styles.catValText}>{val}</Text>
                </View>
              </View>
            ))
          )}
        </Card>
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  profileBtn: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Theme.colors.background,
  },
  loadingText: {
    color: Theme.colors.textLight,
    marginTop: 10,
    fontWeight: "500",
  },
  scrollContainer: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: Theme.colors.textLight,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: Theme.typography.h2.fontSize,
    fontWeight: "800",
    color: Theme.colors.text,
    marginTop: 2,
    marginBottom: Theme.spacing.lg,
  },
  actionGrid: {
    flexDirection: "row",
    marginBottom: Theme.spacing.lg,
  },
  actionCard: {
    flex: 1,
    borderRadius: Theme.roundness.lg,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: "#0A2A66",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  actionCardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  actionCardDesc: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
    marginHorizontal: -4,
  },
  statCard: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 10,
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: Theme.typography.caption.fontSize,
    color: Theme.colors.textLight,
    fontWeight: "600",
    marginTop: Theme.spacing.xs,
    textTransform: "uppercase",
  },
  card: {
    marginBottom: Theme.spacing.md,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: 16,
  },
  chartRow: {
    marginBottom: 14,
  },
  chartMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  chartName: {
    fontSize: 14,
    fontWeight: "700",
    color: Theme.colors.text,
  },
  chartVal: {
    fontSize: 13,
    color: Theme.colors.textLight,
    fontWeight: "500",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#F0F4FC",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  catLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Theme.colors.text,
  },
  catValBox: {
    backgroundColor: "#F0F4FC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catValText: {
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  emptyText: {
    color: Theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
  },
});
