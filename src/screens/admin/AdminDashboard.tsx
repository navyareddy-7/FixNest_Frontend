import React, { useState, useEffect, useCallback } from "react";
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
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Analytics, Complaint } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";
import { useBackHandler } from "../../hooks/useBackHandler";
import ProfileScreen from "../ProfileScreen";
import ComplaintManagementScreen from "./ComplaintManagement";
import UserManagementScreen from "./UserManagement";
import RoomManagementScreen from "./RoomManagement";
import NoticeManagementScreen from "./NoticeManagement";
import AdminComplaintListScreen, { ComplaintFilter } from "./AdminComplaintListScreen";
import AdminComplaintDetailScreen from "./AdminComplaintDetailScreen";
import EmergencyMonitorScreen from "./EmergencyMonitorScreen";

// ─── View union type ──────────────────────────────────────────────────────────
type MainView =
  | "dashboard"
  | "complaints"
  | "users"
  | "rooms"
  | "notices"
  | "profile"
  | "emergency"
  | "stat_list"      // stat-card drill-down list
  | "stat_detail";   // individual complaint detail

// ─── Stat card config ─────────────────────────────────────────────────────────
interface StatCard {
  filter: ComplaintFilter;
  title: string;
  accentColor: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  getValue: (m: Analytics["status_metrics"]) => number;
}

