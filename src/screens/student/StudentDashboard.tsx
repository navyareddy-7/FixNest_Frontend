import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api";
import { Complaint, ComplaintStatus, Notice } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";
import * as Haptics from "expo-haptics";
import { useBackHandler } from "../../hooks/useBackHandler";
import ProfileScreen from "../ProfileScreen";
import CreateComplaintScreen from "./CreateComplaint";
import ComplaintDetailScreen from "./ComplaintDetail";
import EmergencySOSScreen from "./EmergencySOSScreen";

export default function StudentDashboardScreen() {
  const [activeView, setActiveView] = useState<"dashboard" | "create" | "profile" | "detail" | "notices" | "sos">("dashboard");
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | ComplaintStatus>("all");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isNoticesLoading, setIsNoticesLoading] = useState(false);
  
  const { user } = useAuth();

  // ─── Android hardware back button ─────────────────────────────────────────
  // Priority: detail/create/notices/profile → go back to dashboard
  // On dashboard itself → let the OS handle (exit app)
  useBackHandler(
    useCallback(() => {
      if (activeView !== "dashboard") {
        setActiveView("dashboard");
        return true; // consumed
      }
      return false; // let OS handle (exit app)
    }, [activeView])
  );

  const fetchComplaints = async (isRefreshing = false) => {
    if (!isRefreshing) setIsLoading(true);
    try {
      const data = await apiService.get<Complaint[]>("/complaints");
      setComplaints(data);
      applyFilter(data, activeFilter);
    } catch (err) {
      console.error("Failed to load complaints:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchNotices = async () => {
    setIsNoticesLoading(true);
    try {
      const data = await apiService.get<Notice[]>("/notices");
      setNotices(data);
    } catch (err) {
      console.error("Failed to load notices:", err);
    } finally {
      setIsNoticesLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === "notices") {
      fetchNotices();
    }
  }, [activeView]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchComplaints(true);
  };

  const applyFilter = (list: Complaint[], filter: "all" | ComplaintStatus) => {
    if (filter === "all") {
      setFilteredComplaints(list);
    } else {
      setFilteredComplaints(list.filter((c) => c.status === filter));
    }
  };

  const handleFilterPress = (filter: "all" | ComplaintStatus) => {
    setActiveFilter(filter);
    applyFilter(complaints, filter);
  };

  const getStats = () => {
    const total = complaints.length;
    const pending = complaints.filter((c) => c.status === "pending").length;
    const active = complaints.filter((c) => c.status === "in_progress").length;
    const resolved = complaints.filter((c) => c.status === "resolved").length;
    return { total, pending, active, resolved };
  };

  const stats = getStats();

  const renderFilterPill = (filter: "all" | ComplaintStatus, label: string) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        onPress={() => handleFilterPress(filter)}
        style={[
          styles.filterPill,
          isActive && styles.activeFilterPill,
        ]}
      >
        <Text
          style={[
            styles.filterPillText,
            isActive && styles.activeFilterPillText,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderComplaintCard = ({ item }: { item: Complaint }) => {
    const getIconByCategory = (category: string) => {
      switch (category.toLowerCase()) {
        case "plumbing":
          return "water-outline";
        case "electrical":
          return "flash-outline";
        case "carpentry":
          return "construct-outline";
        case "housekeeping":
          return "trash-outline";
        default:
          return "build-outline";
      }
    };

    return (
      <Card
        onPress={() => {
          setSelectedComplaintId(item.id);
          setActiveView("detail");
        }}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryRow}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={getIconByCategory(item.category)}
                size={20}
                color={Theme.colors.primary}
              />
            </View>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Badge type="status" value={item.status} label={String(item.status || "").replace("_", " ")} />
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.locationText}>
            <Ionicons name="location-outline" size={14} color={Theme.colors.textLight} />{" "}
            Floor {item.room_number ? (String(item.room_number).replace(/\D/g, '').charAt(0) || "1") : "1"}, Room {item.room_number || "Unknown"}
          </Text>
          <Badge type="severity" value={item.severity} label={`${item.severity} priority`} />
        </View>
      </Card>
    );
  };

  // State-driven view rendering
  if (activeView === "sos") {
    return <EmergencySOSScreen onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "profile") {
    return <ProfileScreen onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "create") {
    return (
      <CreateComplaintScreen
        onBack={() => setActiveView("dashboard")}
        onSubmitSuccess={() => {
          setActiveView("dashboard");
          fetchComplaints();
        }}
      />
    );
  }

  if (activeView === "detail" && selectedComplaintId !== null) {
    return (
      <ComplaintDetailScreen
        complaintId={selectedComplaintId}
        onBack={() => {
          setActiveView("dashboard");
          fetchComplaints();
        }}
      />
    );
  }

  if (activeView === "notices") {
    return (
      <View style={styles.container}>
        <Header title="Notice Board" showBackButton onBack={() => setActiveView("dashboard")} />
        <ResponsiveContainer>
        {isNoticesLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={notices}
            contentContainerStyle={{ padding: Theme.spacing.md }}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Card style={{ marginBottom: Theme.spacing.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: "#FFF3E0" }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: Theme.colors.accent }}>
                      {(item.hostel_name || "GLOBAL ALERT").toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: Theme.colors.textLight, fontWeight: "500" }}>
                    {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: "700", color: Theme.colors.text, marginBottom: 6 }}>{item.title}</Text>
                <Text style={{ fontSize: 14, color: Theme.colors.textLight, lineHeight: 20 }}>{item.content}</Text>
              </Card>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
                <Ionicons name="megaphone-outline" size={64} color={Theme.colors.textLight} style={{ opacity: 0.4 }} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: Theme.colors.text, marginTop: 16 }}>No Active Notices</Text>
              </View>
            }
          />
        )}
        </ResponsiveContainer>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header
        title="FixNest"
        rightComponent={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveView("notices");
              }}
              style={{ padding: 4, marginRight: 12 }}
            >
              <Ionicons name="megaphone-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveView("profile");
              }}
              style={styles.profileBtn}
            >
              <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        }
      />

      <ResponsiveContainer>
      {/* Emergency SOS strip — always visible */}
      <TouchableOpacity
        style={styles.sosStrip}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setActiveView("sos");
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="alert-circle" size={22} color="#FFFFFF" />
        <Text style={styles.sosStripText}>🚨 EMERGENCY SOS</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      {/* Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View>
          <Text style={styles.welcomeSubtitle}>Welcome Back,</Text>
          <Text style={styles.welcomeTitle}>{user?.full_name}</Text>
        </View>
        <TouchableOpacity
          style={styles.quickAddBtn}
          onPress={() => setActiveView("create")}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Board */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, styles.statBorder]}>
          <Text style={[styles.statNum, { color: Theme.colors.pending }]}>
            {stats.pending}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statBox, styles.statBorder]}>
          <Text style={[styles.statNum, { color: Theme.colors.in_progress }]}>
            {stats.active}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Theme.colors.resolved }]}>
            {stats.resolved}
          </Text>
          <Text style={styles.statLabel}>Solved</Text>
        </View>
      </View>

      {/* Filter Horizontal Scroll */}
      <View style={styles.filterContainer}>
        {renderFilterPill("all", "All Issues")}
        {renderFilterPill("pending", "Pending")}
        {renderFilterPill("in_progress", "In Progress")}
        {renderFilterPill("resolved", "Resolved")}
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loaderText}>Loading complaints...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredComplaints}
          renderItem={renderComplaintCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="clipboard-outline"
                size={64}
                color={Theme.colors.textLight}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>No Complaints Found</Text>
              <Text style={styles.emptyDesc}>
                {activeFilter === "all"
                  ? "You haven't logged any maintenance requests yet."
                  : `You have no complaints marked as ${String(activeFilter || "").replace("_", " ")}.`}
              </Text>
              {activeFilter === "all" && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setActiveView("create")}
                >
                  <Text style={styles.emptyActionText}>File First Complaint</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
      </ResponsiveContainer>
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
  // ── Emergency SOS strip ──
  sosStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
    borderRadius: Theme.roundness.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  sosStripText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.5,
    flex: 1,
  },
  welcomeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: Theme.colors.textLight,
    fontWeight: "600",
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Theme.colors.text,
    marginTop: 2,
  },
  quickAddBtn: {
    backgroundColor: Theme.colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: Theme.spacing.lg,
    borderRadius: Theme.roundness.lg,
    paddingVertical: Theme.spacing.md,
    shadowColor: "#0A2A66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: Theme.spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: Theme.colors.border,
  },
  statNum: {
    fontSize: 20,
    fontWeight: "800",
    color: Theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Theme.colors.textLight,
    fontWeight: "600",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  filterPill: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.roundness.full,
    backgroundColor: "#FFFFFF",
    marginRight: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  activeFilterPill: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    color: Theme.colors.textLight,
    fontWeight: "600",
  },
  activeFilterPillText: {
    color: "#FFFFFF",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.md,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  card: {
    marginBottom: Theme.spacing.md,
    width: "100%",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.xs,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F0F4FC",
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Theme.colors.text,
    marginVertical: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: Theme.colors.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 10,
  },
  locationText: {
    fontSize: 13,
    color: Theme.colors.textLight,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    opacity: 0.4,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Theme.colors.text,
  },
  emptyDesc: {
    fontSize: 14,
    color: Theme.colors.textLight,
    textAlign: "center",
    paddingHorizontal: 32,
    marginTop: 8,
    lineHeight: 20,
  },
  emptyActionBtn: {
    marginTop: 20,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Theme.roundness.md,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
