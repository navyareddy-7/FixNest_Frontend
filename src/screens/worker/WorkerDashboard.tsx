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
import { Complaint, ComplaintStatus } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";
import { useBackHandler } from "../../hooks/useBackHandler";
import ProfileScreen from "../ProfileScreen";
import WorkerTaskDetailScreen from "./WorkerTaskDetail";

export default function WorkerDashboardScreen() {
  const [activeView, setActiveView] = useState<"dashboard" | "profile" | "detail">("dashboard");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Complaint[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | ComplaintStatus>("all");
  
  const { user } = useAuth();

  // ─── Android hardware back button ─────────────────────────────────────────
  // priority: detail/profile → dashboard. On dashboard → OS handles (exit)
  useBackHandler(
    useCallback(() => {
      if (activeView !== "dashboard") {
        setActiveView("dashboard");
        return true;
      }
      return false;
    }, [activeView])
  );

  const fetchTasks = async (isRefreshing = false) => {
    if (!isRefreshing) setIsLoading(true);
    try {
      const data = await apiService.get<Complaint[]>("/complaints");
      setTasks(data);
      applyFilter(data, activeFilter);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks(true);
  };

  const applyFilter = (list: Complaint[], filter: "all" | ComplaintStatus) => {
    if (filter === "all") {
      setFilteredTasks(list);
    } else {
      setFilteredTasks(list.filter((t) => t.status === filter));
    }
  };

  const handleFilterPress = (filter: "all" | ComplaintStatus) => {
    setActiveFilter(filter);
    applyFilter(tasks, filter);
  };

  const getStats = () => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const active = tasks.filter((t) => t.status === "in_progress").length;
    const resolved = tasks.filter((t) => t.status === "resolved").length;
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

  const renderTaskCard = ({ item }: { item: Complaint }) => {
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
          setSelectedTaskId(item.id);
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
                color={Theme.colors.secondary}
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
            {item.hostel_name}, Room {item.room_number}
          </Text>
          <Badge type="severity" value={item.severity} label={`${item.severity} priority`} />
        </View>
      </Card>
    );
  };

  if (activeView === "profile") {
    return <ProfileScreen onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "detail" && selectedTaskId !== null) {
    return (
      <WorkerTaskDetailScreen
        taskId={selectedTaskId}
        onBack={() => {
          setActiveView("dashboard");
          fetchTasks();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header
        title="Worker Portal"
        rightComponent={
          <TouchableOpacity
            onPress={() => setActiveView("profile")}
            style={styles.profileBtn}
          >
            <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ResponsiveContainer>
      {/* Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <Text style={styles.welcomeSubtitle}>Staff Dashboard</Text>
        <Text style={styles.welcomeTitle}>Hello, {user?.full_name}</Text>
      </View>

      {/* Stats Board */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
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
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Filter Horizontal Scroll */}
      <View style={styles.filterContainer}>
        {renderFilterPill("all", "All Jobs")}
        {renderFilterPill("in_progress", "Active")}
        {renderFilterPill("resolved", "Completed")}
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Theme.colors.secondary} />
          <Text style={styles.loaderText}>Loading tasks...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Theme.colors.secondary]}
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
              <Text style={styles.emptyTitle}>No Tasks Assigned</Text>
              <Text style={styles.emptyDesc}>
                {activeFilter === "all"
                  ? "You have zero maintenance tasks currently assigned."
                  : `You have no tasks in '${String(activeFilter || "").replace("_", " ")}' status.`}
              </Text>
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
  welcomeBanner: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: Theme.colors.textLight,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Theme.colors.text,
    marginTop: 2,
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
    backgroundColor: Theme.colors.secondary,
    borderColor: Theme.colors.secondary,
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
    backgroundColor: "#E3F2FD",
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
});