const STAT_CARDS: StatCard[] = [
  {
    filter: "all",
    title: "Tickets Filed",
    accentColor: Theme.colors.primary,
    icon: "clipboard-outline",
    getValue: m => m.total,
  },
  {
    filter: "pending",
    title: "Awaiting Review",
    accentColor: Theme.colors.pending,
    icon: "time-outline",
    getValue: m => m.pending,
  },
  {
    filter: "in_progress",
    title: "Active Repairs",
    accentColor: Theme.colors.in_progress,
    icon: "construct-outline",
    getValue: m => m.in_progress,
  },
  {
    filter: "resolved",
    title: "Solved Issues",
    accentColor: Theme.colors.resolved,
    icon: "checkmark-circle-outline",
    getValue: m => m.resolved,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboardScreen() {
  const [activeView, setActiveView] = useState<MainView>("dashboard");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Stat list drill-down state
  const [activeStatCard, setActiveStatCard] = useState<StatCard | null>(null);

  // Complaint detail state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const router = useRouter();
  const { user } = useAuth();

  // ─── Android back button ───────────────────────────────────────────────────
  useBackHandler(
    useCallback(() => {
      if (activeView === "stat_detail") {
        setActiveView("stat_list");
        setSelectedComplaint(null);
        return true;
      }
      if (activeView !== "dashboard") {
        setActiveView("dashboard");
        setActiveStatCard(null);
        setSelectedComplaint(null);
        return true;
      }
      return false; // let OS handle (exit app)
    }, [activeView])
  );

  // ─── Fetch analytics ───────────────────────────────────────────────────────
  const fetchAnalytics = async (isRefreshing = false) => {
    if (!isRefreshing) setIsLoading(true);
    setError(null);
    try {
      const compData = await apiService.get<Complaint[]>("/complaints");
      const filteredComplaints =
        user?.role === "hostel_admin" && user?.hostel_id
          ? compData.filter(
              c =>
                c.hostel_id === user.hostel_id ||
                c.student?.hostel_id === user.hostel_id
            )
          : compData;

      const pending     = filteredComplaints.filter(c => c.status === "pending").length;
      const in_progress = filteredComplaints.filter(c => c.status === "in_progress").length;
      const resolved    = filteredComplaints.filter(c => c.status === "resolved").length;

      const category_metrics: Record<string, number> = {};
      filteredComplaints.forEach(c => {
        category_metrics[c.category] = (category_metrics[c.category] || 0) + 1;
      });

      const data: Analytics = {
        status_metrics: { pending, in_progress, resolved, total: filteredComplaints.length },
        category_metrics,
        worker_workload: [],
        average_resolution_hours: 0,
      };

      setAnalytics(data);
    } catch (err: any) {
      console.error("Failed to load admin analytics:", err);
      setError(err.message || "Could not load dashboard data.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const handleRefresh = () => { setRefreshing(true); fetchAnalytics(true); };

  // ─── Navigation helpers ────────────────────────────────────────────────────
  const goToDashboard = () => {
    setActiveView("dashboard");
    setActiveStatCard(null);
    setSelectedComplaint(null);
    fetchAnalytics();
  };

  const handleStatCardPress = (card: StatCard) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveStatCard(card);
    setActiveView("stat_list");
  };

  const handleSelectComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setActiveView("stat_detail");
  };

  // ─── Sub-screen rendering ─────────────────────────────────────────────────
  if (activeView === "profile") {
    return <ProfileScreen onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "emergency") {
    return (
      <EmergencyMonitorScreen
        onBack={() => { setActiveView("dashboard"); }}
      />
    );
  }

  if (activeView === "complaints") {
    return (
      <ComplaintManagementScreen
        onBack={() => { setActiveView("dashboard"); fetchAnalytics(); }}
      />
    );
  }

  if (activeView === "users") {
    return (
      <UserManagementScreen
        onBack={() => { setActiveView("dashboard"); fetchAnalytics(); }}
      />
    );
  }

  if (activeView === "rooms") {
    return (
      <RoomManagementScreen
        onBack={() => { setActiveView("dashboard"); fetchAnalytics(); }}
      />
    );
  }

  if (activeView === "notices") {
    return (
      <NoticeManagementScreen
        onBack={() => { setActiveView("dashboard"); fetchAnalytics(); }}
      />
    );
  }

  // ── Stat list (drill-down from stat card) ──────────────────────────────────
  if (activeView === "stat_list" && activeStatCard) {
    return (
      <AdminComplaintListScreen
        filter={activeStatCard.filter}
        title={activeStatCard.title}
        accentColor={activeStatCard.accentColor}
        onBack={() => {
          setActiveView("dashboard");
          setActiveStatCard(null);
        }}
        onSelectComplaint={handleSelectComplaint}
      />
    );
  }

  // ── Complaint detail (drill-down from stat list) ───────────────────────────
  if (activeView === "stat_detail" && selectedComplaint) {
    return (
      <AdminComplaintDetailScreen
        complaint={selectedComplaint}
        onBack={() => {
          // Go back to the stat list, not all the way to dashboard
          setActiveView("stat_list");
          setSelectedComplaint(null);
        }}
      />
    );
  }

  // ─── Loading / Error ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Compiling dashboard data...</Text>
      </View>
    );
  }

  if (error && !analytics) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={56} color={Theme.colors.textLight} />
        <Text style={[styles.loadingText, { marginTop: 16, textAlign: "center", paddingHorizontal: 32 }]}>
          {error}
        </Text>
        <TouchableOpacity onPress={() => fetchAnalytics()} style={styles.retryBtn}>
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Dashboard view ───────────────────────────────────────────────────────
  const metrics = analytics?.status_metrics || { pending: 0, in_progress: 0, resolved: 0, total: 0 };
  const categories = analytics?.category_metrics || {};

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

          {/* ── Action Board Navigation ── */}
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: Theme.colors.primary }]}
              onPress={() => setActiveView("complaints")}
              activeOpacity={0.85}
            >
              <Ionicons name="clipboard-outline" size={24} color="#FFFFFF" />
              <Text style={styles.actionCardTitle}>Dispatch Board</Text>
              <Text style={styles.actionCardDesc}>Review &amp; assign tickets</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: Theme.colors.secondary }]}
              onPress={() => setActiveView("users")}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={24} color="#FFFFFF" />
              <Text style={styles.actionCardTitle}>User Registry</Text>
              <Text style={styles.actionCardDesc}>Create students &amp; staff</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.actionGrid, { marginTop: 8 }]}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: "#009688" }]}
              onPress={() => setActiveView("notices")}
              activeOpacity={0.85}
            >
              <Ionicons name="megaphone-outline" size={24} color="#FFFFFF" />
              <Text style={styles.actionCardTitle}>Notice Board</Text>
              <Text style={styles.actionCardDesc}>Publish alerts &amp; warnings</Text>
            </TouchableOpacity>

            {/* Emergency Monitor */}
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: "#DC2626" }]}
              onPress={() => setActiveView("emergency")}
              activeOpacity={0.85}
            >
              <Ionicons name="alert-circle-outline" size={24} color="#FFFFFF" />
              <Text style={styles.actionCardTitle}>Emergency Monitor</Text>
              <Text style={styles.actionCardDesc}>Active SOS &amp; escalations</Text>
            </TouchableOpacity>
          </View>

          {/* ── Clickable Stats Grid ── */}
          <Text style={styles.statsSectionLabel}>Complaint Overview</Text>
          <View style={styles.statsGrid}>
            {STAT_CARDS.map(card => {
              const count = card.getValue(metrics);
              return (
                <TouchableOpacity
                  key={card.filter}
                  style={styles.statCardWrapper}
                  onPress={() => handleStatCardPress(card)}
                  activeOpacity={0.82}
                >
                  <Card style={[styles.statCard, styles.statCardClickable]}>
                    {/* Icon */}
                    <View style={[styles.statIconBox, { backgroundColor: card.accentColor + "18" }]}>
                      <Ionicons name={card.icon} size={20} color={card.accentColor} />
                    </View>

                    {/* Count */}
                    <Text style={[styles.statValue, { color: card.accentColor }]}>
                      {count}
                    </Text>
                    <Text style={styles.statLabel}>{card.title}</Text>

                    {/* Tap hint */}
                    <View style={styles.statTapRow}>
                      <Text style={styles.statTapText}>View details</Text>
                      <Ionicons name="chevron-forward" size={12} color={card.accentColor} />
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Category Breakdown ── */}
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Tickets By Category</Text>
            {Object.keys(categories).length === 0 ? (
              <Text style={styles.emptyText}>No category distribution records.</Text>
            ) : (
              Object.entries(categories).map(([cat, val]) => (
                <View key={cat} style={styles.catRow}>
                  <View style={styles.catLabelRow}>
                    <View style={styles.catDot} />
                    <Text style={styles.catLabel}>{cat}</Text>
                  </View>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  profileBtn: { padding: 4 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Theme.colors.background,
  },
  loadingText: { color: Theme.colors.textLight, marginTop: 10, fontWeight: "500" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Theme.roundness.md,
    marginTop: 20,
  },
  retryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  scrollContainer: { padding: Theme.spacing.lg, paddingBottom: Theme.spacing.xxl },
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

  // Action cards
  actionGrid: { flexDirection: "row", marginBottom: Theme.spacing.lg },
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
  actionCardTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", marginTop: 12 },
  actionCardDesc: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2, fontWeight: "500" },

  // Stats
  statsSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
    marginHorizontal: -4,
  },
  statCardWrapper: { width: "50%", padding: 4 },
  statCard: { padding: 14, alignItems: "flex-start" },
  statCardClickable: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: { fontSize: 26, fontWeight: "800", marginBottom: 2 },
  statLabel: {
    fontSize: 11,
    color: Theme.colors.textLight,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  statTapRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  statTapText: { fontSize: 11, color: Theme.colors.textLight, fontWeight: "500" },

  // Category
  card: { marginBottom: Theme.spacing.md, width: "100%" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Theme.colors.text, marginBottom: 16 },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  catLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.primary + "60",
  },
  catLabel: { fontSize: 14, fontWeight: "600", color: Theme.colors.text },
  catValBox: {
    backgroundColor: "#F0F4FC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catValText: { fontSize: 12, fontWeight: "700", color: Theme.colors.primary },
  emptyText: { color: Theme.colors.textLight, fontStyle: "italic", textAlign: "center" },
});
